#!/bin/bash
echo "Starting cleanup of stuck sessions..."

# Redis cleanup
echo "Cleaning Redis..."
microk8s kubectl exec -n whispernotes deployment/whispernotes-redis -- \
    redis-cli -a notes2025 FLUSHALL

# MinIO cleanup
echo "Cleaning MinIO bucket..."
microk8s kubectl exec -it -n minio pod/minio-55d5b54f79-p7lhf -- \
    rm -rf /bitnami/minio/data/whispernotes/*

# PostgreSQL cleanup (only clear non-user data if needed)
echo "PostgreSQL cleanup not needed - only stores user authentication data"
# Note: Users table and access_requests are kept for authentication
# Session data is automatically cleaned by Redis TTL

echo "Cleanup completed!"