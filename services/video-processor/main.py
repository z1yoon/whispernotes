import os
import json
import asyncio
import subprocess
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import redis
import httpx
from datetime import datetime
from typing import Optional

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
redis_client = redis.Redis(host=os.getenv("REDIS_HOST", "localhost"), port=6379, decode_responses=True)

# Service URLs
WHISPER_SERVICE_URL = os.getenv("WHISPER_SERVICE_URL", "http://whisper-transcriber:8005")
FILE_UPLOADER_URL = os.getenv("FILE_UPLOADER_URL", "http://file-uploader:8002")

# Ensure directories exist
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

# Pydantic models
class ProcessRequest(BaseModel):
    file_path: str
    session_id: str
    participant_count: int = 2

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
    """Get video information using ffprobe"""
    try:
        cmd = [
            'ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', file_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        info = json.loads(result.stdout)
        
        # Extract relevant information
        video_info = {
            "duration": float(info["format"]["duration"]),
            "size": int(info["format"]["size"]),
            "format": info["format"]["format_name"],
            "streams": []
        }
        
        for stream in info["streams"]:
            if stream["codec_type"] == "video":
                video_info["streams"].append({
                    "type": "video",
                    "codec": stream["codec_name"],
                    "width": stream.get("width"),
                    "height": stream.get("height"),
                    "fps": eval(stream.get("r_frame_rate", "0/1"))
                })
            elif stream["codec_type"] == "audio":
                video_info["streams"].append({
                    "type": "audio",
                    "codec": stream["codec_name"],
                    "sample_rate": int(stream.get("sample_rate", 0)),
                    "channels": int(stream.get("channels", 0))
                })
        
        return video_info
    
    except subprocess.CalledProcessError as e:
        logger.error(f"ffprobe error: {e}")
        raise Exception(f"Failed to analyze video: {e}")
    except Exception as e:
        logger.error(f"Error getting video info: {e}")
        raise

def extract_audio(video_path: str, audio_path: str) -> bool:
    """Extract audio from video using ffmpeg"""
    try:
        cmd = [
            'ffmpeg', '-i', video_path,
            '-vn',  # No video
            '-acodec', 'pcm_s16le',  # PCM 16-bit little-endian
            '-ar', '16000',  # 16kHz sample rate (optimal for Whisper)
            '-ac', '1',  # Mono
            '-y',  # Overwrite output file
            audio_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        logger.info(f"Audio extracted successfully: {audio_path}")
        return True
        
    except subprocess.CalledProcessError as e:
        logger.error(f"ffmpeg error: {e.stderr}")
        raise Exception(f"Failed to extract audio: {e.stderr}")
    except Exception as e:
        logger.error(f"Error extracting audio: {e}")
        raise

def normalize_audio(input_path: str, output_path: str) -> bool:
    """Normalize audio levels for better transcription"""
    try:
        cmd = [
            'ffmpeg', '-i', input_path,
            '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',  # EBU R128 loudness normalization
            '-ar', '16000',
            '-ac', '1',
            '-y',
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        logger.info(f"Audio normalized successfully: {output_path}")
        return True
        
    except subprocess.CalledProcessError as e:
        logger.error(f"Audio normalization error: {e.stderr}")
        raise Exception(f"Failed to normalize audio: {e.stderr}")

def enhance_audio_for_speech(input_path: str, output_path: str) -> bool:
    """Apply audio enhancement specifically for speech recognition"""
    try:
        # Apply noise reduction and speech enhancement
        cmd = [
            'ffmpeg', '-i', input_path,
            '-af', 'highpass=f=80,lowpass=f=8000,loudnorm=I=-16:TP=-1.5:LRA=11',
            '-ar', '16000',
            '-ac', '1',
            '-y',
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        logger.info(f"Audio enhanced for speech: {output_path}")
        return True
        
    except subprocess.CalledProcessError as e:
        logger.error(f"Audio enhancement error: {e.stderr}")
        # If enhancement fails, fallback to basic extraction
        return extract_audio(input_path, output_path)

async def send_to_whisper_service(audio_path: str, session_id: str, participant_count: int):
    """Send processed audio to Whisper transcription service"""
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:  # 5 minute timeout
            with open(audio_path, 'rb') as audio_file:
                files = {'audio': audio_file}
                data = {
                    'session_id': session_id,
                    'participant_count': participant_count
                }
                
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

async def process_video_async(file_path: str, session_id: str, participant_count: int):
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
            participant_count
        )
        
        await send_progress_update(session_id, 100, "Video processing completed!", "completed")
        
        logger.info(f"Video processing completed for session: {session_id}")
        
        # Clean up processed audio file after some time (background task)
        asyncio.create_task(cleanup_files(enhanced_audio_path, delay=3600))  # 1 hour delay
        
        return {
            "session_id": session_id,
            "status": "completed",
            "duration": duration,
            "transcription_result": transcription_result
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

async def cleanup_files(file_path: str, delay: int = 3600):
    """Clean up processed files after delay"""
    await asyncio.sleep(delay)
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Cleaned up file: {file_path}")
    except Exception as e:
        logger.error(f"Error cleaning up file {file_path}: {e}")

# API Routes
@app.post("/process")
async def process_video(request: ProcessRequest, background_tasks: BackgroundTasks):
    """Process video file and extract audio for transcription"""
    
    # Validate file exists
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    # Check if already processing
    processing_key = f"processing:{request.session_id}"
    if redis_client.get(processing_key):
        raise HTTPException(status_code=409, detail="Video already being processed")
    
    # Mark as processing
    redis_client.setex(processing_key, 3600, "processing")  # 1 hour expiration
    
    # Start background processing
    background_tasks.add_task(
        process_video_async,
        request.file_path,
        request.session_id,
        request.participant_count
    )
    
    return {
        "message": "Video processing started",
        "session_id": request.session_id,
        "status": "processing"
    }

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
    """Health check endpoint"""
    # Check if ffmpeg is available
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        ffmpeg_available = True
    except:
        ffmpeg_available = False
    
    return {
        "status": "healthy",
        "service": "video-processor",
        "ffmpeg_available": ffmpeg_available
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)