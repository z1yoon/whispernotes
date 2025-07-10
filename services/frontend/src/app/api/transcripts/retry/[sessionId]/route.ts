// Create API endpoints for retry and remove operations
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

const WHISPER_SERVICE_URL = process.env.WHISPER_SERVICE_URL || 'http://whisper-transcriber:8003';

export async function POST(
  req: NextRequest,
  context: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await context.params;

    // Forward to whisper service
    const response = await fetch(`${WHISPER_SERVICE_URL}/retry/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ 
        detail: errorData.detail || 'Failed to retry transcription' 
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error retrying transcription:', error);
    return NextResponse.json({ 
      detail: 'Internal server error' 
    }, { status: 500 });
  }
}