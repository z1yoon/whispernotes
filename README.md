# WhisperNotes - AI-Powered Meeting Transcription Platform

WhisperNotes is a comprehensive microservices-based platform that transforms meeting videos into intelligent, actionable insights using advanced AI technologies including WhisperX for transcription and DeepSeek for analysis.

## 🚀 Features

- **Heavy Video Upload**: Supports up to 5GB video files with chunked upload and resume capability
- **Advanced Transcription**: WhisperX integration with speaker diarization for accurate multi-speaker transcripts
- **Intelligent Analysis**: DeepSeek AI integration for generating:
  - Action items and to-do lists
  - Meeting summaries
  - Key decisions and outcomes
  - Risk and opportunity identification
  - Participant engagement analysis
- **Real-time Progress**: WebSocket-based live updates during processing
- **Secure Authentication**: JWT-based authentication with admin approval workflow
- **Modern UI**: React frontend with Figma-inspired design
- **Scalable Architecture**: Microservices with message queues and distributed storage

## 🏗️ Architecture

### Microservices
1. **Auth Service** (Port 8000) - User authentication and authorization
2. **File Uploader** (Port 8001) - Chunked file upload with WebSocket progress
3. **Video Processor** - Video format conversion and audio extraction
4. **Whisper Transcriber** - AI transcription with speaker diarization
5. **LLM Service** - DeepSeek integration for intelligent analysis
6. **Frontend** (Port 3000) - React application

### Infrastructure
- **PostgreSQL** - Primary database
- **Redis** - Caching and session storage
- **RabbitMQ** - Message queue for service communication
- **MinIO** - Object storage for files
- **Nginx** - Reverse proxy and load balancing
- **Prometheus & Grafana** - Monitoring and observability

## 📋 Prerequisites

- Docker and Docker Compose
- 8GB+ RAM (recommended for AI processing)
- DeepSeek API key
- (Optional) Hugging Face token for enhanced speaker diarization

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd whisper-notes
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` file with your API keys:

```bash
# Required: DeepSeek API Configuration
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Optional: Enhanced speaker diarization
HUGGINGFACE_TOKEN=your_huggingface_token_here

# Update other configurations as needed
```

### 3. Start Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
```

### 4. Access Applications

- **Frontend**: http://localhost:3000
- **Admin Login**: admin@whispernotes.com / admin123
- **RabbitMQ Management**: http://localhost:15672 (whisper/notes2024)
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin123)
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090

## 📚 Usage Guide

### Initial Setup

1. **Access the application** at http://localhost:3000
2. **Login as admin** using admin@whispernotes.com / admin123
3. **Upload a video** (up to 5GB, supports MP4, MOV, AVI, WebM)
4. **Set participant count** (2-6 speakers)
5. **Monitor real-time progress** through the processing stages
6. **View results** including transcript, action items, and insights

### Processing Stages

1. **Upload** - Chunked file upload with resume capability
2. **Video Processing** - Format conversion and audio extraction
3. **Transcription** - WhisperX AI transcription with speaker identification
4. **Analysis** - DeepSeek AI analysis for actionable insights

### User Management

- Admin users can approve access requests
- New users request access through the frontend
- Email notifications for approval status

## 🔧 Development

### Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Auth Service   │    │ File Uploader   │
│   (React)       │────│   (FastAPI)     │    │   (FastAPI)     │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 8001    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   RabbitMQ      │
                    │   Message Bus   │
                    └─────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│Video Processor  │ │Whisper Transcr. │ │  LLM Service    │
│   (FFmpeg)      │ │   (WhisperX)    │ │   (DeepSeek)    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Local Development

```bash
# Start infrastructure only
docker-compose up -d postgres redis rabbitmq minio

# Run services individually for development
cd services/auth-service
pip install -r requirements.txt
python main.py

# Or use Docker for specific services
docker-compose up auth-service file-uploader
```

### API Documentation

- **Auth Service**: http://localhost:8000/docs
- **File Uploader**: http://localhost:8001/docs

## 🐳 Docker Services

### Core Services
- `auth-service` - Authentication and user management
- `file-uploader` - File upload handling with WebSocket
- `video-processor` - Video processing and audio extraction
- `whisper-transcriber` - AI transcription service
- `llm-service` - LLM analysis service
- `frontend` - React frontend application

### Infrastructure
- `postgres` - PostgreSQL database
- `redis` - Redis cache
- `rabbitmq` - Message queue
- `minio` - Object storage
- `nginx` - Reverse proxy

### Monitoring
- `prometheus` - Metrics collection
- `grafana` - Monitoring dashboards

## 🔒 Security

- JWT-based authentication with secure token handling
- Admin approval workflow for new users
- Rate limiting on file uploads
- Secure file storage with MinIO
- Environment-based configuration
- Network isolation through Docker

## 📊 Monitoring

### Metrics Available
- Service health and uptime
- File processing statistics
- Upload success/failure rates
- Processing duration metrics
- Resource utilization

### Grafana Dashboards
- System overview
- Processing pipeline metrics
- User activity
- Error tracking

## 🛠️ Configuration

### Environment Variables

Key configurations in `.env`:

```bash
# AI Services
DEEPSEEK_API_KEY=xxx
WHISPER_MODEL=large-v2
DEVICE=cpu

# File Limits
MAX_FILE_SIZE=5368709120  # 5GB
CHUNK_SIZE=10485760       # 10MB

# Security
JWT_SECRET=secure-secret-key
```

### Scaling Configuration

```bash
# Scale specific services
docker-compose up --scale video-processor=3 --scale whisper-transcriber=2

# Resource limits in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 4G
    reservations:
      memory: 2G
```

## 🚨 Troubleshooting

### Common Issues

1. **Out of Memory during processing**
   ```bash
   # Reduce Whisper model size
   WHISPER_MODEL=medium  # or small, base
   ```

2. **Upload failures**
   ```bash
   # Check MinIO connectivity
   docker-compose logs minio
   
   # Verify Redis connection
   docker-compose logs redis
   ```

3. **Processing stuck**
   ```bash
   # Check RabbitMQ queues
   # Visit: http://localhost:15672
   
   # Restart processing services
   docker-compose restart video-processor whisper-transcriber
   ```

### Log Analysis

```bash
# View all logs
docker-compose logs -f

# Service-specific logs
docker-compose logs -f whisper-transcriber
docker-compose logs -f llm-service

# Follow processing pipeline
docker-compose logs -f | grep "file_id"
```

## 📈 Performance Optimization

### Hardware Recommendations
- **Minimum**: 8GB RAM, 4 CPU cores, 100GB storage
- **Recommended**: 16GB RAM, 8 CPU cores, 500GB SSD
- **GPU Support**: NVIDIA GPU with CUDA for faster transcription

### Optimization Tips
1. Use SSD storage for better I/O performance
2. Enable GPU acceleration for Whisper
3. Scale worker services based on load
4. Optimize chunk sizes for network conditions
5. Use CDN for static assets in production

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review service logs for error details

## 🔄 Updates

### Version 1.0.0
- Initial microservices architecture
- WhisperX integration for transcription
- DeepSeek AI analysis
- React frontend with Figma design
- Docker containerization
- Real-time progress tracking
- Admin authentication system


