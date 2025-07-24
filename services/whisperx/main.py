import os
import gc
import json
import torch
import asyncio
import threading
import redis
import httpx
import logging
import pika
import librosa
import psutil
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Union
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("whisperx")

# Import WhisperX
import whisperx

# Singapore timezone (UTC+8)
SINGAPORE_TZ = timezone(timedelta(hours=8))

# Initialize FastAPI app
app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
DEFAULT_AUDIO_TYPE = "audio/wav"
DEFAULT_VIDEO_TYPE = "video/mp4"
TEMP_DIR = "/tmp/whisper_temp"
SESSION_EXPIRY = 24 * 3600  # 24 hours

# Configuration optimized for RTX 5090
DEVICE = os.environ.get("DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
COMPUTE_TYPE = os.environ.get("COMPUTE_TYPE", "float16")

# Enable RTX 5090 optimizations
if torch.cuda.is_available():
    torch.backends.cuda.matmul.allow_tf32 = True
    torch.backends.cudnn.allow_tf32 = True
    torch.backends.cudnn.benchmark = True
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "8"))
DEFAULT_LANGUAGE = os.environ.get("DEFAULT_LANGUAGE", "en")
HF_TOKEN = os.environ.get("HF_TOKEN")
MIN_SPEAKERS = int(os.environ.get("MIN_SPEAKERS", "1"))
MAX_SPEAKERS = int(os.environ.get("MAX_SPEAKERS", "10"))

# Service URLs
LLM_SERVICE_URL = os.getenv("LLM_SERVICE_URL")
FILE_UPLOADER_URL = os.getenv("FILE_UPLOADER_URL")

# Redis configuration
redis_url = os.getenv("REDIS_URL")
try:
    redis_client = redis.from_url(redis_url, decode_responses=True)
    redis_client.ping()
    logger.info("✅ Redis connection established")
except Exception as e:
    logger.error(f"❌ Redis connection failed: {e}")
    redis_client = None

# RabbitMQ configuration
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", "5672"))
RABBITMQ_USER = os.getenv("RABBITMQ_DEFAULT_USER")
RABBITMQ_PASS = os.getenv("RABBITMQ_DEFAULT_PASS")
TRANSCRIPTION_QUEUE = "video_processing_queue"

# MinIO configuration
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
MINIO_BUCKET = os.getenv("MINIO_BUCKET")

# PostgreSQL configuration
DATABASE_URL = os.getenv("DATABASE_URL")

# Model cache
models = {}


def load_whisper_model(model_name="large-v3"):
    """Load WhisperX model following official documentation"""
    if "whisper" not in models:
        logger.info(f"Loading WhisperX model: {model_name} on {DEVICE}")
        
        # Load model following official WhisperX documentation
        models["whisper"] = whisperx.load_model(model_name, DEVICE, compute_type=COMPUTE_TYPE)
        
        logger.info("✅ WhisperX model loaded successfully")
                
    return models["whisper"]

def load_alignment_model(language_code):
    """Load alignment model for better timestamps"""
    alignment_key = f"alignment_{language_code}"
    
    if alignment_key not in models:
        try:
            logger.info(f"Loading alignment model for {language_code}")
            model_a, metadata = whisperx.load_align_model(
                language_code=language_code,
                device=DEVICE
            )
            models[alignment_key] = {"model": model_a, "metadata": metadata}
            logger.info(f"✅ Alignment model loaded for {language_code}")
            return model_a, metadata
        except Exception as e:
            logger.warning(f"Could not load alignment model for {language_code}: {e}")
            return None, None
    else:
        stored = models[alignment_key]
        return stored["model"], stored["metadata"]

def load_diarization_model():
    """Load speaker diarization model"""
    if not HF_TOKEN:
        raise ValueError("HF_TOKEN is required for diarization model")
        
    if "diarization" not in models:
        logger.info("Loading diarization model")
        models["diarization"] = whisperx.diarize.DiarizationPipeline(
            use_auth_token=HF_TOKEN,
            device=DEVICE
        )
        logger.info("✅ Diarization model loaded")
            
    return models["diarization"]

# Pydantic models
class TranscriptionRequest(BaseModel):
    session_id: str
    participant_count: int = 2
    language: Optional[str] = None
    speaker_names: Optional[List[str]] = None

class SpeakerSegment(BaseModel):
    speaker: str
    start: float
    end: float
    text: str

class TranscriptionResult(BaseModel):
    session_id: str
    language: str
    duration: float
    segments: List[Dict[str, Union[str, float]]]
    diarized_segments: Optional[List[SpeakerSegment]] = None

class SpeakerUpdateRequest(BaseModel):
    speaker_map: Dict[str, str]

async def send_progress_update(session_id: str, progress: float, message: str, status: str):
    """Send progress update to file uploader service"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{FILE_UPLOADER_URL}/upload/progress/{session_id}",
                json={
                    "progress": progress,
                    "message": message,
                    "status": status
                }
            )
            
            if response.status_code >= 400:
                logger.warning(f"Failed to update progress: {response.status_code}")
                
    except Exception as e:
        logger.error(f"Failed to send progress update: {e}")
        
        # Store in Redis as fallback
        try:
            if redis_client:
                redis_client.setex(
                    f"transcription_progress:{session_id}",
                    3600,
                    json.dumps({
                        "progress": progress,
                        "message": message,
                        "status": status,
                        "timestamp": datetime.now(SINGAPORE_TZ).isoformat()
                    })
                )
        except Exception as redis_err:
            logger.error(f"Failed to store progress in Redis: {redis_err}")

def map_speaker_names(transcript_result, speaker_names: List[str]):
    """Map numeric speaker labels to provided names"""
    if not speaker_names:
        return transcript_result
        
    logger.info(f"Mapping speaker names: {speaker_names}")
    
    # Create mapping from SPEAKER_X to user-provided names
    speaker_map = {}
    for i, name in enumerate(speaker_names):
        if name and name.strip():
            speaker_map[f"SPEAKER_{i}"] = name
    
    # Apply mapping to segments
    for segment in transcript_result["segments"]:
        if "speaker" in segment:
            speaker_label = segment["speaker"]
            segment["speaker_name"] = speaker_map.get(speaker_label, speaker_label)
    
    return transcript_result

def format_transcription_result(result, session_id: str, duration: float, speaker_names: List[str] = None):
    """Format the final transcription result"""
    try:
        language = result.get("language", "en")
        
        # Create diarized segments list
        diarized_segments = []
        if "segments" in result:
            for segment in result["segments"]:
                speaker = segment.get("speaker", "SPEAKER_0")
                speaker_name = segment.get("speaker_name", speaker)
                
                diarized_segments.append({
                    "speaker": speaker_name,
                    "start": segment["start"],
                    "end": segment["end"],
                    "text": segment["text"]
                })
        
        formatted_result = {
            "session_id": session_id,
            "language": language,
            "duration": duration,
            "segments": result.get("segments", []),
            "diarized_segments": diarized_segments,
            "word_segments": result.get("word_segments", []),
            "speaker_names": speaker_names,
            "timestamp": datetime.now(SINGAPORE_TZ).isoformat()
        }
        
        return formatted_result
        
    except Exception as e:
        logger.error(f"Error formatting transcription result: {e}")
        raise

def download_from_minio(object_name: str, destination_path: str) -> bool:
    """Download file from MinIO"""
    try:
        from minio import Minio
        
        minio_client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=False
        )
        
        os.makedirs(os.path.dirname(destination_path), exist_ok=True)
        minio_client.fget_object(MINIO_BUCKET, object_name, destination_path)
        logger.info(f"Downloaded {object_name} to {destination_path}")
        return True
        
    except Exception as e:
        logger.error(f"Error downloading from MinIO: {e}")
        return False

def cleanup_gpu_memory():
    """Clean up GPU memory"""
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        gc.collect()

def get_audio_duration(audio_path: str) -> float:
    """Get audio duration with fallback"""
    try:
        return librosa.get_duration(filename=audio_path)
    except Exception as e:
        logger.warning(f"Failed to get audio duration: {e}")
        return 0.0

def create_transcription_data(session_id: str, formatted_result: dict, participant_count: int, 
                             detected_language: str, duration: float, original_filename: str = None) -> dict:
    """Create transcription data for Redis storage"""
    # Try to get original creation time from upload session
    creation_time = None
    try:
        if redis_client:
            upload_session_data = redis_client.get(f"upload_session:{session_id}")
            if upload_session_data:
                session_info = json.loads(upload_session_data)
                creation_time = session_info.get("creation_time")
    except Exception as e:
        logger.warning(f"Could not get original creation time for {session_id}: {e}")
    
    # Use original creation time if available, otherwise current time
    timestamp = creation_time if creation_time else datetime.now(SINGAPORE_TZ).isoformat()
    completion_time = datetime.now(SINGAPORE_TZ).isoformat()
    
    return {
        "session_id": session_id,
        "filename": original_filename or "audio_file.wav",
        "status": "completed",
        "progress": 100,
        "transcriptData": formatted_result,
        "timestamp": timestamp,  # Original creation time
        "completed_at": completion_time,  # When transcription finished
        "duration": duration,
        "language": detected_language,
        "participantCount": participant_count,
        "diarizedSegments": formatted_result.get("diarized_segments", [])
    }

async def transcribe_with_whisperx(audio_path: str, session_id: str, language: str = None):
    """Transcribe audio using WhisperX following official documentation"""
    await send_progress_update(session_id, 70, "Transcribing audio...", "processing")
    
    # Load model following official WhisperX documentation - use cached model
    model = load_whisper_model("large-v3")
    
    # Load audio following official WhisperX documentation
    audio = whisperx.load_audio(audio_path)
    
    # Transcribe following official WhisperX documentation - force English for speed
    await send_progress_update(session_id, 75, "Transcribing audio...", "processing")
    result = model.transcribe(audio, batch_size=BATCH_SIZE, language="en")
    
    logger.info(f"Transcription completed with {len(result.get('segments', []))} segments")
    return result

async def align_transcription_segments(result: dict, detected_language: str, audio_path: str, session_id: str):
    """Align transcription for better timestamps following official WhisperX documentation"""
    await send_progress_update(session_id, 80, "Improving timestamps...", "processing")
    
    # Always use English alignment model for speed and reliability
    model_a, metadata = whisperx.load_align_model(language_code="en", device=DEVICE)
    
    if model_a and metadata:
        audio = whisperx.load_audio(audio_path)
        result = whisperx.align(result["segments"], model_a, metadata, audio, DEVICE, return_char_alignments=False)
    
    return result

async def perform_speaker_diarization(audio_path: str, participant_count: int, result: dict, 
                                    speaker_names: List[str], session_id: str):
    """Perform speaker diarization following official WhisperX documentation"""
    if participant_count > 1 and HF_TOKEN:
        await send_progress_update(session_id, 85, "Identifying speakers...", "processing")
        
        # Load diarization pipeline following official WhisperX documentation - use cached model
        diarize_model = load_diarization_model()
        
        # Load audio for diarization
        audio = whisperx.load_audio(audio_path)
        
        # Run diarization following official WhisperX documentation with improved parameters
        # Use user-specified speaker count, minimum 1 speaker
        min_speakers_param = min(max(participant_count, 1), MAX_SPEAKERS)
        max_speakers_param = min(max(participant_count, 1), MAX_SPEAKERS)
        diarize_segments = diarize_model(audio, min_speakers=min_speakers_param, max_speakers=max_speakers_param)
        
        # Assign speakers to words following official WhisperX documentation
        result = whisperx.assign_word_speakers(diarize_segments, result)
        
        # Map speaker names if provided
        if speaker_names:
            result = map_speaker_names(result, speaker_names)
    
    return result

async def transcribe_async(audio_path: str, session_id: str, participant_count: int, 
                          language: str = None, speaker_names: List[str] = None, original_filename: str = None):
    """Perform full transcription pipeline using WhisperX"""
    try:
        logger.info(f"Starting WhisperX transcription for session: {session_id}")
        
        # Clear GPU memory
        cleanup_gpu_memory()
        
        # Load WhisperX model
        await send_progress_update(session_id, 65, "Loading WhisperX model...", "processing")
        
        # Step 1: Transcribe - force English for speed
        result = await transcribe_with_whisperx(audio_path, session_id, "en")
        detected_language = "en"  # Always use English
        logger.info(f"Using language: {detected_language}")
        
        # Step 2: Align for better timestamps
        result = await align_transcription_segments(result, detected_language, audio_path, session_id)
        
        # Step 3: Speaker diarization (skip if only 1 participant for speed)
        if participant_count > 1:
            result = await perform_speaker_diarization(audio_path, participant_count, result, speaker_names, session_id)
        else:
            logger.info("Skipping speaker diarization (single participant)")
        
        # Get audio duration and format result
        await send_progress_update(session_id, 90, "Formatting results...", "processing")
        duration = get_audio_duration(audio_path)
        formatted_result = format_transcription_result(result, session_id, duration, speaker_names)
        
        # Store transcription result
        transcription_data = create_transcription_data(session_id, formatted_result, participant_count, 
                                                     detected_language, duration, original_filename)
        redis_client.setex(f"transcription:{session_id}", SESSION_EXPIRY, json.dumps(transcription_data))
        
        # Send to LLM service
        await send_to_llm_service(session_id, formatted_result)
        
        # Clean up GPU memory
        cleanup_gpu_memory()
        
        # Send completion update
        await send_progress_update(session_id, 100, "Transcription complete!", "completed")
        
        logger.info(f"Transcription completed for session: {session_id}")
        return formatted_result
        
    except Exception as e:
        await handle_transcription_error(session_id, e)
        raise


async def send_to_llm_service(session_id: str, formatted_result: dict):
    """Send transcription to LLM service"""
    await send_progress_update(session_id, 95, "Sending for analysis...", "processing")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{LLM_SERVICE_URL}/process-transcript",
                json=formatted_result
            )
            if response.status_code == 200:
                logger.info("Successfully sent to LLM service")
    except Exception as e:
        logger.error(f"Failed to send to LLM service: {e}")

async def handle_transcription_error(session_id: str, error: Exception):
    """Handle transcription errors"""
    logger.error(f"Transcription failed for {session_id}: {error}")
    
    error_message = str(error)
    if "CUDA out of memory" in error_message:
        error_message = "GPU memory insufficient"
    elif "HF_TOKEN" in error_message:
        error_message = "HuggingFace token required"
    
    await send_progress_update(session_id, 0, f"Failed: {error_message}", "error")
    
    # Store error
    redis_client.setex(
        f"transcription_error:{session_id}",
        SESSION_EXPIRY,
        json.dumps({
            "session_id": session_id,
            "error": error_message,
            "timestamp": datetime.now(SINGAPORE_TZ).isoformat()
        })
    )
    
    cleanup_gpu_memory()

def is_media_file(filename: str) -> bool:
    """Check if file is a supported media file"""
    media_extensions = ['.mp3', '.wav', '.m4a', '.flac', '.aac', '.mp4', '.avi', '.mov', '.mkv', '.webm']
    return any(ext in filename.lower() for ext in media_extensions) if filename else False

def get_metadata_from_redis(session_id: str) -> tuple:
    """Get metadata from Redis"""
    try:
        metadata_raw = redis_client.get(f"upload_metadata:{session_id}")
        if metadata_raw:
            metadata = json.loads(metadata_raw)
            participant_count = metadata.get("participant_count", 2)
            speaker_names = metadata.get("speaker_names")
            return participant_count, speaker_names
    except Exception as e:
        logger.error(f"Error getting metadata: {e}")
    
    return 2, None

def process_upload_message(ch, method, properties, body):
    """Process message from RabbitMQ"""
    try:
        message = json.loads(body)
        logger.info(f"Received message: {message}")
        
        session_id = message.get("session_id")
        object_name = message.get("object_name")
        original_filename = message.get("original_filename")
        
        if not session_id or not object_name:
            logger.error("Invalid message: missing session_id or object_name")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return
        
        # Check if media file
        if is_media_file(original_filename):
            logger.info(f"Processing media file: {original_filename}")
            
            # Create download path - use original filename
            os.makedirs(TEMP_DIR, exist_ok=True)
            download_path = os.path.join(TEMP_DIR, original_filename)
            
            # Download file
            if not download_from_minio(object_name, download_path):
                logger.error(f"Failed to download {object_name}")
                ch.basic_ack(delivery_tag=method.delivery_tag)
                return
            
            # Get metadata
            participant_count, speaker_names = get_metadata_from_redis(session_id)
            
            # Start transcription
            try:
                asyncio.run(transcribe_async(download_path, session_id, participant_count, None, speaker_names, original_filename))
                logger.info(f"Transcription completed: {session_id}")
                
                # Clean up
                try:
                    os.unlink(download_path)
                except OSError:
                    pass
                    
            except Exception as e:
                logger.error(f"Error transcribing {session_id}: {e}")
                asyncio.run(send_progress_update(session_id, 0, f"Transcription failed: {str(e)}", "error"))
        else:
            logger.warning(f"Unsupported file type: {original_filename}")
        
        ch.basic_ack(delivery_tag=method.delivery_tag)
        
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        # Set status to error when message processing fails
        try:
            data = json.loads(body)
            session_id = data.get("session_id")
            if session_id:
                asyncio.run(send_progress_update(session_id, 0, f"Processing failed: {str(e)}", "error"))
        except Exception as parse_error:
            logger.error(f"Could not parse message body for error reporting: {parse_error}")
        ch.basic_ack(delivery_tag=method.delivery_tag)

def start_rabbitmq_consumer():
    """Start RabbitMQ consumer"""
    try:
        credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
        parameters = pika.ConnectionParameters(
            host=RABBITMQ_HOST,
            port=RABBITMQ_PORT,
            credentials=credentials,
            heartbeat=600,
            blocked_connection_timeout=300
        )
        
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()
        
        channel.queue_declare(queue=TRANSCRIPTION_QUEUE, durable=True)
        channel.basic_qos(prefetch_count=1)
        
        channel.basic_consume(
            queue=TRANSCRIPTION_QUEUE,
            on_message_callback=process_upload_message
        )
        
        logger.info(f"Started RabbitMQ consumer on {TRANSCRIPTION_QUEUE}")
        channel.start_consuming()
        
    except Exception as e:
        logger.error(f"Error starting RabbitMQ consumer: {e}")

def start_cleanup_task():
    """Start background task to clean up stuck processing states"""
    import time
    
    while True:
        try:
            # Check for stuck processing states every 5 minutes
            cleanup_stuck_sessions()
            time.sleep(300)  # 5 minutes
        except Exception as e:
            logger.error(f"Error in cleanup task: {e}")
            time.sleep(60)  # Wait 1 minute before retrying

def cleanup_stuck_sessions():
    """Clean up sessions that have been processing for too long"""
    if not redis_client:
        return
        
    try:
        # Find all transcription progress keys
        progress_keys = redis_client.keys("transcription_progress:*")
        current_time = datetime.now(timezone.utc)
        
        for key in progress_keys:
            try:
                progress_data = redis_client.get(key)
                if progress_data:
                    progress_info = json.loads(progress_data)
                    
                    # Check if status is "processing"
                    if progress_info.get("status") == "processing":
                        timestamp_str = progress_info.get("timestamp", "")
                        if not timestamp_str:
                            continue
                        
                        try:
                            timestamp = datetime.fromisoformat(timestamp_str)
                            if timestamp.tzinfo is None:
                                timestamp = timestamp.replace(tzinfo=timezone.utc)
                            
                            time_diff = (current_time - timestamp).total_seconds()
                            
                            if time_diff > 1800:  # 30 minutes
                                session_id = key.split(":")[-1]
                                
                                # Check if transcription was actually completed successfully
                                transcription_data = redis_client.get(f"transcription:{session_id}")
                                if transcription_data:
                                    try:
                                        transcription = json.loads(transcription_data)
                                        if transcription.get("status") == "completed":
                                            logger.info(f"Session {session_id} is actually completed, skipping cleanup")
                                            # Clean up the old progress key but don't mark as error
                                            redis_client.delete(key)
                                            continue
                                    except json.JSONDecodeError:
                                        logger.warning(f"Invalid transcription data for session {session_id}")
                                
                                logger.warning(f"Found stuck processing session: {session_id}")
                                
                                # Set status to error only if not completed
                                asyncio.run(send_progress_update(
                                    session_id, 
                                    0, 
                                    "Processing timed out", 
                                    "error"
                                ))
                        except ValueError:
                            logger.error(f"Invalid timestamp in key {key}")
                            
            except Exception as e:
                logger.error(f"Error checking progress key {key}: {e}")
                
    except Exception as e:
        logger.error(f"Error in cleanup_stuck_sessions: {e}")


# Store running tasks to prevent garbage collection
running_tasks = set()

# API Routes
@app.post("/transcribe")
async def transcribe_audio_endpoint(
    audio: UploadFile = File(...),
    session_id: str = Form(...),
    participant_count: int = Form(2),
    language: Optional[str] = Form(None),
    speaker_names: Optional[str] = Form(None)
):
    """Transcribe uploaded audio file"""
    
    # Validate file type
    if not audio.content_type or not (audio.content_type.startswith('audio/') or audio.content_type.startswith('video/')):
        raise HTTPException(status_code=400, detail="Invalid audio or video file type")
    
    # Check if already processing
    processing_key = f"transcribing:{session_id}"
    if redis_client.get(processing_key):
        raise HTTPException(status_code=409, detail="Already being transcribed")
    
    # Mark as processing
    redis_client.setex(processing_key, 3600, "transcribing")
    
    try:
        # Parse speaker names
        parsed_speaker_names = None
        if speaker_names:
            try:
                parsed_speaker_names = json.loads(speaker_names)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse speaker names: {speaker_names}")
        
        # Save uploaded file - keep exact original filename
        temp_audio_path = f"{TEMP_DIR}/{audio.filename}"
        os.makedirs(TEMP_DIR, exist_ok=True)
        
        with open(temp_audio_path, "wb") as temp_file:
            content = await audio.read()
            temp_file.write(content)
        
        # Start transcription
        transcription_task = asyncio.create_task(
            transcribe_async(
                temp_audio_path,
                session_id,
                participant_count,
                language,
                parsed_speaker_names,
                audio.filename
            )
        )
        running_tasks.add(transcription_task)
        transcription_task.add_done_callback(running_tasks.discard)
        
        # Schedule cleanup
        async def delayed_cleanup():
            await asyncio.sleep(3600)
            try:
                os.unlink(temp_audio_path)
            except OSError:
                pass
        
        cleanup_task = asyncio.create_task(delayed_cleanup())
        running_tasks.add(cleanup_task)
        cleanup_task.add_done_callback(running_tasks.discard)

        return {
            "message": "Transcription started",
            "session_id": session_id,
            "status": "processing"
        }
        
    except Exception as e:
        redis_client.delete(processing_key)
        raise HTTPException(status_code=500, detail=f"Failed to start transcription: {str(e)}")

@app.get("/transcription/{session_id}")
async def get_transcription(session_id: str):
    """Get transcription result"""
    try:
        # Check for error
        error_data = redis_client.get(f"transcription_error:{session_id}")
        if error_data:
            error = json.loads(error_data)
            return {
                "status": "error",
                "error": error.get("error", "Unknown error"),
                "timestamp": error.get("timestamp")
            }
        
        # Check for result
        data = redis_client.get(f"transcription:{session_id}")
        if not data:
            if redis_client.get(f"transcribing:{session_id}"):
                return {
                    "status": "processing",
                    "message": "Transcription in progress"
                }
            else:
                raise HTTPException(status_code=404, detail="Transcription not found")
        
        result = json.loads(data)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving transcription: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve transcription")

def update_transcription_speakers(transcription: dict, speaker_map: dict):
    """Update speaker names in transcription data"""
    # Update speaker names in transcriptData
    if "transcriptData" in transcription and "segments" in transcription["transcriptData"]:
        for segment in transcription["transcriptData"]["segments"]:
            speaker = segment.get("speaker")
            if speaker and speaker in speaker_map:
                segment["speaker_name"] = speaker_map[speaker]
    
    # Update diarized segments
    if "diarizedSegments" in transcription:
        for segment in transcription["diarizedSegments"]:
            speaker = segment.get("speaker")
            if speaker and speaker in speaker_map:
                segment["speaker"] = speaker_map[speaker]

@app.post("/transcription/{session_id}/speakers")
async def update_speaker_names(session_id: str, request: SpeakerUpdateRequest):
    """Update speaker names in transcription"""
    try:
        data = redis_client.get(f"transcription:{session_id}")
        if not data:
            raise HTTPException(status_code=404, detail="Transcription not found")
            
        transcription = json.loads(data)
        
        # Update speaker names
        update_transcription_speakers(transcription, request.speaker_map)
        
        # Store updated transcription
        redis_client.setex(
            f"transcription:{session_id}",
            SESSION_EXPIRY,
            json.dumps(transcription)
        )
        
        logger.info(f"Updated speaker names for {session_id}: {request.speaker_map}")
        
        return {"status": "success", "message": "Speaker names updated"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating speaker names: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update speaker names: {str(e)}")


@app.post("/retry/{session_id}")
async def retry_transcription(session_id: str):
    """Retry failed transcription"""
    try:
        # Check for error
        error_data = redis_client.get(f"transcription_error:{session_id}")
        if not error_data:
            raise HTTPException(status_code=404, detail="No failed transcription found")
        
        # Check if already processing
        processing_key = f"transcribing:{session_id}"
        if redis_client.get(processing_key):
            raise HTTPException(status_code=409, detail="Already being transcribed")
        
        # Clear error state and set to processing
        redis_client.delete(f"transcription_error:{session_id}")
        redis_client.setex(processing_key, 3600, "retrying")
        
        # Send progress update
        await send_progress_update(session_id, 5, "Retrying transcription...", "processing")
        
        return {"status": "success", "message": "Retry initiated", "session_id": session_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrying transcription: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retry transcription: {str(e)}")

@app.delete("/remove/{session_id}")
async def remove_transcription(session_id: str):
    """Remove transcription session"""
    try:
        # Check if exists
        data = redis_client.get(f"transcription:{session_id}")
        error_data = redis_client.get(f"transcription_error:{session_id}")
        
        if not data and not error_data:
            raise HTTPException(status_code=404, detail="Transcription not found")
        
        # Remove from Redis
        keys_to_remove = [
            f"transcription:{session_id}",
            f"transcription_error:{session_id}",
            f"transcribing:{session_id}",
            f"transcription_progress:{session_id}"
        ]
        
        for key in keys_to_remove:
            redis_client.delete(key)
        
        return {"status": "success", "message": "Transcription removed", "session_id": session_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing transcription: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove transcription: {str(e)}")

@app.get("/health")
def health():
    """Simple health check - always returns ok to prevent pod restarts during processing"""
    return {
        "status": "ok",
        "service": "whisper-transcriber",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.on_event("startup")
async def startup_event():
    """Startup event - preload models and start consumer"""
    try:
        logger.info("🚀 Preloading WhisperX model...")
        whisper_model = load_whisper_model()
        logger.info("✅ WhisperX model preloaded successfully")
    except Exception as e:
        logger.error(f"❌ Failed to preload WhisperX model: {e}")
        raise
    
    # Start RabbitMQ consumer
    consumer_thread = threading.Thread(target=start_rabbitmq_consumer, daemon=True)
    consumer_thread.start()
    logger.info("Started RabbitMQ consumer thread")
    
    # Start cleanup task for stuck processing states
    cleanup_thread = threading.Thread(target=start_cleanup_task, daemon=True)
    cleanup_thread.start()
    logger.info("Started cleanup task for stuck processing states")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)