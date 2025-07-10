# Modern WhisperX Dockerfile with CUDA 12.1 and cuDNN 8.x
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

# Environment setup
ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Singapore \
    PYTHONUNBUFFERED=1 \
    CUDA_VISIBLE_DEVICES=0

WORKDIR /app

# Install system dependencies including Python
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-dev \
    ffmpeg git curl libsndfile1 libgomp1 ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && pip install --no-cache-dir --upgrade pip setuptools wheel

# Install PyTorch with CUDA 12.1 support (better RTX 5090 compatibility)
RUN pip install --no-cache-dir torch==2.1.2 torchvision==0.16.2 torchaudio==2.1.2 --index-url https://download.pytorch.org/whl/cu121
# Install Python dependencies (includes official silero-vad)
COPY whisperx/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create directories and copy application
RUN mkdir -p /app/models /tmp/whisper_temp
COPY whisperx/ .

# GPU optimization environment (compatible with RTX 30/40/50 series)
ENV NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility \
    TORCH_CUDA_ARCH_LIST="8.0;8.6;8.9+PTX" \
    CUDA_LAUNCH_BLOCKING=0 \
    TORCH_ALLOW_TF32_CUBLAS_OVERRIDE=1

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