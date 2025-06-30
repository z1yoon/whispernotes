# WhisperNotes

AI-powered meeting transcription platform that transforms videos into actionable insights.

## Features

- Upload large video files with resume capability
- AI transcription with speaker identification  
- Generate action items and meeting summaries
- Real-time processing progress
- Secure JWT authentication

## Architecture

**Services:**
- Auth Service - User authentication
- File Uploader - Video upload handling
- Video Processor - Format conversion
- WhisperX - AI transcription with GPU
- LLM Service - Intelligent analysis
- Frontend - Next.js web interface

**Infrastructure:**
- PostgreSQL, Redis, RabbitMQ, MinIO
- Kubernetes deployment with Helm
- Harbor container registry

## Deployment

### Prerequisites
- MicroK8s cluster with GPU support
- Harbor registry access
- GitLab CI/CD setup

### Required Environment Variables
Set in GitLab **Settings → CI/CD → Variables**:

```
HARBOR_PASSWORD
MICROK8S_KUBECONFIG_CONTENT
POSTGRES_PASSWORD
REDIS_PASSWORD
RABBITMQ_DEFAULT_PASS
MINIO_SECRET_KEY
JWT_SECRET_KEY
QWEN_API_KEY
HF_TOKEN
```

### Deploy
1. Push to `main` branch
2. Run manual deployment in GitLab CI/CD
3. Access at https://whispernotes.leeseng.net

## Usage

1. Upload video file (MP4, MOV, AVI, WebM)
2. Set number of speakers
3. Monitor processing progress
4. View transcripts and AI insights

## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **Backend**: FastAPI, Python
- **AI**: WhisperX, QWEN
- **Deploy**: Kubernetes, Helm, Docker
- **Storage**: PostgreSQL, Redis, MinIO