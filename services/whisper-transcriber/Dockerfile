FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including ffmpeg and build tools
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU version first
RUN pip install torch==2.0.1 torchvision==0.15.2 torchaudio==2.0.2 --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install Python dependencies
COPY whisper-transcriber/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared utilities first
COPY shared_utils.py .

# Copy application code
COPY whisper-transcriber/ .

# Create models and temp directories
RUN mkdir -p /app/models /tmp/transcription

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["python", "main.py"]