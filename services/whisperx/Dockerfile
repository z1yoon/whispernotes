# Modern WhisperX Dockerfile with official Silero VAD
FROM pytorch/pytorch:2.7.0-cuda12.8-cudnn9-runtime

# Environment setup
ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Singapore \
    PYTHONUNBUFFERED=1 \
    CUDA_VISIBLE_DEVICES=0

WORKDIR /app

# Install system dependencies (single layer for efficiency)
RUN apt-get update && apt-get install -y \
    ffmpeg git curl libsndfile1 libgomp1 ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --upgrade pip setuptools wheel

# Install Python dependencies (includes official silero-vad)
COPY whisperx/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create directories and copy application
RUN mkdir -p /app/models /tmp/whisper_temp
COPY whisperx/ .

# GPU optimization environment
ENV NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility \
    TORCH_CUDA_ARCH_LIST="12.0+PTX"

# Verify installation
RUN python -c "import torch, whisperx; print('✅ All dependencies installed')"

# Security: non-root user
RUN useradd -m -u 1000 whisperx && chown -R whisperx:whisperx /app
USER whisperx
RUN mkdir -p /home/whisperx/.cache

# Health check and startup
EXPOSE 8003
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s \
    CMD curl -f http://localhost:8003/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003", "--workers", "1"]