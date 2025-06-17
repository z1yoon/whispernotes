FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY file-uploader/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared utilities first
COPY shared_utils.py .

# Copy application code
COPY file-uploader/ .

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["python", "main.py"]