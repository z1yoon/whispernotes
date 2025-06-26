import os
import uuid
import json
import logging
from datetime import timedelta, datetime
from urllib.parse import urlparse
from typing import Optional
from contextlib import asynccontextmanager
import io
import time
import tempfile
import sys

from fastapi import FastAPI, HTTPException, Request, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from minio import Minio
from minio.error import S3Error
import redis
import pika
import httpx
from starlette.responses import JSONResponse
from tqdm import tqdm

# Configure logging to be less verbose for multipart uploads
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global progress bars storage
active_progress_bars = {}

# --- Configuration ---
# Configuration - Get from environment without defaults
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
MINIO_BUCKET = os.getenv("MINIO_BUCKET")
MINIO_USE_SECURE = os.getenv("MINIO_USE_SECURE", "false").lower() == "true"

REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = int(os.getenv("REDIS_PORT")) if os.getenv("REDIS_PORT") else None
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT")) if os.getenv("RABBITMQ_PORT") else None
RABBITMQ_USER = os.getenv("RABBITMQ_DEFAULT_USER")
RABBITMQ_PASS = os.getenv("RABBITMQ_DEFAULT_PASS")
VIDEO_PROCESSING_QUEUE = "video_processing_queue"

# Validate required environment variables
required_env_vars = {
    "MINIO_ENDPOINT": MINIO_ENDPOINT,
    "MINIO_ACCESS_KEY": MINIO_ACCESS_KEY,
    "MINIO_SECRET_KEY": MINIO_SECRET_KEY,
    "MINIO_BUCKET": MINIO_BUCKET,
    "REDIS_HOST": REDIS_HOST,
    "REDIS_PORT": REDIS_PORT,
    "RABBITMQ_HOST": RABBITMQ_HOST,
    "RABBITMQ_PORT": RABBITMQ_PORT,
    "RABBITMQ_DEFAULT_USER": RABBITMQ_USER,
    "RABBITMQ_DEFAULT_PASS": RABBITMQ_PASS,
}

missing_vars = [var for var, value in required_env_vars.items() if value is None]
if missing_vars:
    raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

# Build Redis URL
REDIS_URL = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/0" if REDIS_PASSWORD else f"redis://{REDIS_HOST}:{REDIS_PORT}/0"

# Global variables for clients
minio_client = None
redis_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    global minio_client, redis_client
    
    # Startup
    logger.info("Starting up file-uploader service...")
    
    # Initialize MinIO client
    try:
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
            logger.warning(f"Bucket '{MINIO_BUCKET}' does not exist. Creating it now...")
            minio_client.make_bucket(MINIO_BUCKET)
            logger.info(f"Created MinIO bucket: {MINIO_BUCKET}")
    except Exception as e:
        logger.error(f"Failed to connect to MinIO: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error("MinIO connection failed - service will start but uploads may not work until MinIO is available")
        minio_client = None

    # Initialize Redis client
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
        logger.error("Redis connection failed - service will start but session management may not work until Redis is available")
        redis_client = None
        
    # Warn about missing services but don't fail startup
    if not redis_client:
        logger.warning("Redis is not available - session management will be disabled")
    if not minio_client:
        logger.warning("MinIO is not available - file uploads will be disabled")
        
    logger.info("File-uploader service startup complete!")
    
    yield
    
    # Shutdown
    logger.info("Shutting down file-uploader service...")
    # Add any cleanup here if needed

# --- FastAPI App Initialization ---
app = FastAPI(
    title="WhisperNotes File Uploader",
    version="1.0.2",
    description="Handles large file uploads using MinIO multipart uploads and notifies processing services via RabbitMQ.",
    lifespan=lifespan
)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class UploadInitializationRequest(BaseModel):
    filename: str = Field(..., description="The name of the file to be uploaded.")
    file_size: int = Field(..., gt=0, description="The total size of the file in bytes.")
    content_type: str = Field(..., description="The MIME type of the file.")
    user_id: Optional[str] = Field(None, description="The ID of the user uploading the file.")
    num_speakers: Optional[int] = Field(2, description="Number of speakers for transcription.")
    
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

class ProgressUpdate(BaseModel):
    progress: float = Field(..., ge=0, le=100, description="Progress percentage between 0 and 100")
    message: str = Field(..., description="Status message about current progress")
    status: str = Field(..., description="Status code (processing, completed, error, etc.)")

# --- RabbitMQ Publisher ---
def publish_to_video_processor(session_id: str, object_name: str, filename: str):
    """Publish a message to RabbitMQ to trigger video processing."""
    if not all([RABBITMQ_HOST, RABBITMQ_USER, RABBITMQ_PASS]):
        logger.error("RabbitMQ credentials are not fully configured. Skipping message publishing.")
        return

    try:
        # Get session data to include speaker count
        session_data_raw = redis_client.get(f"upload_session:{session_id}")
        num_speakers = 2  # default
        if session_data_raw:
            session_data = json.loads(session_data_raw)
            num_speakers = session_data.get("num_speakers", 2)

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
            "num_speakers": num_speakers,  # Include speaker count
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
        logger.info(f"Successfully published message for session {session_id} to RabbitMQ with {num_speakers} speakers.")
    except Exception as e:
        logger.error(f"Failed to publish message for session {session_id} to RabbitMQ: {e}")

# --- Helper Functions ---
def get_or_create_progress_bar(session_id: str, total_parts: int, filename: str) -> tqdm:
    """Get existing progress bar or create a new one for multipart upload"""
    if session_id not in active_progress_bars:
        # Create a new progress bar with cleaner format
        active_progress_bars[session_id] = tqdm(
            total=total_parts,
            desc=f"📤 {filename[:25]}{'...' if len(filename) > 25 else ''}",
            unit="part",
            position=len(active_progress_bars),
            leave=True,
            ncols=80,
            bar_format='{desc}: {percentage:3.0f}%|{bar}| {n_fmt}/{total_fmt} [{rate_fmt}]'
        )
    return active_progress_bars[session_id]

def cleanup_progress_bar(session_id: str):
    """Clean up progress bar when upload is complete"""
    if session_id in active_progress_bars:
        pbar = active_progress_bars[session_id]
        pbar.close()
        del active_progress_bars[session_id]

# --- API Endpoints ---
@app.post("/api/v1/uploads/initialize", response_model=UploadInitializationResponse)
async def initialize_upload(request: UploadInitializationRequest):
    """
    Initiates a file upload with MinIO using presigned URLs.
    """
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis service unavailable")
    if not minio_client:
        raise HTTPException(status_code=503, detail="MinIO service unavailable")
        
    session_id = str(uuid.uuid4())
    # Sanitize filename and create a unique object name
    safe_filename = "".join(c for c in request.filename if c.isalnum() or c in ('.', '_', '-')).strip()
    object_name = f"{session_id}/{safe_filename}"

    try:
        # Generate a unique upload_id for the multipart upload
        # MinIO Python SDK doesn't have create_multipart_upload, we just need to generate an ID
        upload_id = str(uuid.uuid4())
        
        logger.info(f"Initialized multipart upload for {object_name} with session ID: {session_id}, upload_id: {upload_id}")

        # Store session data in Redis, expiring after 24 hours
        session_data = {
            "upload_id": upload_id,
            "object_name": object_name,
            "filename": request.filename,
            "file_size": request.file_size,
            "content_type": request.content_type,
            "user_id": request.user_id,  # Store the user_id
            "num_speakers": request.num_speakers or 2,  # Store speaker count
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
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis service unavailable")
    if not minio_client:
        raise HTTPException(status_code=503, detail="MinIO service unavailable")
        
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
        # Using get_presigned_url with query parameters for multipart upload parts
        extra_query_params = {
            'uploadId': upload_id,
            'partNumber': str(request.part_number)
        }
        url = minio_client.get_presigned_url(
            "PUT",
            bucket_name=MINIO_BUCKET,
            object_name=object_name,
            expires=timedelta(hours=1),
            extra_query_params=extra_query_params
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
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis service unavailable")
    if not minio_client:
        raise HTTPException(status_code=503, detail="MinIO service unavailable")
        
    session_data_raw = redis_client.get(f"upload_session:{session_id}")
    if not session_data_raw:
        raise HTTPException(status_code=404, detail="Upload session not found")
        
    session_data = json.loads(session_data_raw)
    object_name = session_data.get("object_name")
    upload_id = session_data.get("upload_id")
    filename = session_data.get("filename", "unknown.file")
    
    if not upload_id or not object_name:
        raise HTTPException(status_code=400, detail="Invalid upload session")
    
    try:
        # Read the file content
        content = await file.read()
        file_size = len(content)
        part_size_mb = file_size / (1024 * 1024)
        
        # Generate part key for storage
        part_key = f"{object_name}.part{part_number}"
        
        # Ensure bucket exists
        if not minio_client.bucket_exists(MINIO_BUCKET):
            minio_client.make_bucket(MINIO_BUCKET)
        
        # Upload part to MinIO
        result = minio_client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=part_key,
            data=io.BytesIO(content),
            length=file_size,
            content_type="application/octet-stream"
        )
        
        # Update part information in Redis
        parts = session_data.get("parts", [])
        parts.append({"part_number": part_number, "etag": result.etag})
        session_data["parts"] = parts
        redis_client.set(f"upload_session:{session_id}", json.dumps(session_data), ex=86400)
        
        # Calculate total uploaded parts for progress  
        total_parts = session_data.get("total_parts")
        if not total_parts:
            # Estimate total parts from file size (5MB per part)
            file_size = session_data.get("file_size", 0)
            total_parts = max(1, (file_size + 5*1024*1024 - 1) // (5*1024*1024))
            session_data["total_parts"] = total_parts
        
        # Update and display progress bar instead of verbose logging
        try:
            pbar = get_or_create_progress_bar(session_id, total_parts, filename)
            pbar.update(1)
            pbar.set_postfix_str(f"{part_size_mb:.1f}MB")
            
            # If all parts are uploaded, mark as complete and cleanup
            if len(parts) >= total_parts:
                pbar.set_description(f"✅ {filename[:30]}{'...' if len(filename) > 30 else ''}")
                pbar.set_postfix_str("Complete")
                # Clean up after a short delay to let user see completion
                import threading
                threading.Timer(3.0, lambda: cleanup_progress_bar(session_id)).start()
        except Exception as e:
            # Silent fallback - no logging to avoid clutter
            pass
        
        # Send progress update to other services (silent)
        try:
            progress_percentage = (len(parts) / total_parts) * 45 + 5  # 5-50% for upload
            progress_message = f"Uploading... {len(parts)}/{total_parts} parts"
            
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{os.getenv('FILE_UPLOADER_URL', 'http://file-uploader:8002')}/upload/progress/{session_id}",
                    json={
                        "progress": progress_percentage,
                        "message": progress_message,
                        "status": "uploading"
                    }
                )
        except Exception as e:
            # Silent - don't log progress update failures
            pass
        
        return {
            "status": "success",
            "part_number": part_number,
            "etag": result.etag,
            "size": file_size
        }
    except Exception as e:
        logger.error(f"❌ Error uploading part {part_number} for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload part: {str(e)}")


@app.post("/api/v1/uploads/{session_id}/complete")
async def complete_upload(session_id: str, request: CompletionRequest):
    """
    Completes a multipart upload by combining all the uploaded parts.
    """
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis service unavailable")
    if not minio_client:
        raise HTTPException(status_code=503, detail="MinIO service unavailable")
        
    session_data_raw = redis_client.get(f"upload_session:{session_id}")
    if not session_data_raw:
        raise HTTPException(status_code=404, detail="Upload session not found.")
    
    session_data = json.loads(session_data_raw)
    object_name = session_data.get("object_name")
    upload_id = session_data.get("upload_id")
    filename = session_data.get("filename", "")
    content_type = session_data.get("content_type", "application/octet-stream")
    
    if not object_name or not upload_id:
         raise HTTPException(status_code=400, detail="Invalid session data.")
         
    try:
        # Get the parts data from Redis
        all_parts = session_data.get("parts", [])
        if not all_parts:
            raise HTTPException(status_code=400, detail="No parts found for this upload")
            
        # Sort parts by part number to ensure correct order
        all_parts.sort(key=lambda p: p["part_number"])
        
        # Check if parts are consecutively numbered
        expected_parts = list(range(1, len(all_parts) + 1))
        received_parts = [p["part_number"] for p in all_parts]
        if expected_parts != received_parts:
            logger.warning(f"Parts may not be consecutive: expected {expected_parts}, got {received_parts}")
            
        # Create a temporary file to combine all parts
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_path = temp_file.name
            
        try:
            # Download all parts and combine them
            for part in all_parts:
                part_key = f"{object_name}.part{part['part_number']}"
                try:
                    # Try to download each part from MinIO
                    data = minio_client.get_object(MINIO_BUCKET, part_key)
                    with open(temp_path, 'ab') as f:
                        for d in data.stream(32*1024):
                            f.write(d)
                except Exception as e:
                    logger.error(f"Error downloading part {part['part_number']}: {e}")
                    raise HTTPException(
                        status_code=500, 
                        detail=f"Failed to download part {part['part_number']}"
                    )
                    
            # Upload the combined file to MinIO
            file_size = os.path.getsize(temp_path)
            with open(temp_path, 'rb') as f:
                result = minio_client.put_object(
                    bucket_name=MINIO_BUCKET,
                    object_name=object_name,
                    data=f,
                    length=file_size,
                    content_type=content_type
                )
                
            logger.info(f"Multipart upload completed for {object_name} with etag: {result.etag}")
            
            # Delete the temporary file
            os.unlink(temp_path)
            
            # Clean up the parts
            for part in all_parts:
                try:
                    part_key = f"{object_name}.part{part['part_number']}"
                    minio_client.remove_object(MINIO_BUCKET, part_key)
                except Exception as e:
                    logger.warning(f"Failed to remove part {part_key}: {e}")
            
            # Update session data
            session_data["upload_complete"] = True
            session_data["etag"] = result.etag
            session_data["completion_time"] = time.time()
            redis_client.set(f"upload_session:{session_id}", json.dumps(session_data), ex=86400)
            
            # Trigger video processing
            publish_to_video_processor(
                session_id=session_id,
                object_name=object_name,
                filename=filename
            )
            
            return {
                "status": "success",
                "message": "Upload completed successfully",
                "object_name": object_name,
                "etag": result.etag
            }
        finally:
            # Make sure we clean up the temporary file if it still exists
            if os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except Exception as e:
                    logger.warning(f"Failed to delete temporary file {temp_path}: {e}")
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
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis service unavailable")
    if not minio_client:
        raise HTTPException(status_code=503, detail="MinIO service unavailable")
        
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
    Get the status of an upload by session ID.
    """
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis service unavailable")
        
    # Key for storing upload initialization data
    init_key = f"upload_init:{session_id}"
    
    # Get initialization data
    init_data = redis_client.get(init_key)
    if not init_data:
        # If no init data, check if this is a direct upload with just a status
        status_key = f"upload_progress:{session_id}"
        status_data = redis_client.get(status_key)
        if status_data:
            return JSONResponse(content=json.loads(status_data))
        raise HTTPException(status_code=404, detail="Upload session not found.")
        
    init_data = json.loads(init_data)
    object_name = init_data.get("object_name")
    
    # Check for completion status
    status_key = f"upload_complete:{session_id}"
    status_data = redis_client.get(status_key)
    
    if status_data:
        status_data = json.loads(status_data)
        return JSONResponse(content={
            "session_id": session_id,
            "object_name": object_name,
            "status": "completed",
            "url": f"/api/v1/files/{object_name}",  # This would be the URL to access the file
        })
    
    # If not complete, check for progress status
    progress_key = f"upload_progress:{session_id}"
    progress_data = redis_client.get(progress_key)
    
    if progress_data:
        progress_info = json.loads(progress_data)
        return JSONResponse(content={
            "session_id": session_id,
            "object_name": object_name,
            "status": progress_info.get("status", "processing"),
            "progress": progress_info.get("progress", 0),
            "message": progress_info.get("message", "Processing..."),
        })
    
    # If neither complete nor in progress, assume it's still in the upload phase
    return JSONResponse(content={
        "session_id": session_id,
        "object_name": object_name,
        "status": "uploading",
        "progress": 0,
        "message": "Uploading file...",
    })


@app.post("/upload/progress/{session_id}")
async def update_progress(session_id: str, update: ProgressUpdate):
    """
    Update progress status for a session, used by other services to report status
    """
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis service unavailable")
        
    try:
        # Update progress data
        redis_key = f"upload_progress:{session_id}"
        progress_data = {
            "progress": update.progress,
            "message": update.message,
            "status": update.status,
            "updated_at": datetime.now().isoformat()
        }
        
        # Store in Redis with 24 hour expiry
        redis_client.setex(
            redis_key,
            3600 * 24,  # 24 hour TTL
            json.dumps(progress_data)
        )
        
        # ALSO update the transcription entry if it exists
        transcription_key = f"transcription:{session_id}"
        existing_transcription = redis_client.get(transcription_key)
        
        if existing_transcription:
            transcription_data = json.loads(existing_transcription)
            # Update the status and progress in the main transcription entry
            transcription_data.update({
                "status": update.status,
                "sessionStatus": update.status,
                "progress": update.progress,
                "updated_at": datetime.now().isoformat()
            })
            
            # If completed, mark as completed
            if update.status == "completed" or update.progress >= 100:
                transcription_data.update({
                    "completedAt": datetime.now().isoformat(),
                    "completed_at": datetime.now().isoformat()
                })
            
            # Store updated transcription entry
            redis_client.setex(transcription_key, 48 * 3600, json.dumps(transcription_data))
            # Only log transcription updates for important status changes
            if update.status in ['completed', 'failed', 'error']:
                logger.info(f"Updated transcription entry for session {session_id} with new status: {update.status}")
        
        # Only log completion, errors, or final status - no verbose upload progress
        if any(keyword in update.message.lower() for keyword in [
            'completed', 'failed', 'error'
        ]) or update.progress >= 100:
            logger.info(f"📊 {session_id[:8]}: {update.progress}% - {update.message}")
        
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to update progress for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update progress: {str(e)}")

# Alternate route for compatibility
@app.post("/upload/complete-upload")
async def update_progress_alt(request: Request):
    """
    Alternative progress update endpoint for backward compatibility
    """
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis service unavailable")
        
    try:
        data = await request.json()
        session_id = data.get("session_id")
        if not session_id:
            raise HTTPException(status_code=400, detail="Missing session_id parameter")
            
        redis_key = f"upload_progress:{session_id}"
        progress_data = {
            "progress": data.get("progress", 0),
            "message": data.get("message", "Processing..."),
            "status": data.get("status", "processing"),
            "updated_at": datetime.now().isoformat()
        }
        
        # Store in Redis with 24 hour expiry
        redis_client.setex(
            redis_key,
            3600 * 24,  # 24 hour TTL
            json.dumps(progress_data)
        )
        
        # Only log significant progress updates
        if data.get('progress', 0) >= 100 or 'completed' in data.get('message', '').lower() or 'failed' in data.get('message', '').lower():
            logger.info(f"📊 Alt route - {session_id[:8]}: {data.get('progress', 0)}% - {data.get('message', 'Processing...')}")
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to update progress via alt route: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update progress: {str(e)}")

@app.post("/upload/complete")
async def handle_completion(request: Request):
    """
    Handle completion notification compatibility endpoint
    """
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis service unavailable")
        
    try:
        data = await request.json()
        session_id = data.get("session_id")
        if not session_id:
            raise HTTPException(status_code=400, detail="Missing session_id parameter")
            
        redis_key = f"upload_progress:{session_id}"
        progress_data = {
            "progress": 100,
            "message": data.get("message", "Processing complete"),
            "status": data.get("status", "completed"),
            "updated_at": datetime.now().isoformat()
        }
        
        # Store in Redis with 24 hour expiry
        redis_client.setex(
            redis_key,
            3600 * 24,  # 24 hour TTL
            json.dumps(progress_data)
        )
        
        logger.info(f"Marked session {session_id} as complete")
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to handle completion: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to handle completion: {str(e)}")

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

@app.get("/api/v1/transcripts/admin/all")
async def get_all_transcripts_for_admin():
    """
    Get all transcripts from all users (admin only)
    """
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis service unavailable")
        
    try:
        # Get all transcription data from Redis
        keys = redis_client.keys("transcription:*")
        transcriptions = []

        for key in keys:
            data = redis_client.get(key)
            if data:
                transcription = json.loads(data)
                session_id = key.split(":")[-1]
                
                # Get user information
                user_id = transcription.get("user_id")
                username = "Unknown User"
                
                if user_id:
                    user_data = redis_client.get(f"user:{user_id}")
                    if user_data:
                        user_info = json.loads(user_data)
                        username = user_info.get("full_name") or user_info.get("username") or "Unknown User"
                
                # Add session ID and additional information
                transcription.update({
                    "id": session_id,
                    "sessionId": session_id,
                    "username": username,
                    "filename": transcription.get("filename", "Unknown"),
                    "fileSize": transcription.get("fileSize", transcription.get("file_size", 0)),
                    "mimeType": transcription.get("mimeType", transcription.get("content_type", "unknown")),
                    "status": transcription.get("status", "processing"),
                    "progress": transcription.get("progress", 0),
                    "hasTranscript": transcription.get("status") == "completed",
                    "createdAt": transcription.get("createdAt", transcription.get("created_at", datetime.now().isoformat())),
                    "completedAt": transcription.get("completedAt", transcription.get("completed_at", None)),
                    "duration": transcription.get("duration", 0),
                })
                
                transcriptions.append(transcription)

        # Calculate stats
        stats = {
            "total": len(transcriptions),
            "completed": len([t for t in transcriptions if t.get("status") == "completed"]),
            "processing": len([t for t in transcriptions if t.get("status") in ["processing", "transcribing", "uploading", "analyzing", "pending"]]),
            "failed": len([t for t in transcriptions if t.get("status") == "failed"]),
            "totalSize": sum(t.get("fileSize", 0) for t in transcriptions),
            "totalDuration": sum(t.get("duration", 0) for t in transcriptions),
            "userCount": len(set(t.get("user_id") for t in transcriptions if t.get("user_id")))
        }

        # Sort by creation date (newest first)
        transcriptions.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
        
        return {"transcriptions": transcriptions, "stats": stats}
    except Exception as e:
        logger.error(f"Error retrieving all transcripts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve transcripts: {str(e)}")

@app.get("/api/v1/transcripts/user/{user_id}")
async def get_user_transcripts(user_id: str):
    """
    Get all transcripts for a specific user
    """
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis service unavailable")
        
    try:
        # Get all transcription data from Redis
        transcription_keys = redis_client.keys("transcription:*")
        progress_keys = redis_client.keys("upload_progress:*")
        upload_session_keys = redis_client.keys("upload_session:*")
        
        transcriptions = []
        session_ids_with_transcriptions = set()

        # Process completed transcriptions
        for key in transcription_keys:
            data = redis_client.get(key)
            if data:
                transcription = json.loads(data)
                
                # Only include transcripts for this user
                if transcription.get("user_id") == user_id:
                    session_id = key.split(":")[-1]
                    session_ids_with_transcriptions.add(session_id)
                    
                    # Add session ID and format the data
                    transcription.update({
                        "id": session_id,
                        "sessionId": session_id,
                        "filename": transcription.get("filename", "Unknown"),
                        "fileSize": transcription.get("fileSize", transcription.get("file_size", 0)),
                        "mimeType": transcription.get("mimeType", transcription.get("content_type", "unknown")),
                        "participantCount": transcription.get("participantCount", transcription.get("speaker_count", 1)),
                        "status": transcription.get("status", "processing"),
                        "sessionStatus": transcription.get("status", "processing"),
                        "progress": transcription.get("progress", 0),
                        "hasTranscript": transcription.get("status") == "completed",
                        "transcriptData": transcription.get("transcriptData", transcription.get("transcript", None)),
                        "createdAt": transcription.get("createdAt", transcription.get("created_at", datetime.now().isoformat())),
                        "completedAt": transcription.get("completedAt", transcription.get("completed_at", None)),
                        "duration": transcription.get("duration", 0),
                        "segmentCount": len(transcription.get("diarizedSegments", transcription.get("diarized_segments", []))),
                        "language": transcription.get("language", "en"),
                        "speakers": transcription.get("speakers", []),
                        "diarizedSegments": transcription.get("diarizedSegments", transcription.get("diarized_segments", []))
                    })
                    
                    transcriptions.append(transcription)

        # Process files that are still in progress (have progress but no transcription yet)
        for key in progress_keys:
            session_id = key.split(":")[-1]
            
            # Skip if we already have a transcription for this session
            if session_id in session_ids_with_transcriptions:
                continue
                
            progress_data = redis_client.get(key)
            if progress_data:
                progress_info = json.loads(progress_data)
                
                # Try to get upload session data to check if it belongs to this user
                upload_session_data = redis_client.get(f"upload_session:{session_id}")
                if upload_session_data:
                    session_info = json.loads(upload_session_data)
                    
                    # Only include if it belongs to this user
                    if session_info.get("user_id") == user_id:
                        transcription = {
                            "id": session_id,
                            "sessionId": session_id,
                            "filename": session_info.get("filename", "Processing..."),
                            "fileSize": session_info.get("file_size", 0),
                            "mimeType": session_info.get("content_type", "unknown"),
                            "participantCount": 2,  # Default
                            "status": progress_info.get("status", "processing"),
                            "sessionStatus": progress_info.get("status", "processing"),
                            "progress": progress_info.get("progress", 0),
                            "hasTranscript": False,
                            "transcriptData": None,
                            "createdAt": session_info.get("creation_time", datetime.now().isoformat()),
                            "completedAt": None,
                            "duration": 0,
                            "segmentCount": 0,
                            "language": "en",
                            "speakers": [],
                            "diarizedSegments": []
                        }
                        
                        transcriptions.append(transcription)

        # Sort by creation date (newest first)
        transcriptions.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
        
        return {"transcriptions": transcriptions}
    except Exception as e:
        logger.error(f"Error retrieving transcripts for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve user transcripts: {str(e)}")

@app.delete("/api/v1/transcripts/{session_id}")
async def delete_transcript(session_id: str, user_id: str = None):
    """
    Delete a transcript by session ID
    """
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis service unavailable")
        
    try:
        # Check if transcription exists
        transcription_key = f"transcription:{session_id}"
        data = redis_client.get(transcription_key)
        
        if not data:
            raise HTTPException(status_code=404, detail="Transcript not found")
        
        transcription = json.loads(data)
        
        # Verify ownership if user_id is provided
        if user_id and transcription.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized to delete this transcript")
        
        # Delete from Redis
        redis_client.delete(transcription_key)
        
        # Also clean up any related keys
        related_keys = [
            f"upload_session:{session_id}",
            f"upload_progress:{session_id}",
            f"upload_metadata:{session_id}",
            f"processing_metadata:{session_id}",
            f"session_metadata:{session_id}",
            f"transcription_error:{session_id}",
            f"transcribing:{session_id}",
            f"llm_analysis:{session_id}"
        ]
        
        for key in related_keys:
            try:
                redis_client.delete(key)
            except Exception as e:
                logger.warning(f"Failed to delete related key {key}: {e}")
        
        # Try to delete from MinIO if object_name exists
        try:
            object_name = transcription.get("object_name")
            if object_name and minio_client:
                minio_client.remove_object(MINIO_BUCKET, object_name)
                logger.info(f"Deleted file {object_name} from MinIO")
        except Exception as e:
            logger.warning(f"Failed to delete file from MinIO: {e}")
        
        logger.info(f"Successfully deleted transcript for session {session_id}")
        return {"message": "Transcript deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting transcript {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete transcript: {str(e)}")

@app.post("/api/v1/immediate-transcription")
async def create_immediate_transcription(transcription_data: dict):
    """
    Create an immediate transcription entry in Redis for progress tracking
    This allows the transcripts page to show uploads immediately
    """
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis service unavailable")
    
    try:
        session_id = transcription_data.get("session_id")
        if not session_id:
            raise HTTPException(status_code=400, detail="Missing session_id")
        
        # Store in Redis using the same key pattern that get_user_transcripts expects
        redis_key = f"transcription:{session_id}"
        
        # Store with 48 hour TTL (longer than progress data since this is the main entry)
        redis_client.setex(
            redis_key,
            48 * 3600,  # 48 hours
            json.dumps(transcription_data)
        )
        
        # Also create progress entry for real-time updates
        progress_key = f"upload_progress:{session_id}"
        progress_data = {
            "progress": 0,
            "message": "Starting upload...",
            "status": "uploading",
            "stage": "uploading",
            "updated_at": datetime.now().isoformat()
        }
        redis_client.setex(progress_key, 24 * 3600, json.dumps(progress_data))
        
        logger.info(f"Created immediate transcription entry for session {session_id}")
        return {"status": "success", "message": "Transcription entry created"}
        
    except Exception as e:
        logger.error(f"Failed to create immediate transcription entry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create entry: {str(e)}")

@app.post("/save-transcript-edits")
async def save_transcript_edits(edit_data: dict):
    """
    Save transcript edits (speaker names and action items) to MinIO for long-term storage
    """
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis service unavailable")
    if not minio_client:
        raise HTTPException(status_code=503, detail="MinIO service unavailable")
    
    try:
        session_id = edit_data.get("session_id")
        if not session_id:
            raise HTTPException(status_code=400, detail="Missing session_id")
        
        user_id = edit_data.get("user_id")
        speaker_mapping = edit_data.get("speaker_mapping")
        action_items = edit_data.get("action_items", [])
        updated_at = edit_data.get("updated_at", datetime.now().isoformat())
        saved_by = edit_data.get("saved_by", "Unknown User")
        
        # Create the edit data structure
        edit_record = {
            "session_id": session_id,
            "user_id": user_id,
            "speaker_mapping": speaker_mapping,
            "action_items": action_items,
            "updated_at": updated_at,
            "saved_by": saved_by,
            "edit_type": "user_edits",
            "version": "1.0"
        }
        
        # Generate object name for MinIO storage
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        object_name = f"transcript_edits/{session_id}/edits_{timestamp}.json"
        
        # Convert to JSON and upload to MinIO
        json_data = json.dumps(edit_record, indent=2)
        json_bytes = json_data.encode('utf-8')
        
        # Ensure bucket exists
        if not minio_client.bucket_exists(MINIO_BUCKET):
            minio_client.make_bucket(MINIO_BUCKET)
        
        # Upload to MinIO
        result = minio_client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=object_name,
            data=io.BytesIO(json_bytes),
            length=len(json_bytes),
            content_type="application/json"
        )
        
        # Also save to Redis for quick access
        redis_key = f"transcript_edits:{session_id}"
        redis_client.setex(
            redis_key,
            7 * 24 * 3600,  # 7 days TTL
            json_data
        )
        
        logger.info(f"Successfully saved transcript edits for session {session_id} to MinIO: {object_name}")
        
        return {
            "status": "success",
            "message": "Transcript edits saved successfully",
            "minio_object": object_name,
            "etag": result.etag,
            "redis_key": redis_key,
            "timestamp": updated_at
        }
        
    except Exception as e:
        logger.error(f"Failed to save transcript edits for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save edits: {str(e)}")

@app.get("/get-transcript-edits/{session_id}")
async def get_transcript_edits(session_id: str):
    """
    Retrieve saved transcript edits from Redis or MinIO
    """
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis service unavailable")
    
    try:
        # First try Redis for quick access
        redis_key = f"transcript_edits:{session_id}"
        cached_data = redis_client.get(redis_key)
        
        if cached_data:
            edit_record = json.loads(cached_data)
            return {
                "status": "success",
                "source": "redis_cache",
                "edits": edit_record
            }
        
        # If not in Redis, try to find in MinIO
        if minio_client:
            try:
                # List objects with the session prefix
                objects = minio_client.list_objects(
                    MINIO_BUCKET, 
                    prefix=f"transcript_edits/{session_id}/",
                    recursive=True
                )
                
                # Get the most recent edit file
                latest_object = None
                for obj in objects:
                    if obj.object_name.endswith('.json'):
                        latest_object = obj.object_name
                
                if latest_object:
                    # Download and return the latest edits
                    response = minio_client.get_object(MINIO_BUCKET, latest_object)
                    edit_data = json.loads(response.read().decode('utf-8'))
                    
                    # Cache back to Redis for future quick access
                    redis_client.setex(
                        redis_key,
                        7 * 24 * 3600,  # 7 days TTL
                        json.dumps(edit_data)
                    )
                    
                    return {
                        "status": "success",
                        "source": "minio_storage",
                        "minio_object": latest_object,
                        "edits": edit_data
                    }
                    
            except Exception as e:
                logger.warning(f"Failed to retrieve edits from MinIO for session {session_id}: {e}")
        
        # No edits found
        return {
            "status": "not_found",
            "message": "No saved edits found for this transcript"
        }
        
    except Exception as e:
        logger.error(f"Failed to retrieve transcript edits for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve edits: {str(e)}")
        
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)