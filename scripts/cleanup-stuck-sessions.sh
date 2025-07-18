#!/bin/bash

# Get stuck session IDs
STUCK_SESSIONS=$(microk8s kubectl exec -n whispernotes deployment/whispernotes-postgres -- \
    psql -U whispernotes -d whispernotes -t -c \
    "SELECT id FROM sessions WHERE status IN ('uploading', 'processing', 'transcribing') 
     AND created_at < NOW() - INTERVAL '2 hours';" | tr -d ' ' | grep -v '^$')

if [ -z "$STUCK_SESSIONS" ]; then
    echo "✅ No stuck sessions found"
    exit 0
fi

echo "📋 Found stuck sessions:"
echo "$STUCK_SESSIONS" | sed 's/^/  - /'

# Clean Redis
echo ""
echo "🔥 Cleaning Redis..."
echo "$STUCK_SESSIONS" | while read session_id; do
    microk8s kubectl exec -n whispernotes deployment/whispernotes-redis -- \
        redis-cli DEL "progress:$session_id" "cache:session:$session_id" >/dev/null 2>&1
done

# Clean MinIO
echo "🔥 Cleaning MinIO..."
echo "$STUCK_SESSIONS" | while read session_id; do
    microk8s kubectl exec -n whispernotes deployment/whispernotes-minio -- \
        mc rm --recursive --force --quiet /data/video-files/$session_id/ 2>/dev/null || true
    kubectl exec -n whispernotes deployment/whispernotes-minio -- \
        mc rm --recursive --force --quiet /data/transcripts/$session_id/ 2>/dev/null || true
done

# Clean PostgreSQL
echo "🔥 Cleaning PostgreSQL..."
kubectl exec -n whispernotes deployment/whispernotes-postgres -- \
    psql -U whispernotes -d whispernotes -c \
    "DELETE FROM sessions WHERE status IN ('uploading', 'processing', 'transcribing') 
     AND created_at < NOW() - INTERVAL '2 hours';" >/dev/null

echo "✅ Cleanup completed!"