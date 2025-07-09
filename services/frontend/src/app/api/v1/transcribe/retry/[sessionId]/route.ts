import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]/route';

const WHISPER_SERVICE_URL = process.env.WHISPER_SERVICE_URL || 'http://whisper-transcriber:8003';

export async function POST(
  req: NextRequest,
  context: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized: Not authenticated' }, { status: 401 });
    }

    const { sessionId } = await context.params;

    if (!sessionId) {
      return NextResponse.json({ message: 'Missing sessionId parameter' }, { status: 400 });
    }

    // Get user ID - check multiple possible fields
    const userId = session.user.id || session.user.sub || session.user.userId;

    if (!userId) {
      console.error('No user ID found in session for retry:', JSON.stringify(session.user, null, 2));
      return NextResponse.json({ message: 'Invalid session: No user ID' }, { status: 401 });
    }

    console.log(`User ${userId} requesting retry for session: ${sessionId}`);

    // Forward retry request to WhisperX service
    const response = await fetch(`${WHISPER_SERVICE_URL}/retry/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to retry transcription' }));
      console.error(`Retry failed with status ${response.status}:`, errorData);
      return NextResponse.json(
        { 
          error: errorData.detail || 'Failed to retry transcription',
          details: errorData 
        }, 
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log(`Retry initiated successfully for session: ${sessionId}`);
    
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error in retry API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}