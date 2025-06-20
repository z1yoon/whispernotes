from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import whisperx
import torch
import logging
import json
import redis
import httpx
from datetime import datetime
from typing import Optional, List, Dict, Union
import tempfile
import asyncio
import gc
import platform

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="WhisperNotes Transcription Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
COMPUTE_TYPE = "float16" if DEVICE == "cuda" else "int8"
BATCH_SIZE = 16
HF_TOKEN = os.getenv("HF_TOKEN")  # Hugging Face token for speaker diarization

# Check if device is CPU for mock diarization decision
SHOULD_MOCK = DEVICE == "cpu"

# Redis for caching and progress tracking
redis_client = redis.Redis(host=os.getenv("REDIS_HOST", "localhost"), port=6379, decode_responses=True)

# Service URLs
LLM_SERVICE_URL = os.getenv("LLM_SERVICE_URL", "http://llm-service:8004")
FILE_UPLOADER_URL = os.getenv("FILE_UPLOADER_URL", "http://file-uploader:8002")

# RabbitMQ configuration
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", 5672))
RABBITMQ_USER = os.getenv("RABBITMQ_DEFAULT_USER", "user")
RABBITMQ_PASS = os.getenv("RABBITMQ_DEFAULT_PASS", "password")
TRANSCRIPTION_QUEUE = "transcription_queue"
TRANSCRIPTION_RESULTS_QUEUE = "transcription_results_queue"

# Global model storage
models = {}

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

def load_whisper_model(model_name="large-v3"):
    """Load WhisperX model, with caching"""
    if "whisper" not in models:
        logger.info(f"Loading WhisperX model: {model_name}")
        models["whisper"] = whisperx.load_model(
            model_name, 
            device=DEVICE, 
            compute_type=COMPUTE_TYPE
        )
    return models["whisper"]

def detect_language(audio_path: str, model) -> str:
    """Detect audio language using WhisperX"""
    try:
        # Load audio
        audio = whisperx.load_audio(audio_path)
        
        # Detect language
        result = model.detect_language(audio)
        language_code = result[0]
        
        logger.info(f"Detected language: {language_code}")
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
        
        result = whisperx.transcribe(
            audio_path, 
            model, 
            batch_size=BATCH_SIZE,
            language=language
        )
        
        logger.info("Transcription completed")
        return result
        
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

async def transcribe_async(audio_path: str, session_id: str, participant_count: int, language: str = None, speaker_names: List[str] = None):
    """Perform full transcription pipeline asynchronously"""
    try:
        logger.info(f"Starting transcription pipeline for session: {session_id}")
        
        # Load models
        await send_progress_update(session_id, 65, "Loading transcription models...", "processing")
        whisper_model = load_whisper_model("large-v3")
        
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
                diarize_segments = diarize_speakers(audio_path, diarization_model, participant_count)
                if diarize_segments:
                    result = assign_speakers_to_segments(result, diarize_segments)
                    
                    # Map speaker names if provided
                    if speaker_names and len(speaker_names) > 0:
                        result = map_speaker_names(result, speaker_names)
        
        # Get audio duration
        import librosa
        y, sr = librosa.load(audio_path)
        duration = librosa.get_duration(y=y, sr=sr)
        
        # Format result
        await send_progress_update(session_id, 90, "Formatting transcription...", "processing")
        formatted_result = format_transcription_result(result, session_id, duration, speaker_names)
        
        # Store result in Redis
        redis_client.setex(
            f"transcription:{session_id}",
            24 * 3600,  # 24 hours
            json.dumps(formatted_result)
        )
        
        # Send to LLM service for further processing
        await send_progress_update(session_id, 95, "Sending for analysis...", "processing")
        await send_to_llm_service(formatted_result)
        
        # Clean up GPU memory
        if DEVICE == "cuda":
            torch.cuda.empty_cache()
            gc.collect()
        
        # Send success update
        await send_progress_update(session_id, 100, "Transcription complete!", "completed")
        
        logger.info(f"Transcription completed for session: {session_id}")
        return formatted_result
        
    except Exception as e:
        logger.error(f"Error in transcription pipeline for session {session_id}: {e}")
        
        await send_progress_update(
            session_id, 
            0, 
            f"Transcription failed: {str(e)}", 
            "error"
        )
        
        # Store error information
        redis_client.setex(
            f"transcription_error:{session_id}",
            24 * 3600,
            json.dumps({
                "session_id": session_id,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
        )
        
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
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "device": DEVICE,
        "mock_diarization": SHOULD_MOCK,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)