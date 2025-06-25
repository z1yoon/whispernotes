import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 1,
  lazyConnect: true,
});

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;

  // Create a ReadableStream for real-time updates
  const stream = new ReadableStream({
    start(controller) {
      const sendUpdate = (data: any) => {
        const chunk = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(new TextEncoder().encode(chunk));
      };

      // Subscribe to Redis updates for this session
      const subscriber = redis.duplicate();
      subscriber.subscribe(`progress:${sessionId}`);
      
      subscriber.on('message', (channel, message) => {
        try {
          const update = JSON.parse(message);
          sendUpdate(update);
          
          // Close stream when processing is complete
          if (update.status === 'COMPLETED' || update.status === 'FAILED') {
            controller.close();
            subscriber.disconnect();
          }
        } catch (error) {
          console.error('Error parsing progress update:', error);
        }
      });

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        subscriber.disconnect();
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}