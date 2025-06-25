import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

export async function GET(
  request: NextRequest,
  context: { params: { sessionId: string } }
) {
  const { sessionId } = await context.params;

  try {
    // Try multiple Redis keys to find progress data
    const keys = [
      `progress_state:${sessionId}`,
      `upload_progress:${sessionId}`,
      `transcription_progress:${sessionId}`
    ];

    for (const key of keys) {
      const progressData = await redis.get(key);
      if (progressData) {
        const progress = JSON.parse(progressData);
        const result = {
          session_id: sessionId,
          status: progress.status || 'processing',
          progress: progress.progress || 0,
          message: progress.message || 'Processing...',
          stage: progress.stage || progress.status || 'processing',
          timestamp: progress.timestamp || new Date().toISOString()
        };
        
        return NextResponse.json(result);
      }
    }
    
    // Return default state if no progress found - no logging for unknown states
    return NextResponse.json({
      session_id: sessionId,
      status: 'unknown',
      progress: 0,
      message: 'No progress data found',
      stage: 'unknown',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching progress for session', sessionId, ':', error);
    return NextResponse.json({
      session_id: sessionId,
      status: 'error',
      progress: 0,
      message: 'Error fetching progress',
      stage: 'error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}