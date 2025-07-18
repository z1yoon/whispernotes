# Whisper Notes - Architecture Overview

## Tech Stack
- **Frontend**: Next.js (App Router) with TypeScript
- **Backend**: FastAPI (Python) microservices
- **Database**: PostgreSQL (metadata only)
- **File Storage**: MinIO (S3-compatible) - **Long-term persistent storage**
- **Cache/Progress**: Redis
- **Message Queue**: RabbitMQ

## Architecture Flow
1. **Upload**: Large video files → MinIO (multipart upload)
2. **Process**: RabbitMQ queues → WhisperX transcription → Results stored in Redis
3. **Track**: All session data & progress → Redis (with TTL auto-cleanup)
4. **Auth**: User authentication → PostgreSQL only

## Data Storage Strategy - **SIMPLIFIED REDIS-ONLY APPROACH**

### PostgreSQL (Authentication Only)
```sql
-- User authentication and access control only
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE access_requests (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  requested_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by UUID
);
```

### Redis (All Session Data with Auto-Cleanup)
```
upload_session:{sessionId}        # File metadata & processing info (TTL: 24h)
transcription:{sessionId}         # WhisperX transcript results (TTL: 24h)
upload_progress:{sessionId}       # Real-time progress updates (TTL: 24h)
user_sessions:{userId}            # User's session list (TTL: 1h)
```

### MinIO (Video Files Only)
```
{sessionId}/original.mp4          # Original video files only
transcript_edits/{sessionId}/     # Optional: transcript edit history
```

**✅ Benefits of This Simplified Approach:**
- **Simpler**: No complex database schemas for temporary data
- **Self-cleaning**: Redis TTL automatically removes old sessions
- **Faster**: No PostgreSQL writes during upload/processing
- **Stateless**: Perfect for container-based architecture
- **Cost-effective**: Only store authentication data in PostgreSQL

## Real-time Progress Updates - **FINAL DECISION**

### **🎯 Modern Approach: Next.js Server-Sent Events (SSE)**
**Why this is the best choice:**
- ✅ **Native Next.js support** - No external libraries needed
- ✅ **Simpler than WebSockets** - No connection state management
- ✅ **Auto-reconnection** - Built-in browser feature
- ✅ **Perfect for one-way updates** - Exactly what you need for progress
- ✅ **Works with your existing Redis** - Seamless integration
- ✅ **Scales better** - Less server resources than WebSockets

### Implementation Architecture:
```typescript
// Backend: Next.js API Route (/api/progress/[sessionId]/route.ts)
export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to Redis progress updates
      const subscriber = redis.duplicate();
      subscriber.subscribe(`progress:${params.sessionId}`);
      
      subscriber.on('message', (channel, message) => {
        const update = JSON.parse(message);
        const chunk = `data: ${JSON.stringify(update)}\n\n`;
        controller.enqueue(new TextEncoder().encode(chunk));
        
        // Auto-close when done
        if (update.status === 'COMPLETED' || update.status === 'FAILED') {
          controller.close();
          subscriber.disconnect();
        }
      });
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Frontend: React Hook
export const useProgressUpdates = (sessionId: string) => {
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/progress/${sessionId}`);
    
    eventSource.onmessage = (event) => {
      const update: ProgressUpdate = JSON.parse(event.data);
      setProgress(update);
    };

    eventSource.onerror = () => {
      console.log('Progress stream ended or error occurred');
    };

    return () => eventSource.close();
  }, [sessionId]);

  return progress;
};
```

## Why This Architecture is Perfect for Your App

### ✅ Long-term File Storage (MinIO)
- **Forever storage**: Files persist until user deletes
- **Cost-effective**: MinIO is cheaper than database storage
- **Fast access**: Direct file serving for large transcripts
- **Easy backup**: Simple file-based backup strategy
- **Scalable**: Handles large files efficiently

### ✅ Real-time Progress (Next.js SSE)
- **Modern**: Uses latest Next.js streaming capabilities
- **Simple**: No WebSocket complexity or connection management
- **Reliable**: Auto-reconnection and error handling built-in
- **Efficient**: Lower server overhead than WebSockets
- **Future-proof**: Built on web standards

### ✅ Clean Data Separation
- **PostgreSQL**: Only user authentication and access control
- **MinIO**: Video files storage only
- **Redis**: All session data, transcripts, and progress (with auto-cleanup)

## Redis Data Structure Example
```json
// transcription:{sessionId} (TTL: 24h)
{
  "session_id": "uuid-here",
  "user_id": "user-uuid",
  "filename": "meeting.mp4",
  "status": "completed",
  "progress": 100,
  "transcript": {
    "segments": [...],
    "speakers": {...}
  },
  "todos": [
    {
      "id": "1",
      "task": "Follow up with client about project timeline",
      "priority": "high",
      "timestamp": "00:05:30",
      "context": "Client mentioned concerns about delivery date",
      "completed": false
    }
  ],
  "created_at": "2025-07-18T10:30:00Z",
  "completed_at": "2025-07-18T10:35:00Z"
}
```

## 🎯 **FINAL DECISION SUMMARY**
1. **User data**: PostgreSQL (authentication only)
2. **Session data**: Redis with TTL auto-cleanup (all transcripts, progress, metadata)
3. **File storage**: MinIO (video files only)
4. **Real-time updates**: Next.js Server-Sent Events with Redis
5. **Simple & Stateless**: Perfect for container-based architecture

This **simplified Redis-only approach** is modern, simple, scalable, and perfect for your whisper-notes application!