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
from typing import Optional, List, Dict
import tempfile
import asyncio
import gc

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

# Redis for caching and progress tracking
redis_client = redis.Redis(host=os.getenv("REDIS_HOST", "localhost"), port=6379, decode_responses=True)

# Service URLs
LLM_SERVICE_URL = os.getenv("LLM_SERVICE_URL", "http://llm-service:8004")
FILE_UPLOADER_URL = os.getenv("FILE_UPLOADER_URL", "http://file-uploader:8002")

# Global model storage
models = {}

# Pydantic models
class TranscriptionRequest(BaseModel):
    session_id: str
    participant_count: int = 2
    language: Optional[str] = None

class TranscriptionResult(BaseModel):
    session_id: str
    transcript: str
    segments: List[Dict]
    speakers: Optional[Dict] = None
    duration: float
    language: str
    confidence_score: float

class SpeakerSegment(BaseModel):
    start: float
    end: float
    speaker: str
    text: str
    confidence: float

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

def load_whisper_model(model_size: str = "large-v3"):
    """Load WhisperX model with optimizations"""
    try:
        if model_size not in models:
            logger.info(f"Loading Whisper model: {model_size}")
            models[model_size] = whisperx.load_model(
                model_size, 
                device=DEVICE, 
                compute_type=COMPUTE_TYPE,
                language="en"  # Can be changed based on detection
            )
            logger.info(f"Model {model_size} loaded successfully")
        
        return models[model_size]
    except Exception as e:
        logger.error(f"Failed to load Whisper model: {e}")
        raise

def load_alignment_model(language_code: str):
    """Load alignment model for better timestamp accuracy"""
    try:
        alignment_key = f"align_{language_code}"
        if alignment_key not in models:
            logger.info(f"Loading alignment model for language: {language_code}")
            model_a, metadata = whisperx.load_align_model(
                language_code=language_code, 
                device=DEVICE
            )
            models[alignment_key] = (model_a, metadata)
            logger.info(f"Alignment model for {language_code} loaded successfully")
        
        return models[alignment_key]
    except Exception as e:
        logger.error(f"Failed to load alignment model: {e}")
        return None, None

def load_diarization_model():
    """Load speaker diarization model"""
    try:
        if "diarization" not in models and HF_TOKEN:
            logger.info("Loading diarization model")
            models["diarization"] = whisperx.DiarizationPipeline(
                use_auth_token=HF_TOKEN, 
                device=DEVICE
            )
            logger.info("Diarization model loaded successfully")
        
        return models.get("diarization")
    except Exception as e:
        logger.error(f"Failed to load diarization model: {e}")
        return None

def detect_language(audio_path: str, model) -> str:
    """Detect language from audio"""
    try:
        # Load a small portion of audio for language detection
        result = whisperx.transcribe(
            audio_path, 
            model, 
            batch_size=BATCH_SIZE,
            language=None  # Auto-detect
        )
        
        detected_language = result.get("language", "en")
        logger.info(f"Detected language: {detected_language}")
        return detected_language
        
    except Exception as e:
        logger.error(f"Language detection failed: {e}")
        return "en"  # Default to English

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
        logger.info("Aligning transcription...")
        
        result = whisperx.align(
            segments, 
            model_a, 
            metadata, 
            audio_path, 
            DEVICE, 
            return_char_alignments=False
        )
        
        logger.info("Alignment completed")
        return result
        
    except Exception as e:
        logger.error(f"Alignment failed: {e}")
        return segments  # Return original if alignment fails

def diarize_speakers(audio_path: str, diarization_model, participant_count: int):
    """Perform speaker diarization"""
    try:
        logger.info(f"Starting speaker diarization for {participant_count} participants...")
        
        diarize_segments = diarization_model(
            audio_path,
            num_speakers=participant_count
        )
        
        logger.info("Speaker diarization completed")
        return diarize_segments
        
    except Exception as e:
        logger.error(f"Speaker diarization failed: {e}")
        return None

def assign_speakers_to_segments(segments, diarize_segments):
    """Assign speakers to transcription segments"""
    try:
        logger.info("Assigning speakers to segments...")
        
        result = whisperx.assign_word_speakers(segments, diarize_segments)
        
        logger.info("Speaker assignment completed")
        return result
        
    except Exception as e:
        logger.error(f"Speaker assignment failed: {e}")
        return segments

def format_transcription_result(result, session_id: str, duration: float) -> dict:
    """Format transcription result for output"""
    try:
        segments = result.get("segments", [])
        
        # Create full transcript
        full_transcript = " ".join([seg.get("text", "").strip() for seg in segments])
        
        # Extract speaker information
        speakers = {}
        speaker_segments = []
        
        for i, segment in enumerate(segments):
            speaker = segment.get("speaker", f"Speaker_{i % 2 + 1}")
            
            if speaker not in speakers:
                speakers[speaker] = {
                    "name": speaker,
                    "total_duration": 0,
                    "word_count": 0
                }
            
            segment_duration = segment.get("end", 0) - segment.get("start", 0)
            word_count = len(segment.get("text", "").split())
            
            speakers[speaker]["total_duration"] += segment_duration
            speakers[speaker]["word_count"] += word_count
            
            speaker_segments.append({
                "start": segment.get("start", 0),
                "end": segment.get("end", 0),
                "speaker": speaker,
                "text": segment.get("text", "").strip(),
                "confidence": segment.get("avg_logprob", 0)
            })
        
        # Calculate overall confidence
        confidences = [seg.get("avg_logprob", 0) for seg in segments if seg.get("avg_logprob")]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        return {
            "session_id": session_id,
            "transcript": full_transcript,
            "segments": speaker_segments,
            "speakers": speakers,
            "duration": duration,
            "language": result.get("language", "en"),
            "confidence_score": avg_confidence,
            "word_count": len(full_transcript.split()),
            "segment_count": len(segments)
        }
        
    except Exception as e:
        logger.error(f"Error formatting transcription result: {e}")
        raise

async def send_to_llm_service(transcription_result: dict):
    """Send transcription to LLM service for processing"""
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                f"{LLM_SERVICE_URL}/process",
                json=transcription_result
            )
            
            if response.status_code == 200:
                logger.info(f"Transcription sent to LLM service: {transcription_result['session_id']}")
                return response.json()
            else:
                logger.error(f"Failed to send to LLM service: {response.text}")
                raise Exception(f"LLM service error: {response.text}")
                
    except Exception as e:
        logger.error(f"Error sending to LLM service: {e}")
        raise

async def transcribe_async(audio_path: str, session_id: str, participant_count: int, language: str = None):
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
        if participant_count > 1 and HF_TOKEN:
            await send_progress_update(session_id, 85, "Identifying speakers...", "processing")
            diarization_model = load_diarization_model()
            
            if diarization_model:
                diarize_segments = diarize_speakers(audio_path, diarization_model, participant_count)
                if diarize_segments:
                    result = assign_speakers_to_segments(result, diarize_segments)
        
        # Get audio duration
        import librosa
        y, sr = librosa.load(audio_path)
        duration = librosa.get_duration(y=y, sr=sr)
        
        # Format result
        await send_progress_update(session_id, 90, "Formatting transcription...", "processing")
        formatted_result = format_transcription_result(result, session_id, duration)
        
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
    language: Optional[str] = Form(None)
):
    """Transcribe uploaded audio file"""
    
    # Validate file type
    if not audio.content_type or not audio.content_type.startswith('audio/'):
        raise HTTPException(status_code=400, detail="Invalid audio file type")
    
    # Check if already processing
    processing_key = f"transcribing:{session_id}"
    if redis_client.get(processing_key):
        raise HTTPException(status_code=409, detail="Audio already being transcribed")
    
    # Mark as processing
    redis_client.setex(processing_key, 3600, "transcribing")  # 1 hour expiration
    
    try:
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
            language
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

async def cleanup_temp_file(file_path: str, delay: int = 3600):
    """Clean up temporary files after delay"""
    await asyncio.sleep(delay)
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Cleaned up temp file: {file_path}")
    except Exception as e:
        logger.error(f"Error cleaning up temp file {file_path}: {e}")

@app.get("/result/{session_id}")
async def get_transcription_result(session_id: str):
    """Get transcription result for a session"""
    
    # Check if currently processing
    processing_key = f"transcribing:{session_id}"
    if redis_client.get(processing_key):
        return {"session_id": session_id, "status": "transcribing"}
    
    # Check for completed transcription
    result_key = f"transcription:{session_id}"
    result_data = redis_client.get(result_key)
    if result_data:
        return {
            "session_id": session_id,
            "status": "completed",
            "result": json.loads(result_data)
        }
    
    # Check for errors
    error_key = f"transcription_error:{session_id}"
    error_data = redis_client.get(error_key)
    if error_data:
        return {
            "session_id": session_id,
            "status": "error",
            "error": json.loads(error_data)
        }
    
    raise HTTPException(status_code=404, detail="Transcription session not found")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check if models can be loaded
        whisper_available = True
        try:
            load_whisper_model("base")  # Load smaller model for health check
        except:
            whisper_available = False
        
        return {
            "status": "healthy",
            "service": "whisper-transcriber",
            "device": DEVICE,
            "whisper_available": whisper_available,
            "hf_token_configured": bool(HF_TOKEN)
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)