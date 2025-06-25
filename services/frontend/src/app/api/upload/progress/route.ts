import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import Redis from 'ioredis';

// Use environment variables for service URLs
const FILE_UPLOADER_URL = process.env.FILE_UPLOADER_URL || 'http://file-uploader:8002';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized: Not authenticated' }, { status: 401 });
    }

    const { session_id, progress, status, stage, message } = await req.json();

    if (!session_id) {
      return NextResponse.json({ message: 'Missing session_id parameter' }, { status: 400 });
    }

    const progressData = {
      session_id,
      progress: progress || 0,
      status: stage || status || 'processing',
      message: message || status || 'Processing...',
      stage: stage || status,
      timestamp: new Date().toISOString()
    };

    console.log(`API: Publishing progress for session ${session_id}: ${progress}% - ${status} - ${message || status}`);

    // Only log important progress updates to reduce noise
    if (progress >= 100 || status.toLowerCase().includes('failed') || status.toLowerCase().includes('error') ||
        (message && (message.includes('part') || message.includes('video') || message.includes('whisper') || 
                    message.includes('transcrib') || message.includes('todo') || message.includes('completed')))) {
      console.log(`🎯 Upload Progress: ${session_id.slice(0, 8)} - ${progress}% - ${message || status}`);
    }

    // Store progress in multiple Redis keys for compatibility with all services
    try {
      const ttl = 3600; // 1 hour TTL
      
      // Store in all possible keys that services might use
      await Promise.all([
        redis.setex(`progress_state:${session_id}`, ttl, JSON.stringify(progressData)),
        redis.setex(`upload_progress:${session_id}`, ttl, JSON.stringify(progressData)),
        redis.setex(`transcription_progress:${session_id}`, ttl, JSON.stringify(progressData))
      ]);
      
    } catch (redisError) {
      console.error('Redis operation failed:', redisError);
    }

    // Also forward to file-uploader service for compatibility
    try {
      const uploaderResponse = await fetch(
        `${FILE_UPLOADER_URL}/upload/progress/${session_id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            progress,
            message: message || status,
            status: stage || status
          }),
        }
      );

      if (!uploaderResponse.ok) {
        console.error(`Progress update to file-uploader failed: ${uploaderResponse.status}`);
      }
    } catch (uploaderError) {
      console.error('Failed to forward progress to file-uploader:', uploaderError);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('API: Error publishing progress:', error.message);
    // Return success anyway since progress updates are not critical
    return NextResponse.json({ success: true });
  }
}