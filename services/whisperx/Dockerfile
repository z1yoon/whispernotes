# Simplified WhisperX Dockerfile
FROM pytorch/pytorch:2.1.2-cuda11.8-cudnn8-runtime

# Set non-interactive environment
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Singapore

WORKDIR /app

# Install system dependencies
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

# Copy requirements and install dependencies
COPY whisperx/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY whisperx/ .

# Create necessary directories with proper permissions
RUN mkdir -p /app/models /tmp/whisper_temp /root/.cache/huggingface && \
    chmod -R 755 /app/models /tmp/whisper_temp /root/.cache/huggingface

# Set environment variables for GPU optimization
ENV CUDA_VISIBLE_DEVICES=0
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility
ENV CUDA_LAUNCH_BLOCKING=0

# Verify CUDA (skip model pre-download to avoid build failures)
RUN python -c "import torch; print('PyTorch version:', torch.__version__); print('CUDA available:', torch.cuda.is_available())" && \
    python -c "import whisperx; print('WhisperX imported successfully')" && \
    echo "Model will be downloaded at runtime"

# Create non-root user for security
RUN useradd -m -u 1000 whisperx && \
    chown -R whisperx:whisperx /app /root/.cache/huggingface

USER whisperx

# Expose port
EXPOSE 8003

# Health check
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:8003/health || exit 1

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003", "--workers", "1", "--loop", "asyncio"]