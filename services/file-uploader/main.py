from fastapi import FastAPI, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import uuid
import asyncio
import json
import aiofiles
import hashlib
from typing import Dict, List
import logging
from datetime import datetime
import redis
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="WhisperNotes File Uploader", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
UPLOAD_DIR = "/app/uploads"
CHUNK_SIZE = 10 * 1024 * 1024  # 10MB chunks
MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024  # 5GB max file size

# Redis for session management
redis_client = redis.Redis(host=os.getenv("REDIS_HOST", "localhost"), port=6379, decode_responses=True)

# Service URLs
VIDEO_PROCESSOR_URL = os.getenv("VIDEO_PROCESSOR_URL", "http://video-processor:8003")
WHISPER_SERVICE_URL = os.getenv("WHISPER_SERVICE_URL", "http://whisper-transcriber:8005")

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket connected for session: {session_id}")

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info(f"WebSocket disconnected for session: {session_id}")

    async def send_progress(self, session_id: str, data: dict):
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_text(json.dumps({
                    "type": "upload_progress",
                    "session_id": session_id,
                    "data": data
                }))
            except Exception as e:
                logger.error(f"Error sending progress to {session_id}: {e}")
                self.disconnect(session_id)

manager = ConnectionManager()

# Pydantic models
class UploadSession(BaseModel):
    session_id: str
    filename: str
    file_size: int
    file_type: str
    participant_count: int
    total_chunks: int
    chunk_size: int
    uploaded_chunks: List[int] = []
    status: str = "uploading"
    created_at: str
    file_path: str = ""

class ProgressUpdate(BaseModel):
    progress: float
    message: str
    status: str
    uploaded_chunks: int = 0
    total_chunks: int = 0

# Helper functions
def calculate_file_hash(file_data: bytes) -> str:
    """Calculate MD5 hash of file data"""
    return hashlib.md5(file_data).hexdigest()

def get_upload_session(session_id: str) -> UploadSession:
    """Get upload session from Redis"""
    session_data = redis_client.get(f"upload_session:{session_id}")
    if session_data:
        return UploadSession.parse_raw(session_data)
    return None

def save_upload_session(session: UploadSession):
    """Save upload session to Redis"""
    redis_client.setex(
        f"upload_session:{session.session_id}",
        3600,  # 1 hour expiration
        session.json()
    )

async def send_to_video_processor(file_path: str, session_id: str, participant_count: int):
    """Send file to video processor service"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{VIDEO_PROCESSOR_URL}/process",
                json={
                    "file_path": file_path,
                    "session_id": session_id,
                    "participant_count": participant_count
                }
            )
            
            if response.status_code == 200:
                logger.info(f"File sent to video processor: {session_id}")
                return True
            else:
                logger.error(f"Failed to send to video processor: {response.text}")
                return False
                
    except Exception as e:
        logger.error(f"Error sending to video processor: {e}")
        return False

# API Routes
@app.post("/upload/initiate")
async def initiate_upload(
    filename: str = Form(...),
    file_size: int = Form(...),
    file_type: str = Form(...),
    participant_count: int = Form(default=2)
):
    """Initiate a chunked file upload session"""
    
    # Validate file size
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / (1024**3):.1f}GB"
        )
    
    # Validate file type
    allowed_types = ["video/mp4", "video/mov", "video/avi", "video/webm", "video/quicktime"]
    if file_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload MP4, MOV, AVI, or WebM files."
        )
    
    # Generate session ID
    session_id = str(uuid.uuid4())
    
    # Calculate total chunks
    total_chunks = (file_size + CHUNK_SIZE - 1) // CHUNK_SIZE
    
    # Create upload session
    session = UploadSession(
        session_id=session_id,
        filename=filename,
        file_size=file_size,
        file_type=file_type,
        participant_count=participant_count,
        total_chunks=total_chunks,
        chunk_size=CHUNK_SIZE,
        created_at=datetime.utcnow().isoformat(),
        file_path=os.path.join(UPLOAD_DIR, f"{session_id}_{filename}")
    )
    
    # Save session
    save_upload_session(session)
    
    logger.info(f"Upload session initiated: {session_id} for file: {filename}")
    
    return {
        "session_id": session_id,
        "total_chunks": total_chunks,
        "chunk_size": CHUNK_SIZE
    }

@app.post("/upload/chunk/{session_id}")
async def upload_chunk(
    session_id: str,
    chunk_number: int = Form(...),
    chunk: UploadFile = File(...)
):
    """Upload a file chunk"""
    
    # Get upload session
    session = get_upload_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Upload session not found")
    
    # Validate chunk number
    if chunk_number >= session.total_chunks or chunk_number < 0:
        raise HTTPException(status_code=400, detail="Invalid chunk number")
    
    # Check if chunk already uploaded
    if chunk_number in session.uploaded_chunks:
        return {"message": "Chunk already uploaded", "chunk_number": chunk_number}
    
    try:
        # Read chunk data
        chunk_data = await chunk.read()
        
        # Write chunk to temporary file
        chunk_file_path = f"{session.file_path}.chunk_{chunk_number}"
        async with aiofiles.open(chunk_file_path, 'wb') as f:
            await f.write(chunk_data)
        
        # Update session
        session.uploaded_chunks.append(chunk_number)
        save_upload_session(session)
        
        # Calculate progress
        progress = (len(session.uploaded_chunks) / session.total_chunks) * 100
        
        # Send progress update via WebSocket
        await manager.send_progress(session_id, {
            "progress": progress,
            "message": f"Uploaded chunk {chunk_number + 1} of {session.total_chunks}",
            "status": "uploading",
            "uploaded_chunks": len(session.uploaded_chunks),
            "total_chunks": session.total_chunks
        })
        
        logger.info(f"Chunk {chunk_number} uploaded for session {session_id}")
        
        return {
            "message": "Chunk uploaded successfully",
            "chunk_number": chunk_number,
            "progress": progress
        }
        
    except Exception as e:
        logger.error(f"Error uploading chunk {chunk_number} for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload chunk")

@app.post("/upload/complete/{session_id}")
async def complete_upload(session_id: str):
    """Complete the upload by combining all chunks"""
    
    # Get upload session
    session = get_upload_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Upload session not found")
    
    # Check if all chunks are uploaded
    if len(session.uploaded_chunks) != session.total_chunks:
        raise HTTPException(
            status_code=400,
            detail=f"Missing chunks. Expected {session.total_chunks}, got {len(session.uploaded_chunks)}"
        )
    
    try:
        # Combine chunks into final file
        async with aiofiles.open(session.file_path, 'wb') as final_file:
            for chunk_number in range(session.total_chunks):
                chunk_file_path = f"{session.file_path}.chunk_{chunk_number}"
                
                if os.path.exists(chunk_file_path):
                    async with aiofiles.open(chunk_file_path, 'rb') as chunk_file:
                        chunk_data = await chunk_file.read()
                        await final_file.write(chunk_data)
                    
                    # Remove chunk file
                    os.remove(chunk_file_path)
                else:
                    raise Exception(f"Chunk file {chunk_number} not found")
        
        # Update session status
        session.status = "processing"
        save_upload_session(session)
        
        # Generate file ID
        file_id = str(uuid.uuid4())
        
        # Store file metadata
        redis_client.setex(
            f"file_metadata:{file_id}",
            24 * 3600,  # 24 hours
            json.dumps({
                "file_id": file_id,
                "session_id": session_id,
                "filename": session.filename,
                "file_path": session.file_path,
                "file_size": session.file_size,
                "participant_count": session.participant_count,
                "status": "processing",
                "created_at": session.created_at
            })
        )
        
        # Send to video processor service
        await send_to_video_processor(session.file_path, session_id, session.participant_count)
        
        # Send completion update via WebSocket
        await manager.send_progress(session_id, {
            "progress": 100,
            "message": "Upload completed! Starting video processing...",
            "status": "processing",
            "file_id": file_id
        })
        
        logger.info(f"Upload completed for session {session_id}, file_id: {file_id}")
        
        return {
            "message": "Upload completed successfully",
            "file_id": file_id,
            "status": "processing"
        }
        
    except Exception as e:
        logger.error(f"Error completing upload for session {session_id}: {e}")
        
        # Update session with error status
        session.status = "error"
        save_upload_session(session)
        
        # Send error update via WebSocket
        await manager.send_progress(session_id, {
            "progress": 0,
            "message": f"Upload failed: {str(e)}",
            "status": "error"
        })
        
        raise HTTPException(status_code=500, detail="Failed to complete upload")

@app.get("/upload/status/{session_id}")
async def get_upload_status(session_id: str):
    """Get upload session status"""
    session = get_upload_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Upload session not found")
    
    progress = (len(session.uploaded_chunks) / session.total_chunks) * 100 if session.total_chunks > 0 else 0
    
    return {
        "session_id": session_id,
        "status": session.status,
        "progress": progress,
        "uploaded_chunks": len(session.uploaded_chunks),
        "total_chunks": session.total_chunks,
        "filename": session.filename
    }

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time upload progress"""
    await manager.connect(websocket, session_id)
    try:
        while True:
            # Keep connection alive
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(session_id)

# Endpoint for other services to update progress
@app.post("/upload/progress/{session_id}")
async def update_progress(session_id: str, progress_data: ProgressUpdate):
    """Update upload progress (called by other services)"""
    await manager.send_progress(session_id, progress_data.dict())
    return {"message": "Progress updated"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "file-uploader"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)