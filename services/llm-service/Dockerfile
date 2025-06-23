FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY llm-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared utilities first
COPY shared_utils.py .

# Copy application code
COPY llm-service/ .

# Create analysis directory
RUN mkdir -p /tmp/analysis

# Expose port
EXPOSE 8004

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004"]