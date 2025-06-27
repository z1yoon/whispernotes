import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function PUT(
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

    const body = await req.json();
    const { speaker_mapping } = body;

    if (!speaker_mapping || typeof speaker_mapping !== 'object') {
      return NextResponse.json({ message: 'Invalid speaker_mapping provided' }, { status: 400 });
    }

    // Get user ID - check multiple possible fields
    const userId = session.user.id || session.user.sub || session.user.userId;
    const isAdmin = session.user.role === 'admin';

    if (!userId && !isAdmin) {
      console.error('No user ID found in session:', JSON.stringify(session.user, null, 2));
      return NextResponse.json({ message: 'Invalid session: No user ID' }, { status: 401 });
    }

    try {
      // Forward to whisper-transcriber service
      const whisperServiceUrl = process.env.WHISPER_SERVICE_URL || 'http://whisper-transcriber:8003';
      console.log(`Updating speakers via: ${whisperServiceUrl}/transcription/${sessionId}/speakers`);
      
      const response = await fetch(`${whisperServiceUrl}/transcription/${sessionId}/speakers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          speaker_map: speaker_mapping  // Fix: Send speaker_map instead of speaker_mapping
        })
      });
      
      console.log(`Whisper service response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Whisper service error: ${response.status} - ${errorText}`);
        throw new Error(`Failed to update speakers: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Speaker update successful:', result);

      return NextResponse.json({
        success: true,
        message: 'Speaker names updated successfully',
        result
      });

    } catch (error) {
      console.error('Error updating speakers:', error);
      return NextResponse.json({ error: 'Failed to update speaker names' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in speaker update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}