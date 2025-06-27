# WhisperNotes - AI-Powered Meeting Transcription Platform

WhisperNotes transforms meeting videos into intelligent, actionable insights using advanced AI technologies including WhisperX for transcription and DeepSeek for analysis.

## ✨ Features

- **Video Upload**: Support for large video files with chunked upload and resume capability
- **Advanced Transcription**: WhisperX integration with speaker diarization for accurate multi-speaker transcripts
- **Intelligent Analysis**: AI-powered generation of action items, meeting summaries, and key insights
- **Real-time Progress**: Live updates during processing via WebSocket
- **Secure Authentication**: JWT-based authentication with admin approval workflow
- **Modern UI**: React frontend with clean, intuitive design

## 🏗️ Architecture

### Core Services
- **Auth Service** (Port 8000) - User authentication and authorization
- **File Uploader** (Port 8002) - Chunked file upload with WebSocket progress
- **Video Processor** - Video format conversion and audio extraction
- **Whisper Transcriber** (Port 8003) - AI transcription with speaker diarization
- **LLM Service** (Port 8004) - AI analysis for intelligent insights
- **Frontend** (Port 3000) - Next.js React application

### Infrastructure
- **PostgreSQL** - Primary database
- **Redis** - Caching and session storage
- **RabbitMQ** - Message queue for service communication
- **MinIO** - Object storage for files

## 🚀 Quick Start

1. **Clone the repository**
2. **Start all services** using Docker Compose
3. **Access the application** at http://localhost:3000
4. **Upload your video file** (supports MP4, MOV, AVI, WebM formats)
5. **Set the number of speakers**
6. **Monitor real-time processing progress**
7. **View transcripts and AI-generated insights**


## 📚 Usage Guide

### Processing Pipeline

1. **Upload Stage**: Chunked file upload with resume capability
2. **Video Processing**: Format conversion and audio extraction
3. **Transcription**: AI-powered transcription with speaker identification
4. **Analysis**: AI analysis for actionable insights

### Key Features

- **Speaker Diarization**: Automatically identifies and separates different speakers
- **Action Items**: Extracts tasks and to-dos from meeting discussions
- **Meeting Summaries**: Generates concise summaries of key points
- **Progress Tracking**: Real-time updates throughout the processing pipeline
- **User Management**: Admin approval workflow for new users

## 🔧 Technology Stack

- **Frontend**: Next.js, React, TypeScript, Styled Components
- **Backend**: FastAPI, Python
- **Database**: PostgreSQL, Redis
- **Message Queue**: RabbitMQ
- **Storage**: MinIO
- **AI/ML**: WhisperX,QWEN
