FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY video-processor/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared utilities first
COPY shared_utils.py .

# Copy application code
COPY video-processor/ .

# Create temp and processed directories
RUN mkdir -p /app/temp /app/processed

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["python", "main.py"]