# RTX 5090 Compatible WhisperX Dockerfile for Production
FROM pytorch/pytorch:2.7.0-cuda12.8-cudnn9-runtime

# Environment setup
ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Singapore \
    PYTHONUNBUFFERED=1 \
    CUDA_VISIBLE_DEVICES=0

WORKDIR /app

# Install system dependencies (minimal for production)
RUN apt-get update && apt-get install -y \
    ffmpeg git curl libsndfile1 libgomp1 ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --upgrade pip setuptools wheel

# Fix cuDNN library compatibility (cuDNN 8 to cuDNN 9 mapping for RTX 5090)
# Create proper symbolic links with absolute paths
RUN mkdir -p /usr/local/cuda/lib64 && \
    ln -sf /opt/conda/lib/python3.11/site-packages/nvidia/cudnn/lib/libcudnn.so.9 /usr/local/cuda/lib64/libcudnn.so.8 && \
    ln -sf /opt/conda/lib/python3.11/site-packages/nvidia/cudnn/lib/libcudnn_ops.so.9 /usr/local/cuda/lib64/libcudnn_ops_infer.so.8 && \
    ln -sf /opt/conda/lib/python3.11/site-packages/nvidia/cudnn/lib/libcudnn_ops.so.9 /usr/local/cuda/lib64/libcudnn_ops_train.so.8 && \
    ln -sf /opt/conda/lib/python3.11/site-packages/nvidia/cudnn/lib/libcudnn_adv.so.9 /usr/local/cuda/lib64/libcudnn_adv_infer.so.8 && \
    ln -sf /opt/conda/lib/python3.11/site-packages/nvidia/cudnn/lib/libcudnn_adv.so.9 /usr/local/cuda/lib64/libcudnn_adv_train.so.8 && \
    ln -sf /opt/conda/lib/python3.11/site-packages/nvidia/cudnn/lib/libcudnn_cnn.so.9 /usr/local/cuda/lib64/libcudnn_cnn_infer.so.8 && \
    ln -sf /opt/conda/lib/python3.11/site-packages/nvidia/cudnn/lib/libcudnn_cnn.so.9 /usr/local/cuda/lib64/libcudnn_cnn_train.so.8
# Install Python dependencies (includes official silero-vad)
COPY whisperx/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create directories and copy application
RUN mkdir -p /app/models /tmp/whisper_temp
COPY whisperx/ .

# GPU optimization environment for RTX 5090 with cuDNN library paths
ENV NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility \
    TORCH_CUDA_ARCH_LIST="12.0+PTX" \
    CUDA_LAUNCH_BLOCKING=0 \
    TORCH_ALLOW_TF32_CUBLAS_OVERRIDE=1 \
    LD_LIBRARY_PATH="/opt/conda/lib/python3.11/site-packages/nvidia/cudnn/lib:/usr/local/cuda/lib64:/opt/conda/lib:$LD_LIBRARY_PATH" \
    TRANSFORMERS_CACHE="/app/.cache/huggingface" \
    HF_HOME="/app/.cache/huggingface" \
    TRANSFORMERS_OFFLINE=0

# Verify installation
RUN python -c "import torch, whisperx; print('✅ All dependencies installed')"

# Create user first, then set up directories with proper ownership
RUN useradd -m -u 1000 whisperx

# Create only the directories actually needed by the app
RUN mkdir -p /tmp/whisper_temp /app/.cache/huggingface && \
    chown -R whisperx:whisperx /app /tmp/whisper_temp && \
    chmod -R 755 /app && \
    chmod -R 777 /tmp/whisper_temp

# Switch to non-root user
USER whisperx

# Health check and startup
EXPOSE 8003
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s \
    CMD curl -f http://localhost:8003/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003", "--workers", "1"]