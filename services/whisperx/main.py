import os
import gc
import json
import torch
import asyncio
import whisperx
import tempfile
import threading
import redis
import httpx
import logging
import pika
import librosa
import psutil
import asyncpg
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Union, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("whisperx")

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

# Configuration
DEVICE = os.environ.get("DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
COMPUTE_TYPE = os.environ.get("COMPUTE_TYPE", "float16")
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "16"))
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

def load_pyannote_vad_model():
    """Load pyannote VAD model from HuggingFace"""
    if not HF_TOKEN:
        raise ValueError("HF_TOKEN is required for pyannote VAD model")
    
    try:
        from pyannote.audio import Pipeline
        
        logger.info("📥 Loading pyannote/voice-activity-detection model...")
        
        # Load the VAD pipeline
        vad_pipeline = Pipeline.from_pretrained(
            "pyannote/voice-activity-detection",
            use_auth_token=HF_TOKEN
        )
        
        # Move to device
        if torch.cuda.is_available() and DEVICE != "cpu":
            vad_pipeline = vad_pipeline.to(torch.device(DEVICE))
        
        logger.info("✅ pyannote VAD model loaded successfully")
        return vad_pipeline
        
    except Exception as e:
        logger.error(f"❌ Failed to load pyannote VAD model: {e}")
        raise

def load_whisper_model(model_name="large-v3"):
    """Load WhisperX model (VAD is applied separately)"""
    if "whisper" not in models:
        logger.info(f"Loading WhisperX model: {model_name} on {DEVICE}")
        
        # Load pyannote VAD model separately
        vad_model = load_pyannote_vad_model()
        models["vad_model"] = vad_model
        
        # Load WhisperX model WITHOUT built-in VAD (we use separate pyannote VAD)
        models["whisper"] = whisperx.load_model(
            model_name,
            device=DEVICE,
            compute_type=COMPUTE_TYPE
        )
        
        logger.info("✅ WhisperX model loaded with separate VAD model")
                
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
        try:
            logger.info("Loading diarization model")
            models["diarization"] = whisperx.DiarizationPipeline(
                use_auth_token=HF_TOKEN,
                device=DEVICE
            )
            logger.info("✅ Diarization model loaded")
        except Exception as e:
            logger.error(f"Failed to load diarization model: {e}")
            raise
            
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
                             detected_language: str, duration: float) -> dict:
    """Create transcription data for Redis storage"""
    return {
        "session_id": session_id,
        "id": session_id,
        "sessionId": session_id,
        "filename": "audio_file.wav",
        "fileSize": 0,
        "mimeType": DEFAULT_AUDIO_TYPE,
        "participantCount": participant_count,
        "status": "completed",
        "sessionStatus": "completed",
        "progress": 100,
        "hasTranscript": True,
        "transcriptData": formatted_result,
        "createdAt": datetime.now(SINGAPORE_TZ).isoformat(),
        "completedAt": datetime.now(SINGAPORE_TZ).isoformat(),
        "duration": duration,
        "segmentCount": len(formatted_result.get("diarized_segments", [])),
        "language": detected_language,
        "speakers": {seg.get("speaker", "SPEAKER_0") for seg in formatted_result.get("diarized_segments", [])},
        "diarizedSegments": formatted_result.get("diarized_segments", []),
        "user_id": None,
        "content_type": DEFAULT_AUDIO_TYPE,
        "file_size": 0,
        "speaker_count": participant_count,
        "transcript": formatted_result.get("segments", []),
        "created_at": datetime.now(SINGAPORE_TZ).isoformat(),
        "completed_at": datetime.now(SINGAPORE_TZ).isoformat()
    }

async def transcribe_with_whisperx(audio_path: str, session_id: str, language: str = None):
    """Transcribe audio using WhisperX with separate pyannote VAD for better accuracy"""
    await send_progress_update(session_id, 70, "Transcribing audio...", "processing")
    
    # Load models
    whisper_model = load_whisper_model()
    vad_model = models.get("vad_model")
    
    # Load audio
    audio = whisperx.load_audio(audio_path)
    
    # Apply separate VAD preprocessing for better accuracy
    if vad_model:
        try:
            await send_progress_update(session_id, 72, "Applying VAD preprocessing...", "processing")
            
            # Create audio format compatible with pyannote
            from pyannote.core import Segment
            import torch
            
            # Convert to pyannote format
            waveform = torch.tensor(audio).unsqueeze(0)
            audio_in_memory = {"waveform": waveform, "sample_rate": 16000}
            
            # Apply VAD to get speech segments
            vad_segments = vad_model(audio_in_memory)
            
            # Convert to list of speech segments
            speech_segments = []
            for segment in vad_segments.get_timeline():
                speech_segments.append({
                    "start": segment.start,
                    "end": segment.end
                })
            
            logger.info(f"VAD detected {len(speech_segments)} speech segments")
            
            # Only transcribe speech segments for better accuracy
            if speech_segments:
                await send_progress_update(session_id, 75, "Transcribing speech segments...", "processing")
                
                all_results = []
                for i, segment in enumerate(speech_segments):
                    # Extract audio segment
                    start_sample = int(segment["start"] * 16000)
                    end_sample = int(segment["end"] * 16000)
                    segment_audio = audio[start_sample:end_sample]
                    
                    # Only process segments longer than 0.1 seconds
                    if len(segment_audio) > 1600:  # 0.1 seconds at 16kHz
                        segment_result = whisper_model.transcribe(
                            segment_audio, 
                            batch_size=BATCH_SIZE, 
                            language=language
                        )
                        
                        # Adjust timestamps to global timeline
                        for seg in segment_result.get("segments", []):
                            seg["start"] += segment["start"]
                            seg["end"] += segment["start"]
                        
                        all_results.extend(segment_result.get("segments", []))
                
                # Return combined results
                result = {
                    "segments": all_results,
                    "language": language or "en"
                }
                logger.info(f"VAD-optimized transcription completed with {len(all_results)} segments")
                return result
            
        except Exception as e:
            logger.warning(f"VAD preprocessing failed, using standard transcription: {e}")
    
    # Fallback to standard transcription if VAD fails or no speech detected
    await send_progress_update(session_id, 75, "Transcribing audio (standard)...", "processing")
    result = whisper_model.transcribe(audio, batch_size=BATCH_SIZE, language=language)
    return result

async def align_transcription_segments(result: dict, detected_language: str, audio_path: str, session_id: str):
    """Align transcription for better timestamps"""
    await send_progress_update(session_id, 80, "Improving timestamps...", "processing")
    model_a, metadata = load_alignment_model(detected_language)
    
    if model_a and metadata:
        audio = whisperx.load_audio(audio_path)
        result = whisperx.align(result["segments"], model_a, metadata, audio, device=DEVICE)
    
    return result

async def perform_speaker_diarization(audio_path: str, participant_count: int, result: dict, 
                                    speaker_names: List[str], session_id: str):
    """Perform speaker diarization if multiple participants"""
    if participant_count > 1:
        await send_progress_update(session_id, 85, "Identifying speakers...", "processing")
        diarization_model = load_diarization_model()
        
        # Run diarization
        diarize_segments = diarization_model(audio_path, min_speakers=1, max_speakers=participant_count)
        
        # Assign speakers to words
        result = whisperx.assign_word_speakers(diarize_segments, result)
        
        # Map speaker names if provided
        if speaker_names:
            result = map_speaker_names(result, speaker_names)
    
    return result

async def transcribe_async(audio_path: str, session_id: str, participant_count: int, 
                          language: str = None, speaker_names: List[str] = None):
    """Perform full transcription pipeline using WhisperX"""
    try:
        logger.info(f"Starting WhisperX transcription for session: {session_id}")
        
        # Clear GPU memory
        cleanup_gpu_memory()
        
        # Load WhisperX model
        await send_progress_update(session_id, 65, "Loading WhisperX model...", "processing")
        
        # Step 1: Transcribe
        result = await transcribe_with_whisperx(audio_path, session_id, language)
        detected_language = result.get("language", language or "en")
        logger.info(f"Detected language: {detected_language}")
        
        # Step 2: Align for better timestamps
        result = await align_transcription_segments(result, detected_language, audio_path, session_id)
        
        # Step 3: Speaker diarization
        result = await perform_speaker_diarization(audio_path, participant_count, result, speaker_names, session_id)
        
        # Get audio duration and format result
        await send_progress_update(session_id, 90, "Formatting results...", "processing")
        duration = get_audio_duration(audio_path)
        formatted_result = format_transcription_result(result, session_id, duration, speaker_names)
        
        # Store in Redis
        transcription_data = create_transcription_data(session_id, formatted_result, participant_count, 
                                                     detected_language, duration)
        
        # Try to get upload metadata
        await update_with_upload_metadata(session_id, transcription_data)
        
        # Store transcription result
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

async def update_with_upload_metadata(session_id: str, transcription_data: dict):
    """Update transcription data with upload metadata"""
    try:
        metadata_keys = [
            f"upload_session:{session_id}",
            f"upload_metadata:{session_id}",
            f"processing_metadata:{session_id}",
            f"session_metadata:{session_id}"
        ]
        
        for key in metadata_keys:
            upload_data_raw = redis_client.get(key)
            if upload_data_raw:
                upload_data = json.loads(upload_data_raw)
                transcription_data.update({
                    "filename": upload_data.get("filename", "audio_file.wav"),
                    "fileSize": upload_data.get("file_size", 0),
                    "file_size": upload_data.get("file_size", 0),
                    "mimeType": upload_data.get("content_type", DEFAULT_AUDIO_TYPE),
                    "content_type": upload_data.get("content_type", DEFAULT_AUDIO_TYPE),
                    "user_id": upload_data.get("user_id")
                })
                break
    except Exception as e:
        logger.warning(f"Could not retrieve upload metadata: {e}")

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
    logger.error(f"Error in transcription pipeline: {error}")
    
    error_message = str(error)
    if "CUDA out of memory" in error_message:
        error_message = "GPU memory insufficient. Try with a smaller file."
    elif "HF_TOKEN" in error_message:
        error_message = "HuggingFace token required for VAD and diarization models."
    
    await send_progress_update(session_id, 0, f"Transcription failed: {error_message}", "error")
    
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
    
    # Clean up memory
    cleanup_gpu_memory()

def is_media_file(filename: str) -> bool:
    """Check if file is a supported media file"""
    media_extensions = ['.mp3', '.wav', '.m4a', '.flac', '.aac', '.mp4', '.avi', '.mov', '.mkv', '.webm']
    return any(ext in filename.lower() for ext in media_extensions) if filename else False

def get_metadata_from_redis(session_id: str) -> tuple:
    """Get metadata from Redis"""
    metadata_keys = [
        f"upload_metadata:{session_id}",
        f"processing_metadata:{session_id}",
        f"session_metadata:{session_id}"
    ]
    
    for key in metadata_keys:
        try:
            metadata_raw = redis_client.get(key)
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
            
            # Create download path
            os.makedirs(TEMP_DIR, exist_ok=True)
            download_path = os.path.join(TEMP_DIR, f"{session_id}_{original_filename}")
            
            # Download file
            if not download_from_minio(object_name, download_path):
                logger.error(f"Failed to download {object_name}")
                ch.basic_ack(delivery_tag=method.delivery_tag)
                return
            
            # Get metadata
            participant_count, speaker_names = get_metadata_from_redis(session_id)
            
            # Start transcription
            try:
                asyncio.run(transcribe_async(download_path, session_id, participant_count, None, speaker_names))
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
        
        # Save uploaded file
        temp_audio_path = f"{TEMP_DIR}/{session_id}_{audio.filename}"
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
                parsed_speaker_names
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

async def get_original_file_info(session_id: str) -> tuple:
    """Get original file information for retry operations"""
    try:
        # Try to find file info from various Redis keys
        metadata_keys = [
            f"upload_session:{session_id}",
            f"upload_metadata:{session_id}",
            f"processing_metadata:{session_id}",
            f"session_metadata:{session_id}",
            f"transcription:{session_id}"
        ]
        
        for key in metadata_keys:
            data_raw = redis_client.get(key)
            if data_raw:
                data = json.loads(data_raw)
                object_name = data.get("object_name")
                filename = data.get("filename") or data.get("original_filename")
                participant_count = data.get("participant_count") or data.get("participantCount", 2)
                speaker_names = data.get("speaker_names")
                
                if object_name and filename:
                    return object_name, filename, participant_count, speaker_names
                    
        return None, None, 2, None
    except Exception as e:
        logger.error(f"Error getting original file info: {e}")
        return None, None, 2, None

async def cleanup_all_session_data(session_id: str) -> list:
    """Comprehensive cleanup of all session-related data"""
    removed_items = []
    
    # Extended Redis keys list - covers all possible patterns
    redis_keys = [
        f"transcription:{session_id}",
        f"transcription_error:{session_id}",
        f"transcribing:{session_id}",
        f"transcription_progress:{session_id}",
        f"upload_session:{session_id}",
        f"upload_progress:{session_id}",
        f"upload_metadata:{session_id}",
        f"processing_metadata:{session_id}",
        f"session_metadata:{session_id}",
        f"progress_state:{session_id}",
        f"llm_analysis:{session_id}",
        f"transcript_edits:{session_id}",
        f"speaker_mapping:{session_id}"
    ]
    
    # Remove from Redis
    redis_removed = 0
    if redis_client:
        for key in redis_keys:
            try:
                if redis_client.delete(key):
                    redis_removed += 1
            except Exception as e:
                logger.warning(f"Failed to delete Redis key {key}: {e}")
    else:
        logger.warning("Redis client is None, skipping Redis cleanup")
    
    if redis_removed > 0:
        removed_items.append(f"Redis: {redis_removed} keys")
    
    # Remove from MinIO with actual file patterns used in the codebase
    try:
        from minio import Minio
        from minio.error import S3Error
        
        minio_client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=False
        )
        
        minio_removed = 0
        
        # 1. Remove main session directory (contains uploaded files)
        # Pattern: {session_id}/{filename}
        try:
            objects = list(minio_client.list_objects(MINIO_BUCKET, prefix=f"{session_id}/", recursive=True))
            for obj in objects:
                minio_client.remove_object(MINIO_BUCKET, obj.object_name)
                minio_removed += 1
                removed_items.append(f"MinIO: {obj.object_name}")
        except Exception as e:
            logger.warning(f"Error removing session directory {session_id}/: {e}")
        
        # 2. Remove transcript edits
        # Pattern: transcript_edits/{session_id}/
        try:
            objects = list(minio_client.list_objects(MINIO_BUCKET, prefix=f"transcript_edits/{session_id}/", recursive=True))
            for obj in objects:
                minio_client.remove_object(MINIO_BUCKET, obj.object_name)
                minio_removed += 1
                removed_items.append(f"MinIO: {obj.object_name}")
        except Exception as e:
            logger.warning(f"Error removing transcript edits transcript_edits/{session_id}/: {e}")
        
        # 3. Remove any orphaned multipart upload parts
        # Pattern: {session_id}/{filename}.part{number}
        try:
            objects = list(minio_client.list_objects(MINIO_BUCKET, prefix=f"{session_id}/"))
            for obj in objects:
                if ".part" in obj.object_name:  # Multipart upload parts
                    minio_client.remove_object(MINIO_BUCKET, obj.object_name)
                    minio_removed += 1
                    removed_items.append(f"MinIO: {obj.object_name}")
        except Exception as e:
            logger.warning(f"Error removing multipart parts for {session_id}: {e}")
        
        if minio_removed > 0 and not any("MinIO:" in item for item in removed_items):
            removed_items.append(f"MinIO: {minio_removed} files")
                    
    except Exception as e:
        logger.warning(f"Error accessing MinIO for cleanup: {e}")
    
    return removed_items

async def update_transcription_status(session_id: str, status: str, message: str = "", 
                                    progress: float = 0, error: str = None):
    """Update transcription status across all relevant systems"""
    try:
        # Update in Redis
        status_data = {
            "session_id": session_id,
            "status": status,
            "message": message,
            "progress": progress,
            "timestamp": datetime.now(SINGAPORE_TZ).isoformat()
        }
        
        if error:
            status_data["error"] = error
        
        # Update transcription entry if it exists
        transcription_data = redis_client.get(f"transcription:{session_id}")
        if transcription_data:
            transcription = json.loads(transcription_data)
            transcription.update({
                "status": status,
                "sessionStatus": status,
                "progress": progress,
                "updated_at": datetime.now(SINGAPORE_TZ).isoformat()
            })
            
            if error:
                transcription["error"] = error
                
            redis_client.setex(
                f"transcription:{session_id}",
                SESSION_EXPIRY,
                json.dumps(transcription)
            )
        
        # Send progress update to file uploader
        await send_progress_update(session_id, progress, message, status)
        
        logger.info(f"Updated status for {session_id}: {status} - {message}")
        
        # Update in PostgreSQL
        await update_session_status_in_db(session_id, status, progress)
        
    except Exception as e:
        logger.error(f"Failed to update transcription status: {e}")

async def get_db_connection():
    """Get PostgreSQL database connection"""
    try:
        return await asyncpg.connect(DATABASE_URL)
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL: {e}")
        return None

async def update_session_status_in_db(session_id: str, status: str, progress: int = 0):
    """Update session status in PostgreSQL"""
    if not DATABASE_URL:
        logger.warning("DATABASE_URL not configured, skipping PostgreSQL update")
        return
    
    conn = await get_db_connection()
    if not conn:
        return
    
    try:
        await conn.execute("""
            UPDATE sessions 
            SET status = $1, progress = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3::uuid
        """, status, progress, session_id)
        
        # Also update files table if exists
        await conn.execute("""
            UPDATE files 
            SET processing_status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE session_id = $2::uuid
        """, status, session_id)
        
        logger.info(f"Updated PostgreSQL session {session_id} status to {status}")
        
    except Exception as e:
        logger.error(f"Failed to update session status in PostgreSQL: {e}")
    finally:
        await conn.close()

async def log_processing_event_in_db(session_id: str, stage: str, status: str, 
                                   message: str = None, error_details: dict = None):
    """Log processing event to PostgreSQL"""
    if not DATABASE_URL:
        return
    
    conn = await get_db_connection()
    if not conn:
        return
    
    try:
        # Find file_id from session_id
        file_id = await conn.fetchval("""
            SELECT f.id FROM files f 
            JOIN sessions s ON s.id = f.session_id 
            WHERE s.id = $1::uuid
        """, session_id)
        
        if file_id:
            await conn.execute("""
                INSERT INTO processing_logs (file_id, stage, status, message, error_details)
                VALUES ($1, $2, $3, $4, $5)
            """, file_id, stage, status, message, error_details)
            
            logger.info(f"Logged processing event for session {session_id}: {stage} - {status}")
        
    except Exception as e:
        logger.error(f"Failed to log processing event in PostgreSQL: {e}")
    finally:
        await conn.close()

async def delete_session_from_db(session_id: str) -> bool:
    """Delete session and related data from PostgreSQL"""
    if not DATABASE_URL:
        logger.warning("DATABASE_URL not configured, skipping PostgreSQL deletion")
        return False
    
    conn = await get_db_connection()
    if not conn:
        return False
    
    try:
        # Start transaction
        async with conn.transaction():
            # Delete processing logs first (due to foreign key)
            logs_deleted = await conn.fetchval("""
                DELETE FROM processing_logs 
                WHERE file_id IN (
                    SELECT f.id FROM files f 
                    WHERE f.session_id = $1::uuid
                )
                RETURNING count(*)
            """, session_id)
            
            # Delete files
            files_deleted = await conn.fetchval("""
                DELETE FROM files WHERE session_id = $1::uuid
                RETURNING count(*)
            """, session_id)
            
            # Delete session
            sessions_deleted = await conn.fetchval("""
                DELETE FROM sessions WHERE id = $1::uuid
                RETURNING count(*)
            """, session_id)
        
        logger.info(f"Deleted from PostgreSQL - Sessions: {sessions_deleted}, Files: {files_deleted}, Logs: {logs_deleted}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to delete session from PostgreSQL: {e}")
        return False
    finally:
        await conn.close()

@app.post("/retry/{session_id}")
async def retry_transcription(session_id: str):
    """Retry failed transcription with comprehensive recovery"""
    try:
        logger.info(f"Starting retry process for session: {session_id}")
        
        # Check for error state
        error_key = f"transcription_error:{session_id}"
        error_data = redis_client.get(error_key)
        if not error_data:
            raise HTTPException(status_code=404, detail="No failed transcription found")
        
        # Check if currently processing
        processing_key = f"transcribing:{session_id}"
        if redis_client.get(processing_key):
            raise HTTPException(status_code=409, detail="Transcription already in progress")
        
        # Get original file information
        object_name, filename, participant_count, speaker_names = await get_original_file_info(session_id)
        
        if not object_name or not filename:
            logger.error(f"Cannot retry - missing file information for session {session_id}")
            raise HTTPException(
                status_code=400, 
                detail="Cannot retry: Original file information not found. File may have been deleted."
            )
        
        # Clear error state and reset status
        redis_client.delete(error_key)
        await update_transcription_status(session_id, "processing", "Retrying transcription...", 5)
        
        # Log retry attempt in PostgreSQL
        retry_reason = json.loads(error_data).get("error", "Unknown error")
        await log_processing_event_in_db(
            session_id, 
            "retry_attempt", 
            "started", 
            f"Retrying failed transcription. Original error: {retry_reason}"
        )
        
        # Mark as processing
        redis_client.setex(processing_key, 3600, "transcribing")
        
        # Create comprehensive retry message for RabbitMQ
        retry_message = {
            "session_id": session_id,
            "object_name": object_name,
            "original_filename": filename,
            "participant_count": participant_count,
            "speaker_names": speaker_names,
            "retry": True,
            "retry_timestamp": datetime.now(SINGAPORE_TZ).isoformat(),
            "retry_reason": retry_reason
        }
        
        # Send retry message to RabbitMQ
        try:
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(
                    host=RABBITMQ_HOST,
                    port=RABBITMQ_PORT,
                    credentials=pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS),
                    heartbeat=600,
                    blocked_connection_timeout=300
                )
            )
            channel = connection.channel()
            channel.queue_declare(queue=TRANSCRIPTION_QUEUE, durable=True)
            
            channel.basic_publish(
                exchange='',
                routing_key=TRANSCRIPTION_QUEUE,
                body=json.dumps(retry_message),
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Persistent message
                    headers={"retry": "true", "session_id": session_id}
                )
            )
            connection.close()
            
            logger.info(f"Retry message queued successfully for session: {session_id}")
            
            # Update status to indicate queued for processing
            await update_transcription_status(
                session_id, 
                "processing", 
                "Retry queued for processing...", 
                10
            )
            
            # Log successful queue
            await log_processing_event_in_db(
                session_id, 
                "retry_queue", 
                "success", 
                "Retry message queued successfully"
            )
            
        except Exception as e:
            logger.error(f"Failed to queue retry message: {e}")
            # Clean up processing state on queue failure
            redis_client.delete(processing_key)
            await update_transcription_status(
                session_id, 
                "error", 
                f"Failed to queue retry: {str(e)}", 
                0,
                str(e)
            )
            
            # Log queue failure
            await log_processing_event_in_db(
                session_id, 
                "retry_queue", 
                "failed", 
                f"Failed to queue retry: {str(e)}",
                {"error": str(e), "retry_reason": retry_reason}
            )
            
            raise HTTPException(status_code=500, detail="Failed to queue retry request")
        
        return {
            "status": "success", 
            "message": "Retry initiated successfully", 
            "session_id": session_id,
            "file_info": {
                "object_name": object_name,
                "filename": filename,
                "participant_count": participant_count
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrying transcription for {session_id}: {e}")
        await update_transcription_status(
            session_id, 
            "error", 
            f"Retry failed: {str(e)}", 
            0,
            str(e)
        )
        
        # Log general retry failure
        await log_processing_event_in_db(
            session_id, 
            "retry_attempt", 
            "failed", 
            f"Retry failed: {str(e)}",
            {"error": str(e)}
        )
        
        raise HTTPException(status_code=500, detail=f"Failed to retry transcription: {str(e)}")

@app.delete("/remove/{session_id}")
async def remove_transcription(session_id: str):
    """Simple remove endpoint - check MinIO first, then clean up everything"""
    try:
        logger.info(f"Starting removal process for session: {session_id}")
        
        # 1. Check MinIO first (this is where uploads go)
        minio_exists = False
        if MINIO_ENDPOINT:
            try:
                from minio import Minio
                minio_client = Minio(
                    MINIO_ENDPOINT,
                    access_key=MINIO_ACCESS_KEY,
                    secret_key=MINIO_SECRET_KEY,
                    secure=False
                )
                objects = list(minio_client.list_objects(MINIO_BUCKET, prefix=f"{session_id}/", recursive=True))
                minio_exists = len(objects) > 0
                logger.info(f"MinIO check for session {session_id}: found {len(objects)} objects")
            except Exception as e:
                logger.warning(f"Failed to check MinIO for session {session_id}: {e}")
        
        # 2. If nothing in MinIO, return 404
        if not minio_exists:
            logger.info(f"Session {session_id} not found in MinIO")
            raise HTTPException(status_code=404, detail="Transcription session not found")
        
        # 3. Clean up everything
        removed_items = await cleanup_all_session_data(session_id)
        
        # 4. Delete from PostgreSQL
        db_removed = await delete_session_from_db(session_id)
        if db_removed:
            removed_items.append("PostgreSQL: sessions, files, processing_logs")
        
        # 5. Notify frontend to remove from UI
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.delete(f"{FILE_UPLOADER_URL}/api/v1/transcripts/{session_id}")
        except Exception as e:
            logger.warning(f"Failed to notify file uploader service: {e}")
        
        logger.info(f"Successfully removed session {session_id}: {', '.join(removed_items)}")
        
        return {
            "status": "success", 
            "message": "Transcription session removed successfully",
            "session_id": session_id,
            "removed_items": removed_items,
            "timestamp": datetime.now(SINGAPORE_TZ).isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing transcription {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove transcription: {str(e)}")

@app.get("/health")
async def health():
    """Health check"""
    memory_info = {}
    if torch.cuda.is_available():
        try:
            memory_info["total_gpu_memory"] = torch.cuda.get_device_properties(0).total_memory
            memory_info["allocated_gpu_memory"] = torch.cuda.memory_allocated(0)
            memory_info["gpu_utilization"] = memory_info["allocated_gpu_memory"] / memory_info["total_gpu_memory"]
        except Exception as e:
            memory_info["gpu_error"] = str(e)
    
    memory_info["total_ram"] = psutil.virtual_memory().total
    memory_info["available_ram"] = psutil.virtual_memory().available
    memory_info["ram_percent"] = psutil.virtual_memory().percent
    
    # Check loaded models
    model_info = {
        "whisper_loaded": "whisper" in models,
        "vad_loaded": "vad_model" in models,
        "diarization_loaded": "diarization" in models,
        "alignment_models": [k for k in models.keys() if k.startswith("alignment_")]
    }
    
    redis_status = "ok"
    try:
        redis_client.ping()
    except Exception as e:
        redis_status = f"error: {str(e)}"
    
    return {
        "status": "ok",
        "service": "whisper-transcriber",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "memory": memory_info,
        "device": DEVICE,
        "compute_type": COMPUTE_TYPE,
        "batch_size": BATCH_SIZE,
        "models": model_info,
        "dependencies": {
            "redis": redis_status,
            "hf_token": "configured" if HF_TOKEN else "missing"
        }
    }

@app.on_event("startup")
async def startup_event():
    """Startup event - preload models and start consumer"""
    try:
        logger.info("🚀 Preloading pyannote VAD model...")
        vad_model = load_pyannote_vad_model()
        models["vad_model"] = vad_model
        logger.info("✅ pyannote VAD model preloaded successfully")
    except Exception as e:
        logger.error(f"❌ Failed to preload VAD model: {e}")
        raise
    
    # Start RabbitMQ consumer
    consumer_thread = threading.Thread(target=start_rabbitmq_consumer, daemon=True)
    consumer_thread.start()
    logger.info("Started RabbitMQ consumer thread")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)