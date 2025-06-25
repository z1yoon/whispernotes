import os
import json
import asyncio
import subprocess
import threading
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import redis
import httpx
import pika
from datetime import datetime
from typing import Optional, List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="WhisperNotes Video Processor", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
TEMP_DIR = "/app/temp"
PROCESSED_DIR = "/app/processed"

# Redis for caching and progress tracking
redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
redis_client = redis.from_url(redis_url, decode_responses=True)

# Service URLs
WHISPER_SERVICE_URL = os.getenv("WHISPER_SERVICE_URL", "http://whisper-transcriber:8003")
FILE_UPLOADER_URL = os.getenv("FILE_UPLOADER_URL", "http://file-uploader:8002")

# RabbitMQ configuration
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", 5672))
RABBITMQ_USER = os.getenv("RABBITMQ_DEFAULT_USER", "user")
RABBITMQ_PASS = os.getenv("RABBITMQ_DEFAULT_PASS", "password")
VIDEO_PROCESSING_QUEUE = "video_processing_queue"

# MinIO configuration
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin123")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "whisper-files")

# Ensure directories exist
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

# Pydantic models
class ProcessRequest(BaseModel):
    file_path: str
    session_id: str
    participant_count: int = 2
    speaker_names: Optional[List[str]] = None

class ProcessingStatus(BaseModel):
    session_id: str
    status: str
    progress: float
    message: str
    audio_path: Optional[str] = None
    duration: Optional[float] = None
    error: Optional[str] = None

# Helper functions
async def send_progress_update(session_id: str, progress: float, message: str, status: str):
    """Send progress update to file uploader service"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"{FILE_UPLOADER_URL}/upload/progress/{session_id}",
                json={
                    "progress": progress,
                    "message": message,
                    "status": status
                }
            )
    except Exception as e:
        logger.error(f"Failed to send progress update: {e}")

def get_video_info(file_path: str) -> dict:
    """Extract metadata from video file using ffprobe"""
    try:
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            file_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        info = json.loads(result.stdout)
        
        # Extract relevant information
        duration = float(info["format"].get("duration", 0))
        
        video_stream = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
        audio_stream = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
        
        video_info = {
            "duration": duration,
            "format": info["format"].get("format_name", "unknown"),
            "size": int(info["format"].get("size", 0)),
            "has_video": video_stream is not None,
            "has_audio": audio_stream is not None,
        }
        
        if video_stream:
            video_info["video"] = {
                "codec": video_stream.get("codec_name", "unknown"),
                "width": int(video_stream.get("width", 0)),
                "height": int(video_stream.get("height", 0)),
                "fps": eval(video_stream.get("avg_frame_rate", "0/1"))
            }
            
        if audio_stream:
            video_info["audio"] = {
                "codec": audio_stream.get("codec_name", "unknown"),
                "sample_rate": int(audio_stream.get("sample_rate", 0)),
                "channels": int(audio_stream.get("channels", 0))
            }
            
        return video_info
        
    except Exception as e:
        logger.error(f"Failed to get video info: {e}")
        # Return minimal info if extraction fails
        return {"duration": 0, "has_video": False, "has_audio": False}

def extract_audio(video_path: str, audio_path: str) -> bool:
    """Extract audio from video file using ffmpeg"""
    try:
        cmd = [
            "ffmpeg",
            "-i", video_path,
            "-vn",  # Disable video
            "-acodec", "pcm_s16le",  # High quality WAV
            "-ar", "16000",  # 16kHz sample rate (good for speech)
            "-ac", "1",  # Mono
            "-y",  # Overwrite output
            audio_path
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
        logger.info(f"Audio extracted to {audio_path}")
        return True
        
    except Exception as e:
        logger.error(f"Audio extraction failed: {e}")
        return False

def enhance_audio_for_speech(input_audio: str, output_audio: str) -> bool:
    """Enhance audio for better speech recognition with ffmpeg"""
    try:
        cmd = [
            "ffmpeg",
            "-i", input_audio,
            # Audio filtering for speech enhancement
            "-af", "highpass=f=200,lowpass=f=3000,areverse,highpass=f=200,areverse",
            # Normalize audio
            "-filter:a", "volume=2.0",  # Increase volume
            # Output settings
            "-ar", "16000",  # 16kHz (standard for speech recognition)
            "-ac", "1",  # Mono
            "-acodec", "pcm_s16le",  # High quality WAV
            "-y",  # Overwrite output
            output_audio
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
        logger.info(f"Audio enhanced and saved to {output_audio}")
        return True
        
    except Exception as e:
        logger.error(f"Audio enhancement failed: {e}")
        # If enhancement fails, we'll just copy the original
        try:
            import shutil
            shutil.copy(input_audio, output_audio)
            logger.warning(f"Using unenhanced audio due to filter error: {e}")
            return True
        except Exception as copy_err:
            logger.error(f"Failed to copy audio file: {copy_err}")
            return False

async def send_to_whisper_service(audio_path: str, session_id: str, participant_count: int, speaker_names: Optional[List[str]] = None):
    """Send processed audio to Whisper transcription service"""
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:  # 5 minute timeout
            with open(audio_path, 'rb') as audio_file:
                files = {'audio': audio_file}
                data = {
                    'session_id': session_id,
                    'participant_count': participant_count
                }
                
                # Add speaker names if provided
                if speaker_names and len(speaker_names) > 0:
                    data['speaker_names'] = json.dumps(speaker_names)
                
                response = await client.post(
                    f"{WHISPER_SERVICE_URL}/transcribe",
                    files=files,
                    data=data
                )
                
                if response.status_code == 200:
                    logger.info(f"Audio sent to Whisper service: {session_id}")
                    return response.json()
                else:
                    logger.error(f"Failed to send to Whisper service: {response.text}")
                    raise Exception(f"Whisper service error: {response.text}")
                    
    except Exception as e:
        logger.error(f"Error sending to Whisper service: {e}")
        raise

async def process_video_async(file_path: str, session_id: str, participant_count: int, speaker_names: Optional[List[str]] = None):
    """Process video file asynchronously"""
    try:
        logger.info(f"Starting video processing for session: {session_id}")
        
        # Update progress
        await send_progress_update(session_id, 10, "Analyzing video file...", "processing")
        
        # Get video information
        video_info = get_video_info(file_path)
        duration = video_info["duration"]
        
        # Store video metadata
        redis_client.setex(
            f"video_metadata:{session_id}",
            24 * 3600,  # 24 hours
            json.dumps({
                "session_id": session_id,
                "duration": duration,
                "video_info": video_info,
                "participant_count": participant_count,
                "speaker_names": speaker_names,
                "processed_at": datetime.utcnow().isoformat()
            })
        )
        
        await send_progress_update(session_id, 25, "Extracting audio track...", "processing")
        
        # Extract audio
        audio_filename = f"{session_id}_audio.wav"
        audio_path = os.path.join(TEMP_DIR, audio_filename)
        
        extract_audio(file_path, audio_path)
        
        await send_progress_update(session_id, 40, "Enhancing audio quality...", "processing")
        
        # Enhance audio for better speech recognition
        enhanced_audio_path = os.path.join(PROCESSED_DIR, f"{session_id}_enhanced.wav")
        enhance_audio_for_speech(audio_path, enhanced_audio_path)
        
        # Clean up temporary audio file
        if os.path.exists(audio_path):
            os.remove(audio_path)
        
        await send_progress_update(session_id, 60, "Sending to transcription service...", "processing")
        
        # Send to Whisper service
        transcription_result = await send_to_whisper_service(
            enhanced_audio_path, 
            session_id, 
            participant_count,
            speaker_names
        )
        
        logger.info(f"Video processing completed for session: {session_id}")
        return {
            "session_id": session_id,
            "status": "processing",
            "message": "Sent to transcription service"
        }
        
    except Exception as e:
        logger.error(f"Error processing video for session {session_id}: {e}")
        
        await send_progress_update(
            session_id, 
            0, 
            f"Processing failed: {str(e)}", 
            "error"
        )
        
        # Store error information
        redis_client.setex(
            f"processing_error:{session_id}",
            24 * 3600,
            json.dumps({
                "session_id": session_id,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
        )
        
        raise

def download_from_minio(object_name: str, destination_path: str) -> bool:
    """Download file from MinIO"""
    from minio import Minio
    from minio.error import S3Error
    
    try:
        # Initialize MinIO client
        minio_client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=False  # Change to True for HTTPS
        )
        
        # Make sure the directory exists
        os.makedirs(os.path.dirname(destination_path), exist_ok=True)
        
        # Download the object
        minio_client.fget_object(MINIO_BUCKET, object_name, destination_path)
        logger.info(f"Downloaded {object_name} to {destination_path}")
        return True
        
    except S3Error as e:
        logger.error(f"MinIO error downloading {object_name}: {e}")
        return False
    except Exception as e:
        logger.error(f"Error downloading from MinIO: {e}")
        return False

def process_upload_message(ch, method, properties, body):
    """Process message from RabbitMQ"""
    try:
        message = json.loads(body)
        logger.info(f"Received message: {message}")
        
        session_id = message.get("session_id")
        object_name = message.get("object_name")
        original_filename = message.get("original_filename")
        num_speakers = message.get("num_speakers", 2)  # Get speaker count from message
        
        if not session_id or not object_name:
            logger.error("Invalid message: missing session_id or object_name")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return
            
        logger.info(f"Processing video for session {session_id} with {num_speakers} speakers")
            
        # Create download path
        download_path = os.path.join(TEMP_DIR, f"{session_id}_{original_filename}")
        
        # Download file from MinIO
        success = download_from_minio(object_name, download_path)
        if not success:
            logger.error(f"Failed to download {object_name}")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return
            
        # Get additional metadata from Redis if available
        metadata = None
        try:
            metadata_raw = redis_client.get(f"upload_metadata:{session_id}")
            if metadata_raw:
                metadata = json.loads(metadata_raw)
        except Exception as e:
            logger.error(f"Error getting metadata from Redis: {e}")
            
        # Use speaker count from message, fallback to metadata or default
        participant_count = num_speakers
        speaker_names = None
        
        if metadata:
            speaker_names = metadata.get("speaker_names")
        
        # Start processing
        asyncio.run(process_video_async(download_path, session_id, participant_count, speaker_names))
        
        # Acknowledge message
        ch.basic_ack(delivery_tag=method.delivery_tag)
        
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        # Acknowledge to avoid reprocessing (in production you might want to retry)
        ch.basic_ack(delivery_tag=method.delivery_tag)

def start_rabbitmq_consumer():
    """Start RabbitMQ consumer in a separate thread"""
    try:
        credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
        parameters = pika.ConnectionParameters(
            host=RABBITMQ_HOST,
            port=RABBITMQ_PORT,
            credentials=credentials,
            heartbeat=600,  # 10 minutes heartbeat to keep connection alive
            blocked_connection_timeout=300  # 5 minutes timeout
        )
        
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()
        
        # Declare queue
        channel.queue_declare(queue=VIDEO_PROCESSING_QUEUE, durable=True)
        
        # Set prefetch count to avoid overloading
        channel.basic_qos(prefetch_count=1)
        
        # Set up consumer
        channel.basic_consume(
            queue=VIDEO_PROCESSING_QUEUE,
            on_message_callback=process_upload_message
        )
        
        logger.info(f"Started RabbitMQ consumer, listening for messages on {VIDEO_PROCESSING_QUEUE}")
        
        # Start consuming
        channel.start_consuming()
        
    except Exception as e:
        logger.error(f"Error starting RabbitMQ consumer: {e}")
        # In production, add retry mechanism

# API Routes
@app.post("/process")
async def process_video(request: ProcessRequest, background_tasks: BackgroundTasks):
    """Process a video file"""
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check if already processing
    processing_key = f"processing:{request.session_id}"
    if redis_client.get(processing_key):
        raise HTTPException(status_code=409, detail="Video already being processed")
    
    # Mark as processing
    redis_client.setex(processing_key, 3600, "processing")  # 1 hour expiration
    
    try:
        # Start background processing
        background_tasks.add_task(
            process_video_async,
            request.file_path,
            request.session_id,
            request.participant_count,
            request.speaker_names
        )
        
        return {
            "message": "Processing started",
            "session_id": request.session_id,
            "status": "processing"
        }
        
    except Exception as e:
        # Clean up on error
        redis_client.delete(processing_key)
        raise HTTPException(status_code=500, detail=f"Failed to start processing: {str(e)}")

@app.get("/status/{session_id}")
async def get_processing_status(session_id: str):
    """Get processing status for a session"""
    
    # Check if currently processing
    processing_key = f"processing:{session_id}"
    if redis_client.get(processing_key):
        return {"session_id": session_id, "status": "processing"}
    
    # Check for completion metadata
    metadata_key = f"video_metadata:{session_id}"
    metadata = redis_client.get(metadata_key)
    if metadata:
        return {
            "session_id": session_id,
            "status": "completed",
            "metadata": json.loads(metadata)
        }
    
    # Check for errors
    error_key = f"processing_error:{session_id}"
    error_data = redis_client.get(error_key)
    if error_data:
        return {
            "session_id": session_id,
            "status": "error",
            "error": json.loads(error_data)
        }
    
    raise HTTPException(status_code=404, detail="Session not found")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}

@app.on_event("startup")
async def startup_event():
    """Start background consumer thread on startup"""
    # Start RabbitMQ consumer in a separate thread
    consumer_thread = threading.Thread(target=start_rabbitmq_consumer, daemon=True)
    consumer_thread.start()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)