# Optimized NVIDIA GPU Dockerfile for on-premise deployment
# Using PyTorch official image with CUDA 11.8 runtime - most stable for production
FROM pytorch/pytorch:2.1.2-cuda11.8-cudnn8-runtime

WORKDIR /app

# Install system dependencies (minimal for runtime)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    curl \
    libsndfile1 \
    libgomp1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install core dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Copy requirements and install remaining dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared utilities
COPY shared_utils.py .

# Copy application code
COPY . .

# Create necessary directories with proper permissions
RUN mkdir -p /app/models /tmp/whisper_temp /root/.cache/huggingface && \
    chmod -R 755 /app/models /tmp/whisper_temp /root/.cache/huggingface

# Set environment variables for GPU optimization
ENV HF_HOME=/root/.cache/huggingface
ENV HF_HUB_CACHE=/root/.cache/huggingface/hub
ENV TRANSFORMERS_CACHE=/root/.cache/huggingface/transformers
ENV HF_HUB_DOWNLOAD_TIMEOUT=600
ENV DEVICE=cuda
ENV COMPUTE_TYPE=float16
ENV BATCH_SIZE=16
ENV SHOULD_MOCK_DIARIZATION=false
ENV CUDA_VISIBLE_DEVICES=0
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility
ENV CUDA_LAUNCH_BLOCKING=0

# Verify CUDA installation and pre-download base model
RUN python -c "import torch; print('PyTorch version:', torch.__version__); print('CUDA available:', torch.cuda.is_available()); print('CUDA version:', torch.version.cuda if torch.cuda.is_available() else 'Not available')" && \
    python -c "import whisperx; print('Downloading base model for GPU...'); model = whisperx.load_model('base', device='cpu', compute_type='int8'); print('Base model downloaded successfully')" || echo "Base model pre-download failed, will download at runtime"

# Expose port
EXPOSE 8003

# Add comprehensive health check
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s --retries=5 \
    CMD curl -f http://localhost:8003/health || exit 1

# Use non-root user for security (optional but recommended)
RUN useradd -m -u 1000 whisperx && \
    chown -R whisperx:whisperx /app /root/.cache/huggingface
USER whisperx

# Command to run the application with optimized settings
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003", "--workers", "1", "--loop", "asyncio"]