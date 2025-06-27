FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including gcc for some Python packages and curl for health checks
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY auth-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared utilities first
COPY shared_utils.py .

# Copy application code
COPY auth-service/ .

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["python", "main.py"]