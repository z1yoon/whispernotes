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
2. **Process**: RabbitMQ queues → WhisperX transcription → LLM todo generation
3. **Store**: All results (transcripts + todos) → MinIO as JSON files
4. **Track**: Metadata + progress → PostgreSQL + Redis

## Data Storage Strategy

### MinIO (Object Storage) - **PERSISTENT LONG-TERM STORAGE**
```
video-files/
  {sessionId}/original.mp4           # Original video files - KEPT FOREVER
  
transcripts/
  {sessionId}/
    transcript.json                  # WhisperX output with timestamps - KEPT FOREVER
    todos.json                      # Generated todo list - KEPT FOREVER
    summary.json                    # Optional: transcript summary - KEPT FOREVER
```

**✅ Files are kept indefinitely until user explicitly deletes them**
- No TTL or automatic expiration
- Users have full control over their data
- Easy backup and data portability
- Perfect for long-term reference and search

### PostgreSQL (Metadata Only)
```sql
-- Core tracking table
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  filename VARCHAR(255),
  status VARCHAR(50),     -- UPLOADING, PROCESSING, COMPLETED, FAILED
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  -- MinIO references (permanent links)
  video_path VARCHAR(500),
  transcript_path VARCHAR(500),
  todos_path VARCHAR(500)
);
```

### Redis (Temporary Data Only)
```
progress:{sessionId}     # Upload/processing progress (TTL: 24h)
cache:recent:{userId}    # Recently viewed items (TTL: 1h)
queue:stats             # Processing queue statistics (TTL: 5min)
```

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
- **PostgreSQL**: Only lightweight metadata and user data
- **MinIO**: All heavy content (videos, transcripts, todos)
- **Redis**: Only temporary progress and cache data

## File Structure Example
```json
// transcripts/{sessionId}/todos.json (PERMANENT STORAGE)
{
  "generated_at": "2025-06-25T10:30:00Z",
  "session_id": "uuid-here",
  "version": "1.0",
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
  "summary": "Meeting covered project timeline and deliverables",
  "metadata": {
    "total_todos": 1,
    "high_priority": 1,
    "estimated_time": "30 minutes"
  }
}
```

## 🎯 **FINAL DECISION SUMMARY**
1. **Long-term storage**: MinIO (files kept forever, user-controlled deletion)
2. **Real-time updates**: Next.js Server-Sent Events with Redis
3. **No WebSockets needed**: SSE is simpler and better for your use case
4. **Modern & Future-proof**: Uses latest Next.js capabilities
5. **Simple & Maintainable**: Clean separation of concerns

This architecture is **modern, simple, scalable, and perfect** for your whisper-notes application!