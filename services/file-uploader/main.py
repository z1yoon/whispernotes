import os
import uuid
import json
import logging
from datetime import timedelta

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from minio import Minio
from minio.error import S3Error
import redis
import pika

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
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "videos")
MINIO_USE_SECURE = os.getenv("MINIO_USE_SECURE", "false").lower() == "true"

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", 5672))
RABBITMQ_USER = os.getenv("RABBITMQ_DEFAULT_USER", "user")
RABBITMQ_PASS = os.getenv("RABBITMQ_DEFAULT_PASS", "password")
VIDEO_PROCESSING_QUEUE = "video_processing_queue"

# --- Service Clients ---
try:
    minio_client = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=MINIO_USE_SECURE,
    )
    logger.info("Successfully connected to MinIO.")
    except Exception as e:
    logger.error(f"Failed to connect to MinIO: {e}")
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
    Initiates a multipart upload with MinIO.
    """
    session_id = str(uuid.uuid4())
    # Sanitize filename and create a unique object name
    safe_filename = "".join(c for c in request.filename if c.isalnum() or c in ('.', '_', '-')).strip()
    object_name = f"{session_id}/{safe_filename}"

    try:
        # Start a new multipart upload
        upload_id = minio_client.create_multipart_upload(
            bucket_name=MINIO_BUCKET,
            object_name=object_name,
        )
        logger.info(f"Initialized multipart upload for {object_name} with upload ID: {upload_id}")

        # Store session data in Redis, expiring after 24 hours
        session_data = {
            "upload_id": upload_id,
            "object_name": object_name,
            "filename": request.filename,
            "file_size": request.file_size
        }
        redis_client.set(f"upload_session:{session_id}", json.dumps(session_data), ex=86400)
        
        return UploadInitializationResponse(
            session_id=session_id,
            upload_id=upload_id,
            object_name=object_name,
        )
    except S3Error as e:
        logger.error(f"MinIO error on initializing upload: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to initialize upload: {e}")
    except Exception as e:
        logger.error(f"An unexpected error occurred on initializing upload: {e}")
        raise HTTPException(status_code=500, detail="An internal error occurred.")


@app.post("/api/v1/uploads/{session_id}/presigned-url", response_model=PresignedUrlResponse)
async def get_presigned_upload_url(session_id: str, request: PresignedUrlRequest):
    """
    Generates a presigned URL for a specific part of a multipart upload.
    """
    session_data_raw = redis_client.get(f"upload_session:{session_id}")
    if not session_data_raw:
        raise HTTPException(status_code=404, detail="Upload session not found.")
    
    session_data = json.loads(session_data_raw)
    upload_id = session_data.get("upload_id")
    object_name = session_data.get("object_name")

    if not upload_id or not object_name:
         raise HTTPException(status_code=404, detail="Invalid session data.")

    try:
        url = minio_client.get_presigned_url(
            method='PUT',
            bucket_name=MINIO_BUCKET,
            object_name=object_name,
            expires=timedelta(hours=1), # URL is valid for 1 hour
            extra_query_params={
                "partNumber": request.part_number,
                "uploadId": upload_id
            }
        )
        return PresignedUrlResponse(url=url)
    except S3Error as e:
        logger.error(f"MinIO error on generating presigned URL: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate presigned URL: {e}")
    except Exception as e:
        logger.error(f"An unexpected error occurred on generating presigned URL: {e}")
        raise HTTPException(status_code=500, detail="An internal error occurred.")

@app.post("/api/v1/uploads/{session_id}/complete")
async def complete_upload(session_id: str, request: CompletionRequest):
    """
    Completes a multipart upload in MinIO.
    """
    session_data_raw = redis_client.get(f"upload_session:{session_id}")
    if not session_data_raw:
        raise HTTPException(status_code=404, detail="Upload session not found.")
    
    session_data = json.loads(session_data_raw)
    upload_id = session_data.get("upload_id")
    object_name = session_data.get("object_name")
    filename = session_data.get("filename")

    if not upload_id or not object_name:
         raise HTTPException(status_code=404, detail="Invalid session data.")

    try:
        # MinIO client expects a list of objects with 'part_num' and 'etag'
        parts_for_minio = [
            {'part_num': part.PartNumber, 'etag': part.ETag}
            for part in request.parts
        ]

        minio_client.complete_multipart_upload(
            bucket_name=MINIO_BUCKET,
            object_name=object_name,
            upload_id=upload_id,
            parts=parts_for_minio,
        )
        logger.info(f"Successfully completed multipart upload for {object_name}")

        # Publish a message to RabbitMQ for the video processor
        publish_to_video_processor(session_id, object_name, filename)

        # Clean up session from Redis
        redis_client.delete(f"upload_session:{session_id}")
        
        return {"message": "File upload completed successfully."}

    except S3Error as e:
        logger.error(f"MinIO error on completing upload: {e}")
        # You might want to attempt to abort the multipart upload here
        # minio_client.abort_multipart_upload(...)
        raise HTTPException(status_code=500, detail=f"Failed to complete upload: {e}")
    except Exception as e:
        logger.error(f"An unexpected error occurred on completing upload: {e}")
        raise HTTPException(status_code=500, detail="An internal error occurred.")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)