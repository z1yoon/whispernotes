FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including ffmpeg and build tools
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    curl \
    build-essential \
    libsndfile1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY whisper-transcriber/requirements.txt .

# Install all dependencies together to avoid conflicts
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy shared utilities
COPY shared_utils.py .

# Copy application code
COPY whisper-transcriber/ .

# Create necessary directories
RUN mkdir -p /app/models /tmp/whisper_temp /root/.cache/huggingface

# Set environment variables
ENV HF_HOME=/root/.cache/huggingface
ENV HF_HUB_CACHE=/root/.cache/huggingface/hub
ENV TRANSFORMERS_CACHE=/root/.cache/huggingface/transformers
ENV HF_HUB_DOWNLOAD_TIMEOUT=300
ENV DEVICE=cpu
ENV COMPUTE_TYPE=int8
ENV BATCH_SIZE=4
ENV SHOULD_MOCK_DIARIZATION=true

# Pre-download only base model to reduce startup time and memory usage
RUN python -c "import whisperx; print('Downloading base model...'); whisperx.load_model('base', device='cpu', compute_type='int8'); print('Base model downloaded')" || echo "Base model pre-download failed, will download at runtime"

# Expose port
EXPOSE 8003

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8003/health || exit 1

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003", "--workers", "1"]