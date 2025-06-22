import os
import gc
import json
import time
import torch
import asyncio
import whisperx
import tempfile
import threading
import redis
import httpx
import logging
import pika
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Union
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Monkey patch for numpy NaN issue with pyannote (NumPy 2.0 removed np.NaN)
import numpy as np
if not hasattr(np, 'NaN'):
    np.NaN = np.nan

# Monkey patch for PyTorch 2.6+ weights_only issue with PyAnnote models
import torch.serialization
try:
    # Add omegaconf.listconfig.ListConfig to safe globals for PyTorch 2.6+
    import omegaconf
    from omegaconf import listconfig
    
    # Add specific classes to the safe globals list
    safe_classes = [
        omegaconf.listconfig.ListConfig,
        omegaconf.dictconfig.DictConfig,
    ]
    
    # Check if add_safe_globals exists (PyTorch 2.6+)
    if hasattr(torch.serialization, 'add_safe_globals'):
        torch.serialization.add_safe_globals(safe_classes)
except (ImportError, AttributeError) as e:
    # Either omegaconf is not installed or PyTorch version doesn't have add_safe_globals
    logger.warning(f"Could not set up PyTorch safe globals for omegaconf: {e}")
    pass

# Original torch.load function
_original_torch_load = torch.load

# Patched torch.load function that always sets weights_only=False for PyAnnote models
def patched_torch_load(f, map_location=None, pickle_module=None, **kwargs):
    # Force weights_only=False for PyAnnote models
    if 'weights_only' not in kwargs:
        kwargs['weights_only'] = False
    return _original_torch_load(f, map_location=map_location, pickle_module=pickle_module, **kwargs)

# Replace torch.load with our patched version
torch.load = patched_torch_load

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("main")

# Initialize FastAPI app
app = FastAPI()

# Configuration
DEVICE = os.environ.get("DEVICE", "cpu")
DEFAULT_LANGUAGE = os.getenv("DEFAULT_LANGUAGE", "en")
LLM_SERVICE_URL = os.getenv("LLM_SERVICE_URL", "http://llm-service:8004")
UI_SERVICE_URL = os.getenv("UI_SERVICE_URL", "http://frontend:3000")

# Redis for caching and progress tracking
redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
redis_client = redis.from_url(redis_url, decode_responses=True)

# Model caching
models = {}

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
COMPUTE_TYPE = os.environ.get("COMPUTE_TYPE", "float16" if DEVICE == "cuda" else "float32")
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "8"))  # Default batch size of 8
HF_TOKEN = os.environ.get("HF_TOKEN", None)
MIN_SPEAKERS = int(os.environ.get("MIN_SPEAKERS", "1"))
MAX_SPEAKERS = int(os.environ.get("MAX_SPEAKERS", "5"))
SAMPLE_RATE = 16000  # Default sample rate for audio processing

# Check if device is CPU for mock diarization decision
SHOULD_MOCK = os.environ.get("SHOULD_MOCK_DIARIZATION", "").lower() == "true" or DEVICE != "cuda"

# RabbitMQ configuration
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", 5672))
RABBITMQ_USER = os.getenv("RABBITMQ_DEFAULT_USER", "user")
RABBITMQ_PASS = os.getenv("RABBITMQ_DEFAULT_PASS", "password")
TRANSCRIPTION_QUEUE = "video_processing_queue"  # Listen to the same queue as video-processor
TRANSCRIPTION_RESULTS_QUEUE = "transcription_results_queue"

# Service URLs
FILE_UPLOADER_URL = os.getenv("FILE_UPLOADER_URL", "http://file-uploader:8002")

# MinIO configuration for downloading files
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin123")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "whisper-files")

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

# Helper functions
async def send_progress_update(session_id: str, progress: float, message: str, status: str):
    """Send progress update to file uploader service"""
    try:
        # First try the new endpoint path
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.post(
                    f"{FILE_UPLOADER_URL}/upload/progress/{session_id}",
                    json={
                        "progress": progress,
                        "message": message,
                        "status": status
                    }
                )
                
                # If 404, try the alternative endpoint
                if response.status_code == 404:
                    logger.info(f"Progress endpoint returned 404, trying alternative endpoint")
                    response = await client.post(
                        f"{FILE_UPLOADER_URL}/upload/complete-upload",
                        json={
                            "session_id": session_id,
                            "progress": progress,
                            "message": message,
                            "status": status
                        }
                    )
                
                # Check if any of our attempts succeeded
                if response.status_code >= 400:
                    logger.warning(f"Failed to update progress: {response.status_code} - {response.text}")
            except Exception as req_err:
                logger.warning(f"Request error sending progress update: {req_err}")
                
                # Try one more fallback endpoint
                await client.post(
                    f"{FILE_UPLOADER_URL}/upload/complete",
                    json={
                        "session_id": session_id,
                        "status": status,
                        "message": message
                    }
                )
    except Exception as e:
        logger.error(f"Failed to send progress update: {e}")
        
        # Store progress in Redis as fallback
        try:
            redis_client.setex(
                f"transcription_progress:{session_id}",
                3600,  # 1 hour expiry
                json.dumps({
                    "progress": progress,
                    "message": message,
                    "status": status,
                    "timestamp": datetime.utcnow().isoformat()
                })
            )
        except Exception as redis_err:
            logger.error(f"Failed to store progress in Redis: {redis_err}")



def load_whisper_model(model_name="large-v3"):
    """Load WhisperX model, with caching"""
    if "whisper" not in models:
        try:
            logger.info(f"Loading WhisperX model: {model_name}")
            # Use compute_type based on device
            compute_type = COMPUTE_TYPE if DEVICE == "cuda" else "int8"
            models["whisper"] = whisperx.load_model(
                model_name, 
                device=DEVICE, 
                compute_type=compute_type,
                language=DEFAULT_LANGUAGE if DEFAULT_LANGUAGE else None,
                local_files_only=False  # Set to True if you want to use only local files
            )
            logger.info(f"Successfully loaded {model_name} model on {DEVICE} with {compute_type} precision")
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            # Try with a smaller model as fallback
            if model_name not in ["tiny", "base"]:
                logger.info("Trying to load a smaller model instead...")
                try:
                    if model_name in ["large-v3", "large-v2", "large"]:
                        fallback = "medium"
                    else:
                        fallback = "base"
                    models["whisper"] = whisperx.load_model(
                        fallback,
                        device=DEVICE,
                        compute_type="int8",  # Always use int8 for fallback
                        language=DEFAULT_LANGUAGE if DEFAULT_LANGUAGE else None
                    )
                    logger.info(f"Successfully loaded fallback model {fallback}")
                except Exception as fallback_error:
                    logger.error(f"Failed to load fallback model: {fallback_error}")
                    raise RuntimeError("Could not load any whisper model, even fallback models failed")
    return models["whisper"]

def detect_language(audio_path: str, model) -> str:
    """Detect audio language using WhisperX"""
    try:
        logger.info(f"Detecting language for: {audio_path}")
        # Load audio
        audio = whisperx.load_audio(audio_path)
        
        # Use the model to detect language
        # WhisperX includes language detection in model.transcribe with initial_prompt=None
        try:
            logger.info("Using whisperx model.transcribe for language detection")
            # Only process first 30 seconds to speed up language detection
            audio_30s = audio[:int(SAMPLE_RATE * 30)] if len(audio) > SAMPLE_RATE * 30 else audio
            
            result = model.transcribe(
                audio_30s, 
                batch_size=8,  # Small batch size for quick processing
                language=None,  # Don't provide language to trigger detection
                task="transcribe"
            )
            
            # Extract detected language
            if isinstance(result, dict) and "language" in result:
                language_code = result["language"]
            else:
                # Fallback to direct detection if transcribe didn't return language
                language_detection_result = model.detect_language(audio_30s)
                
                # Check what kind of result we got
                if isinstance(language_detection_result, dict) and "language" in language_detection_result:
                    language_code = language_detection_result["language"]
                elif isinstance(language_detection_result, tuple) and len(language_detection_result) > 0:
                    language_code = language_detection_result[0]
                elif isinstance(language_detection_result, str):
                    language_code = language_detection_result
                else:
                    logger.warning(f"Unknown language detection result format: {type(language_detection_result)}, using 'en' as default")
                    language_code = "en"
        except Exception as transcribe_err:
            # Fallback to direct detection if transcribe method fails
            logger.warning(f"Failed to detect language through transcribe: {transcribe_err}")
            language_detection_result = model.detect_language(audio)
            
            # Extract language from result
            if isinstance(language_detection_result, dict) and "language" in language_detection_result:
                language_code = language_detection_result["language"]
            elif isinstance(language_detection_result, tuple) and len(language_detection_result) > 0:
                language_code = language_detection_result[0]
            elif isinstance(language_detection_result, str):
                language_code = language_detection_result
            else:
                logger.warning(f"Unknown language detection result format: {type(language_detection_result)}, using 'en' as default")
                language_code = "en"
        
        # Validate the language code is recognized
        if not language_code or len(language_code) < 2:
            logger.warning(f"Invalid language code detected: '{language_code}', using 'en' as default")
            language_code = "en"
            
        logger.info(f"Detected language: {language_code}")
        print(f"Detected language: {language_code} in first 30s of audio...")
        return language_code
        
    except Exception as e:
        logger.error(f"Language detection failed: {e}")
        # Default to English if detection fails
        return "en"

def load_alignment_model(language_code):
    """Load alignment model for improved timestamps"""
    alignment_key = f"alignment_{language_code}"
    
    if alignment_key not in models:
        try:
            logger.info(f"Loading alignment model for {language_code}")
            model_a, metadata = whisperx.load_align_model(
                language_code=language_code,
                device=DEVICE
            )
            models[alignment_key] = {"model": model_a, "metadata": metadata}
            return model_a, metadata
        except Exception as e:
            logger.error(f"Failed to load alignment model: {e}")
            return None, None
    else:
        stored = models[alignment_key]
        return stored["model"], stored["metadata"]

def load_diarization_model():
    """Load speaker diarization model"""
    if SHOULD_MOCK:
        logger.info("Using mock diarization (development mode on CPU)")
        return "mock_model"
        
    if not HF_TOKEN:
        logger.warning("No Hugging Face token provided, skipping diarization model loading")
        return None
        
    if "diarization" not in models:
        try:
            logger.info("Loading diarization model")
            models["diarization"] = whisperx.DiarizationPipeline(
                use_auth_token=HF_TOKEN,
                device=DEVICE
            )
        except Exception as e:
            logger.error(f"Failed to load diarization model: {e}")
            return None
            
    return models["diarization"]

def transcribe_audio(audio_path: str, model, language: str = None):
    """Transcribe audio using WhisperX"""
    try:
        logger.info(f"Starting transcription for: {audio_path}")
        
        # Load audio using whisperx
        audio = whisperx.load_audio(audio_path)
        
        # Free up memory before intensive operations
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()
        
        # Transcribe using WhisperX approach with additional memory safeguards
        try:
            # Use a smaller batch size if on CPU
            batch_size = BATCH_SIZE if DEVICE == "cuda" else max(1, BATCH_SIZE // 4)
            logger.info(f"Using batch size: {batch_size}")
            
            result = model.transcribe(
                audio, 
                batch_size=batch_size,
                language=language,
                task="transcribe"  # Force transcribe task
            )
            
            # If alignment is available and on CUDA, try to align for better word-level timestamps
            if DEVICE == "cuda" and language:
                try:
                    logger.info(f"Loading alignment model for language: {language}")
                    align_model, align_metadata = whisperx.load_align_model(
                        language_code=language,
                        device=DEVICE
                    )
                    logger.info("Performing word-level alignment")
                    result = whisperx.align(
                        result["segments"],
                        align_model,
                        align_metadata,
                        audio,
                        DEVICE,
                        return_char_alignments=False
                    )
                    logger.info("Word-level alignment completed")
                except Exception as align_error:
                    logger.warning(f"Could not perform word-level alignment: {align_error}")
                    # Continue without alignment
            
            # Ensure we don't run out of memory after processing
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                gc.collect()
                
            logger.info("Transcription completed")
            return result
        except (RuntimeError, MemoryError) as mem_error:
            # Handle out of memory errors specifically
            logger.error(f"Memory error during transcription: {mem_error}")
            
            # Try with smaller batch size as fallback
            try:
                logger.info("Retrying transcription with reduced batch size")
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                    gc.collect()
                
                smaller_batch = max(1, BATCH_SIZE // 4)
                result = model.transcribe(
                    audio, 
                    batch_size=smaller_batch,
                    language=language
                )
                
                logger.info("Transcription completed with reduced batch size")
                return result
            except Exception as fallback_error:
                logger.error(f"Fallback transcription also failed: {fallback_error}")
                raise
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise

def align_transcription(segments, model_a, metadata, audio_path):
    """Align transcription for better timestamps"""
    try:
        logger.info("Aligning transcription")
        
        # Load audio
        audio = whisperx.load_audio(audio_path)
        
        # Align
        result = whisperx.align(
            segments,
            model_a,
            metadata,
            audio,
            device=DEVICE
        )
        
        logger.info("Alignment completed")
        return result
        
    except Exception as e:
        logger.error(f"Alignment failed: {e}")
        # Return unaligned segments if alignment fails
        return {"segments": segments}

def mock_diarize_speakers(audio_path: str, number_of_speakers: int):
    """Mock speaker diarization for development on CPU"""
    logger.info(f"Running mock diarization with {number_of_speakers} speakers")
    
    try:
        import librosa
        audio, sr = librosa.load(audio_path, sr=16000)
        duration = librosa.get_duration(y=audio, sr=sr)
        
        # Create mock speaker segments
        segment_length = 5.0  # Each segment is 5 seconds
        num_segments = int(duration / segment_length) + 1
        
        mock_segments = []
        current_speaker = 0
        
        for i in range(num_segments):
            start_time = i * segment_length
            end_time = min((i + 1) * segment_length, duration)
            
            mock_segments.append({
                "start": start_time,
                "end": end_time,
                "speaker": f"SPEAKER_{current_speaker}"
            })
            
            # Rotate speakers
            current_speaker = (current_speaker + 1) % number_of_speakers
        
        return {
            "segments": mock_segments,
            "is_mocked": True
        }
    except Exception as e:
        logger.error(f"Mock diarization failed: {e}")
        return None

def diarize_speakers(audio_path: str, diarization_model, number_of_speakers: int):
    """Perform speaker diarization"""
    try:
        if diarization_model == "mock_model":
            return mock_diarize_speakers(audio_path, number_of_speakers)
        
        logger.info(f"Diarizing speakers with min_speakers=1, max_speakers={number_of_speakers}")
        
        # Run diarization
        diarize_segments = diarization_model(
            audio_path,
            min_speakers=1,
            max_speakers=number_of_speakers
        )
        
        logger.info("Diarization completed")
        return diarize_segments
        
    except Exception as e:
        logger.error(f"Diarization failed: {e}")
        # Return mock results if diarization fails
        return mock_diarize_speakers(audio_path, number_of_speakers)

def assign_speakers_to_segments(transcript_result, diarize_segments):
    """Assign speaker labels to transcript segments"""
    try:
        if not diarize_segments:
            return transcript_result
            
        logger.info("Assigning speakers to segments")
        
        # Check if using mock diarization
        is_mocked = diarize_segments.get("is_mocked", False)
        
        if is_mocked:
            # Manual assignment for mock diarization
            segments = transcript_result["segments"]
            diarize_data = diarize_segments["segments"]
            
            for segment in segments:
                # Find the diarization segment that overlaps the most
                segment_center = (segment["start"] + segment["end"]) / 2
                
                for diar_segment in diarize_data:
                    if diar_segment["start"] <= segment_center <= diar_segment["end"]:
                        segment["speaker"] = diar_segment["speaker"]
                        break
                        
                if "speaker" not in segment:
                    segment["speaker"] = "SPEAKER_0"
        else:
            # Use WhisperX's built-in speaker assignment
            transcript_result = whisperx.assign_word_speakers(
                diarize_segments, 
                transcript_result
            )
        
        logger.info("Speaker assignment completed")
        return transcript_result
        
    except Exception as e:
        logger.error(f"Speaker assignment failed: {e}")
        return transcript_result

def map_speaker_names(transcript_result, speaker_names: List[str]):
    """Map numeric speaker labels to provided names"""
    if not speaker_names or len(speaker_names) == 0:
        return transcript_result
        
    logger.info(f"Mapping speaker names: {speaker_names}")
    
    # Create a mapping from SPEAKER_X to user-provided names
    speaker_map = {}
    for i, name in enumerate(speaker_names):
        if name and name.strip():  # Only map non-empty names
            speaker_map[f"SPEAKER_{i}"] = name
    
    # Apply mapping to segments
    for segment in transcript_result["segments"]:
        if "speaker" in segment:
            speaker_label = segment["speaker"]
            if speaker_label in speaker_map:
                segment["speaker_name"] = speaker_map[speaker_label]
            else:
                segment["speaker_name"] = speaker_label
    
    return transcript_result

def format_transcription_result(result, session_id: str, duration: float, speaker_names: List[str] = None):
    """Format the final transcription result"""
    try:
        language = result.get("language", "en")
        
        # Create diarized segments list for easy consumption
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
        
        # Create final result dictionary
        formatted_result = {
            "session_id": session_id,
            "language": language,
            "duration": duration,
            "segments": result.get("segments", []),
            "diarized_segments": diarized_segments,
            "word_segments": result.get("word_segments", []),
            "speaker_names": speaker_names,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return formatted_result
        
    except Exception as e:
        logger.error(f"Error formatting transcription result: {e}")
        raise

async def send_to_llm_service(transcription_result):
    """Send transcription result to LLM service for processing"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{LLM_SERVICE_URL}/process-transcript",
                json=transcription_result
            )
            
            if response.status_code == 200:
                logger.info(f"Successfully sent transcript to LLM service")
                return response.json()
            else:
                logger.error(f"Failed to send transcript to LLM service: {response.text}")
                return None
                
    except Exception as e:
        logger.error(f"Error sending to LLM service: {e}")
        return None

def cleanup_temp_file(file_path, delay=0):
    """Clean up temporary file after specified delay"""
    try:
        if delay > 0:
            import time
            time.sleep(delay)
        
        if os.path.exists(file_path):
            os.unlink(file_path)
            logger.info(f"Deleted temporary file: {file_path}")
    except Exception as e:
        logger.error(f"Failed to delete temporary file {file_path}: {e}")

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
        logger.info(f"Received transcription message: {message}")
        
        session_id = message.get("session_id")
        object_name = message.get("object_name")
        original_filename = message.get("original_filename")
        
        if not session_id or not object_name:
            logger.error("Invalid message: missing session_id or object_name")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return
            
        # Check if this is an audio file that can be directly transcribed
        if original_filename and any(ext in original_filename.lower() for ext in ['.mp3', '.wav', '.m4a', '.flac', '.aac']):
            logger.info(f"Processing audio file directly: {original_filename}")
            
            # Create download path
            temp_dir = "/tmp/whisper_temp"
            os.makedirs(temp_dir, exist_ok=True)
            download_path = os.path.join(temp_dir, f"{session_id}_{original_filename}")
            
            # Download file from MinIO
            success = download_from_minio(object_name, download_path)
            if not success:
                logger.error(f"Failed to download {object_name}")
                ch.basic_ack(delivery_tag=method.delivery_tag)
                return
                
            # Get participant count and speaker names from Redis if available
            metadata = None
            try:
                # Try multiple possible metadata keys
                metadata_keys = [
                    f"upload_metadata:{session_id}",
                    f"processing_metadata:{session_id}",
                    f"session_metadata:{session_id}"
                ]
                
                for key in metadata_keys:
                    metadata_raw = redis_client.get(key)
                    if metadata_raw:
                        metadata = json.loads(metadata_raw)
                        break
            except Exception as e:
                logger.error(f"Error getting metadata from Redis: {e}")
                
            participant_count = 2  # Default
            speaker_names = None
            
            if metadata:
                participant_count = metadata.get("participant_count", 2)
                speaker_names = metadata.get("speaker_names")
            
            # Start transcription directly
            try:
                asyncio.run(transcribe_async(download_path, session_id, participant_count, None, speaker_names))
                logger.info(f"Transcription completed for audio file: {session_id}")
                
                # Clean up downloaded file
                try:
                    os.unlink(download_path)
                except:
                    pass
                    
            except Exception as e:
                logger.error(f"Error transcribing audio file {session_id}: {e}")
                asyncio.run(send_progress_update(session_id, 0, f"Transcription failed: {str(e)}", "error"))
        else:
            # This is a video file - let video-processor handle it
            logger.info(f"Video file detected, letting video-processor handle: {original_filename}")
        
        # Acknowledge message
        ch.basic_ack(delivery_tag=method.delivery_tag)
        
    except Exception as e:
        logger.error(f"Error processing RabbitMQ message: {e}")
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
        channel.queue_declare(queue=TRANSCRIPTION_QUEUE, durable=True)
        
        # Set prefetch count to avoid overloading
        channel.basic_qos(prefetch_count=1)
        
        # Set up consumer
        channel.basic_consume(
            queue=TRANSCRIPTION_QUEUE,
            on_message_callback=process_upload_message
        )
        
        logger.info(f"Started RabbitMQ consumer, listening for messages on {TRANSCRIPTION_QUEUE}")
        
        # Start consuming
        channel.start_consuming()
        
    except Exception as e:
        logger.error(f"Error starting RabbitMQ consumer: {e}")
        # In production, add retry mechanism

async def transcribe_async(audio_path: str, session_id: str, participant_count: int, language: str = None, speaker_names: List[str] = None):
    """Perform full transcription pipeline asynchronously"""
    try:
        logger.info(f"Starting transcription pipeline for session: {session_id}")
        
        # Ensure memory is cleared at start
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()
        
        # Load models
        await send_progress_update(session_id, 65, "Loading transcription models...", "processing")
        
        # Try loading with graceful degradation
        try:
            whisper_model = load_whisper_model("large-v3")
        except Exception as model_error:
            logger.warning(f"Failed to load large-v3 model: {model_error}")
            logger.info("Trying medium model instead...")
            try:
                whisper_model = load_whisper_model("medium")
            except Exception as medium_error:
                logger.warning(f"Failed to load medium model: {medium_error}")
                logger.info("Trying base model as last resort...")
                whisper_model = load_whisper_model("base")
        
        # Detect language if not specified
        if not language:
            await send_progress_update(session_id, 70, "Detecting language...", "processing")
            language = detect_language(audio_path, whisper_model)
        
        # Transcribe audio
        await send_progress_update(session_id, 75, "Transcribing audio...", "processing")
        result = transcribe_audio(audio_path, whisper_model, language)
        
        # Load alignment model
        await send_progress_update(session_id, 80, "Improving timestamp accuracy...", "processing")
        model_a, metadata = load_alignment_model(language)
        
        if model_a and metadata:
            result = align_transcription(result["segments"], model_a, metadata, audio_path)
        
        # Perform speaker diarization if requested
        if participant_count > 1:
            await send_progress_update(session_id, 85, "Identifying speakers...", "processing")
            diarization_model = load_diarization_model()
            
            if diarization_model:
                # Adjust speaker count to be within bounds
                adjusted_count = max(MIN_SPEAKERS, min(participant_count, MAX_SPEAKERS))
                if adjusted_count != participant_count:
                    logger.info(f"Adjusted speaker count from {participant_count} to {adjusted_count}")
                
                diarize_segments = diarize_speakers(audio_path, diarization_model, adjusted_count)
                if diarize_segments:
                    result = assign_speakers_to_segments(result, diarize_segments)
                    
                    # Map speaker names if provided
                    if speaker_names and len(speaker_names) > 0:
                        result = map_speaker_names(result, speaker_names)
        
        # Get audio duration
        import librosa
        try:
            y, sr = librosa.load(audio_path, sr=None)
            duration = librosa.get_duration(y=y, sr=sr)
        except Exception as e:
            logger.warning(f"Failed to get audio duration: {e}, using fallback duration")
            # Fallback duration calculation
            if "segments" in result and len(result["segments"]) > 0:
                duration = max([segment.get("end", 0) for segment in result["segments"]])
            else:
                duration = 0
        
        # Format result
        await send_progress_update(session_id, 90, "Formatting transcription...", "processing")
        formatted_result = format_transcription_result(result, session_id, duration, speaker_names)
        
        # Store result in Redis with all required frontend fields
        transcription_data = {
            "session_id": session_id,
            "id": session_id,
            "sessionId": session_id,
            "filename": speaker_names[0] if speaker_names else "audio_file.wav",  # We'll get this from upload metadata
            "fileSize": 0,  # We'll get this from upload metadata
            "mimeType": "audio/wav",  # We'll get this from upload metadata
            "participantCount": participant_count,
            "status": "completed",
            "sessionStatus": "completed",
            "progress": 100,
            "hasTranscript": True,
            "transcriptData": formatted_result,
            "createdAt": datetime.utcnow().isoformat(),
            "completedAt": datetime.utcnow().isoformat(),
            "duration": duration,
            "segmentCount": len(formatted_result.get("diarized_segments", [])),
            "language": language,
            "speakers": list(set([seg.get("speaker", "SPEAKER_0") for seg in formatted_result.get("diarized_segments", [])])),
            "diarizedSegments": formatted_result.get("diarized_segments", []),
            "user_id": None,  # We'll get this from upload metadata
            "content_type": "audio/wav",  # We'll get this from upload metadata
            "file_size": 0,  # We'll get this from upload metadata
            "speaker_count": participant_count,
            "transcript": formatted_result.get("segments", []),
            "created_at": datetime.utcnow().isoformat(),
            "completed_at": datetime.utcnow().isoformat()
        }
        
        # Try to get upload metadata to fill in missing fields
        try:
            upload_session_data = redis_client.get(f"upload_session:{session_id}")
            if upload_session_data:
                upload_data = json.loads(upload_session_data)
                transcription_data.update({
                    "filename": upload_data.get("filename", "audio_file.wav"),
                    "fileSize": upload_data.get("file_size", 0),
                    "file_size": upload_data.get("file_size", 0),
                    "mimeType": upload_data.get("content_type", "audio/wav"),
                    "content_type": upload_data.get("content_type", "audio/wav"),
                    "user_id": upload_data.get("user_id")
                })
                
            # Try to get user_id and processing metadata
            metadata_keys = [
                f"upload_metadata:{session_id}",
                f"processing_metadata:{session_id}",
                f"session_metadata:{session_id}",
                f"user_session:{session_id}"
            ]
            
            for key in metadata_keys:
                metadata_raw = redis_client.get(key)
                if metadata_raw:
                    metadata = json.loads(metadata_raw)
                    if metadata.get("user_id"):
                        transcription_data["user_id"] = metadata["user_id"]
                        break
        except Exception as e:
            logger.warning(f"Could not retrieve upload metadata: {e}")
        
        redis_client.setex(
            f"transcription:{session_id}",
            24 * 3600,  # 24 hours
            json.dumps(transcription_data)
        )
        
        # Send to LLM service for further processing
        await send_progress_update(session_id, 95, "Sending for analysis...", "processing")
        try:
            await send_to_llm_service(formatted_result)
        except Exception as e:
            logger.error(f"Failed to send to LLM service: {e}")
        
        # Clean up GPU memory
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()
        
        # Send success update
        await send_progress_update(session_id, 100, "Transcription complete!", "completed")
        
        logger.info(f"Transcription completed for session: {session_id}")
        return formatted_result
        
    except Exception as e:
        logger.error(f"Error in transcription pipeline for session {session_id}: {e}")
        
        # Try to give more information to the user
        error_message = str(e)
        if "CUDA out of memory" in error_message:
            error_message = "Transcription failed due to insufficient GPU memory. Try with a smaller audio file."
        elif "CUDA" in error_message or "GPU" in error_message:
            error_message = "GPU error occurred during transcription. The service will use CPU fallback if available."
        
        await send_progress_update(
            session_id, 
            0, 
            f"Transcription failed: {error_message}", 
            "error"
        )
        
        # Store error information
        redis_client.setex(
            f"transcription_error:{session_id}",
            24 * 3600,
            json.dumps({
                "session_id": session_id,
                "error": error_message,
                "timestamp": datetime.utcnow().isoformat()
            })
        )
        
        # Clean up memory in case of error
        if torch.cuda.is_available():
            try:
                torch.cuda.empty_cache()
                gc.collect()
            except:
                pass
        
        raise

# API Routes
@app.post("/transcribe")
async def transcribe_audio_endpoint(
    background_tasks: BackgroundTasks,
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
        raise HTTPException(status_code=409, detail="Audio already being transcribed")
    
    # Mark as processing
    redis_client.setex(processing_key, 3600, "transcribing")  # 1 hour expiration
    
    try:
        # Parse speaker names if provided
        parsed_speaker_names = None
        if speaker_names:
            try:
                parsed_speaker_names = json.loads(speaker_names)
            except:
                logger.warning(f"Failed to parse speaker names: {speaker_names}")
        
        # Save uploaded file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            content = await audio.read()
            temp_file.write(content)
            temp_audio_path = temp_file.name
        
        # Start background transcription
        background_tasks.add_task(
            transcribe_async,
            temp_audio_path,
            session_id,
            participant_count,
            language,
            parsed_speaker_names
        )
        
        # Schedule cleanup
        background_tasks.add_task(cleanup_temp_file, temp_audio_path, delay=3600)
        
        return {
            "message": "Transcription started",
            "session_id": session_id,
            "status": "transcribing"
        }
        
    except Exception as e:
        # Clean up on error
        redis_client.delete(processing_key)
        raise HTTPException(status_code=500, detail=f"Failed to start transcription: {str(e)}")

@app.get("/transcription/{session_id}")
async def get_transcription(session_id: str):
    """Get transcription result"""
    try:
        # Check for error first
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
            # Check if still processing
            if redis_client.get(f"transcribing:{session_id}"):
                return {
                    "status": "processing",
                    "message": "Transcription is still in progress"
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

@app.post("/transcription/{session_id}/speakers")
async def update_speaker_names(session_id: str, request: SpeakerUpdateRequest):
    """Update speaker names in an existing transcription"""
    try:
        # Check if transcription exists
        data = redis_client.get(f"transcription:{session_id}")
        if not data:
            raise HTTPException(status_code=404, detail="Transcription not found")
            
        transcription = json.loads(data)
        
        # Update speaker names in segments
        if "segments" in transcription:
            for segment in transcription["segments"]:
                speaker = segment.get("speaker")
                if speaker and speaker in request.speaker_map:
                    segment["speaker_name"] = request.speaker_map[speaker]
        
        # Update speaker names in diarized_segments if present
        if "diarized_segments" in transcription:
            for segment in transcription["diarized_segments"]:
                speaker = segment.get("speaker")
                if speaker and speaker in request.speaker_map:
                    segment["speaker"] = request.speaker_map[speaker]  # Update the display name
        
        # Store updated transcription back in Redis
        redis_client.setex(
            f"transcription:{session_id}",
            24 * 3600,  # 24 hours
            json.dumps(transcription)
        )
        
        # Log the update
        logger.info(f"Updated speaker names for session {session_id}: {request.speaker_map}")
        
        return {"status": "success", "message": "Speaker names updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating speaker names: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update speaker names: {str(e)}")

@app.get("/health")
async def health():
    """Check the health of the service"""
    # Get memory usage
    memory_info = {}
    if torch.cuda.is_available():
        try:
            memory_info["total_gpu_memory"] = torch.cuda.get_device_properties(0).total_memory
            memory_info["allocated_gpu_memory"] = torch.cuda.memory_allocated(0)
            memory_info["reserved_gpu_memory"] = torch.cuda.memory_reserved(0)
            memory_info["gpu_utilization"] = memory_info["allocated_gpu_memory"] / memory_info["total_gpu_memory"]
        except Exception as e:
            memory_info["gpu_error"] = str(e)
    
    import psutil
    memory_info["total_ram"] = psutil.virtual_memory().total
    memory_info["available_ram"] = psutil.virtual_memory().available
    memory_info["ram_percent"] = psutil.virtual_memory().percent
    
    # Check Redis connection
    redis_status = "ok"
    try:
        redis_client.ping()
    except Exception as e:
        redis_status = f"error: {str(e)}"
    
    return {
        "status": "ok",
        "service": "whisper-transcriber",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "memory": memory_info,
        "device": DEVICE,
        "compute_type": COMPUTE_TYPE,
        "batch_size": BATCH_SIZE,
        "dependencies": {
            "redis": redis_status,
        }
    }

@app.on_event("startup")
async def startup_event():
    """Start background RabbitMQ consumer thread on startup"""
    # Start RabbitMQ consumer in a separate thread
    consumer_thread = threading.Thread(target=start_rabbitmq_consumer, daemon=True)
    consumer_thread.start()
    logger.info("Started RabbitMQ consumer thread")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)