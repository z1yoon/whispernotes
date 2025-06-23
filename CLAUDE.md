# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WhisperNotes is a comprehensive AI-powered meeting transcription platform built with microservices architecture. It transforms video meetings into intelligent, actionable insights using WhisperX for transcription and DeepSeek for analysis.

## Architecture 

### Technology Stack
- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS, Zustand state management
- **Backend**: Multiple FastAPI services (Python) 
- **Database**: PostgreSQL with Redis caching
- **Message Queue**: RabbitMQ for inter-service communication
- **Storage**: MinIO object storage for files up to 5GB
- **AI Services**: WhisperX for transcription, DeepSeek for analysis

### Service Structure
```
services/
├── frontend/           # Next.js app (Port 3000)
├── auth-service/       # JWT authentication (Port 8000)
├── file-uploader/      # Chunked upload + WebSocket (Port 8001)
├── video-processor/    # FFmpeg processing
├── whisper-transcriber/ # AI transcription (Port 8003)
├── llm-service/        # DeepSeek analysis
└── shared_utils.py     # Shared utilities
```

## Development Commands

### Start Services
```bash
# Start all services
docker-compose up -d

# Start infrastructure only (for local development)
docker-compose up -d postgres redis rabbitmq minio

# View logs
docker-compose logs -f

# Scale specific services
docker-compose up --scale video-processor=3
```

### Frontend Development
```bash
cd services/frontend
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint
```

### Backend Services
```bash
# Each service has requirements.txt
cd services/auth-service
pip install -r requirements.txt
python main.py

# API docs available at:
# Auth Service: http://localhost:8000/docs
# File Uploader: http://localhost:8001/docs
```

### Testing & Quality
```bash
# Frontend linting
cd services/frontend && npm run lint

# Check service health
docker-compose ps

# Monitor processing pipeline
docker-compose logs -f | grep "file_id"
```

## Key Development Patterns

### Authentication Flow
- JWT-based authentication with admin approval workflow
- Tokens handled via custom auth provider in frontend
- Admin users can approve access requests

### File Processing Pipeline
1. Chunked upload with resume capability (up to 5GB)
2. WebSocket progress tracking
3. RabbitMQ message queue coordination
4. Video processing → Audio extraction → Transcription → AI analysis

### State Management
- Frontend uses Zustand for global state
- TanStack React Query for server state
- Redis for session/cache storage

### API Integration
- Axios with interceptors for authenticated requests
- FastAPI services with automatic OpenAPI docs
- Environment-based configuration

## Access Points

- **Frontend**: http://localhost:3000
- **Admin Login**: admin@whispernotes.com / admin123
- **RabbitMQ Management**: http://localhost:15672 (whisper/notes2024)
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin123)

## Environment Configuration

Key environment variables in `.env`:
- `DEEPSEEK_API_KEY`: Required for LLM analysis
- `HUGGINGFACE_TOKEN`: Optional for enhanced speaker diarization
- `WHISPER_MODEL`: Model size (large-v2, medium, small, base)
- `MAX_FILE_SIZE`: Upload limit (default 5GB)
- `JWT_SECRET`: Authentication secret

## Common Development Tasks

### Adding New API Endpoints
1. Add route to appropriate FastAPI service
2. Update database schema if needed (edit `init.sql`)
3. Add frontend API client functions
4. Implement UI components with proper error handling

### Debugging Processing Issues
```bash
# Check message queues
docker-compose logs rabbitmq

# Monitor file processing
docker-compose logs -f video-processor whisper-transcriber

# Check storage connectivity
docker-compose logs minio
```

### Performance Optimization
- Use GPU acceleration: Set `DEVICE=cuda` in environment
- Adjust Whisper model size based on resource constraints
- Scale worker services based on processing load
- Monitor memory usage during large file processing