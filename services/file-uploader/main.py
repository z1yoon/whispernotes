import os
import uuid
import json
import logging
from datetime import timedelta, datetime
from urllib.parse import urlparse
import io
import time

from fastapi import FastAPI, HTTPException, Request, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from minio import Minio
from minio.error import S3Error
import redis
import pika
from starlette.responses import JSONResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- FastAPI App Initialization ---
app = FastAPI(
    title="WhisperNotes File Uploader",
    version="1.0.1",
    description="Handles large file uploads using MinIO multipart uploads and notifies processing services via RabbitMQ.",
)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Configuration ---
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin123")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "whisper-files")
MINIO_USE_SECURE = os.getenv("MINIO_USE_SECURE", "false").lower() == "true"

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", "5672"))
RABBITMQ_USER = os.getenv("RABBITMQ_DEFAULT_USER", "user")
RABBITMQ_PASS = os.getenv("RABBITMQ_DEFAULT_PASS", "password")
VIDEO_PROCESSING_QUEUE = "video_processing_queue"

# --- Service Clients ---
try:
    # Adding debug information about MinIO connection
    logger.info("=== MinIO Connection Information ===")
    logger.info(f"Attempting to connect to MinIO at: {MINIO_ENDPOINT}")
    logger.info(f"Using access key: {MINIO_ACCESS_KEY[:3]}...{MINIO_ACCESS_KEY[-3:] if len(MINIO_ACCESS_KEY) > 6 else ''}")
    logger.info(f"Secret key length: {len(MINIO_SECRET_KEY)}")
    logger.info(f"Using secure connection: {MINIO_USE_SECURE}")
    
    minio_client = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=MINIO_USE_SECURE,
    )
    
    # Test MinIO connection
    buckets = list(minio_client.list_buckets())
    logger.info(f"Successfully connected to MinIO. Found {len(buckets)} buckets: {', '.join([b.name for b in buckets])}")
    
    # Verify specifically that we can access the target bucket
    if minio_client.bucket_exists(MINIO_BUCKET):
        logger.info(f"Confirmed bucket '{MINIO_BUCKET}' exists")
        # Try to list objects to verify permissions
        objects = list(minio_client.list_objects(MINIO_BUCKET, prefix="", recursive=False))
        logger.info(f"Successfully listed objects in bucket '{MINIO_BUCKET}'")
    else:
        logger.warning(f"Bucket '{MINIO_BUCKET}' does not exist. Will attempt to create it on startup.")
        
except Exception as e:
    logger.error(f"Failed to connect to MinIO: {e}")
    logger.error(f"Error type: {type(e).__name__}")
    logger.error(f"Stack trace:", exc_info=True)
    minio_client = None

try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD,
        decode_responses=True
    )
    redis_client.ping()
    logger.info("Successfully connected to Redis.")
except Exception as e:
    logger.error(f"Failed to connect to Redis: {e}")
    redis_client = None

# --- Pydantic Models ---
class UploadInitializationRequest(BaseModel):
    filename: str = Field(..., description="The name of the file to be uploaded.")
    file_size: int = Field(..., gt=0, description="The total size of the file in bytes.")
    content_type: str = Field(..., description="The MIME type of the file.")
    
class UploadInitializationResponse(BaseModel):
    session_id: str = Field(..., description="A unique session ID for this upload.")
    upload_id: str = Field(..., description="The upload ID from MinIO.")
    object_name: str = Field(..., description="The name of the object as it will be stored in MinIO.")

class PresignedUrlRequest(BaseModel):
    part_number: int = Field(..., gt=0, description="The sequential number of the chunk.")

class PresignedUrlResponse(BaseModel):
    url: str = Field(..., description="The presigned URL for uploading a file chunk.")

class Part(BaseModel):
    ETag: str
    PartNumber: int

class CompletionRequest(BaseModel):
    parts: list[Part] = Field(..., description="A list of the uploaded parts with their ETags and numbers.")

class MultipartInitResponse(BaseModel):
    session_id: str
    upload_id: str
    object_name: str

# --- RabbitMQ Publisher ---
def publish_to_video_processor(session_id: str, object_name: str, filename: str):
    """Publish a message to RabbitMQ to trigger video processing."""
    if not all([RABBITMQ_HOST, RABBITMQ_USER, RABBITMQ_PASS]):
        logger.error("RabbitMQ credentials are not fully configured. Skipping message publishing.")
        return

    try:
        credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(host=RABBITMQ_HOST, port=RABBITMQ_PORT, credentials=credentials)
        )
        channel = connection.channel()
        channel.queue_declare(queue=VIDEO_PROCESSING_QUEUE, durable=True)

        message_body = json.dumps({
            "session_id": session_id,
            "object_name": object_name,
            "original_filename": filename,
        })

        channel.basic_publish(
            exchange="",
            routing_key=VIDEO_PROCESSING_QUEUE,
            body=message_body,
            properties=pika.BasicProperties(
                delivery_mode=2,  # make message persistent
            ),
        )
        connection.close()
        logger.info(f"Successfully published message for session {session_id} to RabbitMQ.")
    except Exception as e:
        logger.error(f"Failed to publish message for session {session_id} to RabbitMQ: {e}")

# --- API Endpoints ---
@app.on_event("startup")
def startup_event():
    """On startup, check connections and ensure MinIO bucket exists."""
    if not redis_client:
        logger.critical("Redis connection failed. Aborting startup.")
        # In a real app, you might want to exit or have a retry mechanism
        return
    if not minio_client:
        logger.critical("MinIO connection failed. Aborting startup.")
        return
        
    try:
        found = minio_client.bucket_exists(MINIO_BUCKET)
        if not found:
            minio_client.make_bucket(MINIO_BUCKET)
            logger.info(f"Created MinIO bucket: {MINIO_BUCKET}")
        else:
            logger.info(f"MinIO bucket '{MINIO_BUCKET}' already exists.")
    except S3Error as e:
        logger.error(f"Error checking or creating MinIO bucket: {e}")
        # Handle case where MinIO might not be ready
    except Exception as e:
        logger.error(f"An unexpected error occurred during startup bucket check: {e}")


@app.post("/api/v1/uploads/initialize", response_model=UploadInitializationResponse)
async def initialize_upload(request: UploadInitializationRequest):
    """
    Initiates a file upload with MinIO using presigned URLs.
    """
    session_id = str(uuid.uuid4())
    # Sanitize filename and create a unique object name
    safe_filename = "".join(c for c in request.filename if c.isalnum() or c in ('.', '_', '-')).strip()
    object_name = f"{session_id}/{safe_filename}"

    try:
        # For proper multipart uploads, we'll initialize a real multipart upload in MinIO
        upload_id = minio_client.create_multipart_upload(
            MINIO_BUCKET, 
            object_name,
            metadata={"original-filename": request.filename}
        )
        
        logger.info(f"Initialized multipart upload for {object_name} with session ID: {session_id}, upload_id: {upload_id}")

        # Store session data in Redis, expiring after 24 hours
        session_data = {
            "upload_id": upload_id,
            "object_name": object_name,
            "filename": request.filename,
            "file_size": request.file_size,
            "content_type": request.content_type,
            "parts": [],
            "creation_time": time.time()
        }
        redis_client.set(f"upload_session:{session_id}", json.dumps(session_data), ex=86400)
        
        return UploadInitializationResponse(
            session_id=session_id,
            upload_id=upload_id,
            object_name=object_name,
        )
    except Exception as e:
        logger.error(f"Error initializing multipart upload: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to initialize upload: {str(e)}")


@app.post("/api/v1/uploads/{session_id}/presigned-url", response_model=PresignedUrlResponse)
async def get_presigned_upload_url(session_id: str, request: PresignedUrlRequest):
    """
    Generates a presigned URL for uploading a specific part of a multipart upload.
    """
    session_data_raw = redis_client.get(f"upload_session:{session_id}")
    if not session_data_raw:
        raise HTTPException(status_code=404, detail="Upload session not found.")
    
    session_data = json.loads(session_data_raw)
    object_name = session_data.get("object_name")
    upload_id = session_data.get("upload_id")
    
    if not object_name or not upload_id:
        raise HTTPException(status_code=400, detail="Invalid session data.")
    
    try:
        # Generate a presigned URL specifically for this part of the multipart upload
        url = minio_client.presigned_upload_part(
            bucket_name=MINIO_BUCKET,
            object_name=object_name,
            upload_id=upload_id,
            part_number=request.part_number,
            expires=timedelta(hours=1)
        )
        
        # Log the URL details
        logger.info(f"Generated presigned URL for part {request.part_number} of upload {session_id}")
        
        # Replace internal MinIO host with external one if necessary
        external_minio_host = os.getenv("EXTERNAL_MINIO_HOST", "localhost:9000")
        if "minio:9000" in url:
            url = url.replace("minio:9000", external_minio_host)
        
        return PresignedUrlResponse(url=url)
    except Exception as e:
        logger.error(f"Error generating presigned URL for part {request.part_number}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate presigned URL: {str(e)}")


@app.post("/api/v1/uploads/{session_id}/upload-part/{part_number}")
async def upload_part(session_id: str, part_number: int, file: UploadFile = File(...)):
    """
    Upload a single part directly to the server which will then upload it to MinIO.
    This bypasses the need for client-accessible presigned URLs.
    """
    session_data_raw = redis_client.get(f"upload_session:{session_id}")
    if not session_data_raw:
        raise HTTPException(status_code=404, detail="Upload session not found")
        
    session_data = json.loads(session_data_raw)
    object_name = session_data.get("object_name")
    upload_id = session_data.get("upload_id")
    
    if not upload_id or not object_name:
        raise HTTPException(status_code=400, detail="Invalid upload session")
    
    try:
        # Read the file content
        content = await file.read()
        file_size = len(content)
        logger.info(f"Received part {part_number} for session {session_id}, size: {file_size} bytes")
        
        # Upload the part to MinIO
        etag = minio_client.put_object_part(
            bucket_name=MINIO_BUCKET,
            object_name=object_name,
            upload_id=upload_id,
            part_number=part_number,
            data=io.BytesIO(content),
            length=file_size
        )
        
        logger.info(f"Successfully uploaded part {part_number} for session {session_id}, etag: {etag}")
        
        # Update part information in Redis
        parts = session_data.get("parts", [])
        parts.append({"part_number": part_number, "etag": etag})
        session_data["parts"] = parts
        redis_client.set(f"upload_session:{session_id}", json.dumps(session_data), ex=86400)
        
        return {
            "status": "success",
            "part_number": part_number,
            "etag": etag,
            "size": file_size
        }
    except Exception as e:
        logger.error(f"Error uploading part {part_number} for session {session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to upload part: {str(e)}")


@app.post("/api/v1/uploads/{session_id}/complete")
async def complete_upload(session_id: str, request: CompletionRequest):
    """
    Completes a multipart upload by combining all the uploaded parts.
    """
    session_data_raw = redis_client.get(f"upload_session:{session_id}")
    if not session_data_raw:
        raise HTTPException(status_code=404, detail="Upload session not found.")
    
    session_data = json.loads(session_data_raw)
    object_name = session_data.get("object_name")
    upload_id = session_data.get("upload_id")
    
    if not object_name or not upload_id:
         raise HTTPException(status_code=400, detail="Invalid session data.")
         
    try:
        # Complete the multipart upload
        result = minio_client.complete_multipart_upload(
            bucket_name=MINIO_BUCKET,
            object_name=object_name,
            upload_id=upload_id,
            parts=request.parts
        )
        
        logger.info(f"Multipart upload completed for {object_name} with etag: {result.etag}")
        
        # Update session data
        session_data["upload_complete"] = True
        session_data["etag"] = result.etag
        session_data["completion_time"] = time.time()
        redis_client.set(f"upload_session:{session_id}", json.dumps(session_data), ex=86400)
        
        # Trigger video processing
        publish_to_video_processor(
            session_id=session_id,
            object_name=object_name,
            filename=session_data.get("filename", "")
        )
        
        return {
            "status": "success",
            "message": "Upload completed successfully",
            "object_name": object_name,
            "etag": result.etag
        }
    except Exception as e:
        logger.error(f"Error completing multipart upload: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to complete upload: {str(e)}")


@app.post("/api/v1/uploads/{session_id}/direct-upload")
async def direct_upload_file(session_id: str, file: UploadFile = File(...)):
    """
    Directly upload a file instead of using presigned URLs. 
    This bypasses the need for browser-accessible MinIO URLs.
    For smaller files only - not suitable for very large videos.
    """
    logger.info(f"Direct upload request for session {session_id}")
    
    # Verify session exists
    session_data_raw = redis_client.get(f"upload_session:{session_id}")
    if not session_data_raw:
        logger.error(f"Upload session {session_id} not found")
        raise HTTPException(status_code=404, detail="Upload session not found.")
    
    session_data = json.loads(session_data_raw)
    object_name = session_data.get("object_name")
    
    if not object_name:
        logger.error(f"Invalid session data for session {session_id}")
        raise HTTPException(status_code=404, detail="Invalid session data.")
    
    try:
        # Ensure bucket exists
        if not minio_client.bucket_exists(MINIO_BUCKET):
            logger.info(f"Creating bucket {MINIO_BUCKET}")
            minio_client.make_bucket(MINIO_BUCKET)
        
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        logger.info(f"Received file {file.filename}, size: {file_size} bytes")
        
        # Upload file to MinIO
        result = minio_client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=object_name,
            data=io.BytesIO(file_content),
            length=file_size,
            content_type=file.content_type or "application/octet-stream"
        )
        
        logger.info(f"Successfully uploaded {file.filename} as {object_name} to MinIO (etag: {result.etag})")
        
        # Update session data to mark it as complete
        session_data["upload_complete"] = True
        session_data["etag"] = result.etag
        session_data["file_size"] = file_size
        session_data["completion_time"] = time.time()
        redis_client.set(f"upload_session:{session_id}", json.dumps(session_data))
        
        # Trigger video processing
        publish_to_video_processor(
            session_id=session_id,
            object_name=object_name,
            filename=session_data.get("filename", "")
        )
        
        return {
            "status": "success",
            "message": "File uploaded successfully",
            "object_name": object_name,
            "etag": result.etag,
            "file_size": file_size
        }
        
    except Exception as e:
        logger.error(f"Error in direct upload: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {str(e)}"
        )


@app.get("/api/v1/uploads/{session_id}/status")
async def get_upload_status(session_id: str):
    """
    Check the status of an upload session.
    """
    session_data_raw = redis_client.get(f"upload_session:{session_id}")
    if not session_data_raw:
        raise HTTPException(status_code=404, detail="Upload session not found.")
    
    session_data = json.loads(session_data_raw)
    
    # Calculate upload progress based on parts
    total_parts = len(session_data.get("parts", []))
    is_complete = session_data.get("upload_complete", False)
    
    status = "completed" if is_complete else "in_progress" if total_parts > 0 else "initialized"
    
    return {
        "session_id": session_id,
        "status": status,
        "object_name": session_data.get("object_name"),
        "total_parts": total_parts,
        "is_complete": is_complete,
        "etag": session_data.get("etag") if is_complete else None
    }


@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}


@app.get("/api/v1/test-minio-access")
async def test_minio_access():
    """
    Test endpoint to verify MinIO access and configuration.
    """
    if not minio_client:
        return {"status": "error", "message": "MinIO client not initialized"}
        
    try:
        result = {
            "status": "success",
            "minio_endpoint": MINIO_ENDPOINT,
            "bucket": MINIO_BUCKET,
            "external_host": os.getenv("EXTERNAL_MINIO_HOST", "localhost:9000"),
            "secure": MINIO_USE_SECURE,
            "tests": []
        }
        
        # Test 1: List buckets
        try:
            buckets = list(minio_client.list_buckets())
            result["tests"].append({
                "name": "list_buckets",
                "status": "success",
                "message": f"Found {len(buckets)} buckets",
                "buckets": [b.name for b in buckets]
            })
        except Exception as e:
            result["tests"].append({
                "name": "list_buckets",
                "status": "error",
                "message": str(e),
                "error_type": type(e).__name__
            })
            
        # Test 2: Check if our bucket exists
        try:
            bucket_exists = minio_client.bucket_exists(MINIO_BUCKET)
            result["tests"].append({
                "name": "bucket_exists",
                "status": "success" if bucket_exists else "warning",
                "message": f"Bucket '{MINIO_BUCKET}' {'exists' if bucket_exists else 'does not exist'}"
            })
        except Exception as e:
            result["tests"].append({
                "name": "bucket_exists",
                "status": "error",
                "message": str(e),
                "error_type": type(e).__name__
            })
            
        # Test 3: List objects in bucket
        if result["tests"][-1]["status"] == "success":
            try:
                objects = list(minio_client.list_objects(MINIO_BUCKET, prefix="", recursive=False))
                result["tests"].append({
                    "name": "list_objects",
                    "status": "success",
                    "message": f"Listed {len(objects)} objects in bucket"
                })
            except Exception as e:
                result["tests"].append({
                    "name": "list_objects",
                    "status": "error",
                    "message": str(e),
                    "error_type": type(e).__name__
                })
        
        # Test 4: Generate a presigned URL
        try:
            test_object_name = f"test-object-{uuid.uuid4()}"
            url = minio_client.presigned_put_object(
                bucket_name=MINIO_BUCKET,
                object_name=test_object_name,
                expires=timedelta(minutes=5)
            )
            
            result["tests"].append({
                "name": "presigned_url",
                "status": "success",
                "message": "Successfully generated presigned URL",
                "url_length": len(url)
            })
            
            # Parse the URL for analysis
            parsed = urlparse(url)
            result["tests"].append({
                "name": "url_analysis",
                "status": "info",
                "scheme": parsed.scheme,
                "netloc": parsed.netloc,
                "path": parsed.path,
                "has_query": len(parsed.query) > 0
            })
            
        except Exception as e:
            result["tests"].append({
                "name": "presigned_url",
                "status": "error",
                "message": str(e),
                "error_type": type(e).__name__
            })
            
        # Test 5: Test multipart upload creation
        try:
            test_object_name = f"test-multipart-{uuid.uuid4()}"
            upload_id = minio_client.create_multipart_upload(
                bucket_name=MINIO_BUCKET,
                object_name=test_object_name
            )
            
            result["tests"].append({
                "name": "create_multipart",
                "status": "success",
                "message": "Successfully created multipart upload",
                "upload_id": upload_id
            })
            
            # Abort the test upload
            minio_client.abort_multipart_upload(
                bucket_name=MINIO_BUCKET,
                object_name=test_object_name,
                upload_id=upload_id
            )
            
        except Exception as e:
            result["tests"].append({
                "name": "create_multipart",
                "status": "error",
                "message": str(e),
                "error_type": type(e).__name__
            })
            
        return result
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "error_type": type(e).__name__
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)