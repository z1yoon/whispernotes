import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(
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

    // For now, we'll need to get the transcript data from MinIO
    // This is a placeholder - in the actual implementation, you'd fetch from MinIO
    // using the file-uploader service or directly from Redis/MinIO

    try {
      // Try to fetch from Redis first (where processed transcripts are stored)
      const response = await fetch(`${process.env.FILE_UPLOADER_URL || 'http://file-uploader:8002'}/api/v1/transcripts/user/${session.user.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch transcript data');
      }

      const data = await response.json();
      const transcript = data.transcriptions?.find((t: any) => t.sessionId === sessionId);

      if (!transcript) {
        return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
      }

      // Check if this transcript belongs to the user (unless admin)
      if (session.user.role !== 'admin' && transcript.user_id !== session.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Return the transcript data in the format expected by the TranscriptPage
      const segments = (transcript.diarizedSegments || []).map((segment: any, index: number) => ({
        id: segment.id || index + 1,
        speaker: segment.speaker || `SPEAKER_${index % 2}`,
        speaker_name: segment.speaker_name || segment.speaker || `Speaker ${index % 2 + 1}`,
        start: segment.start || 0,
        end: segment.end || 0,
        text: segment.text || ''
      }));

      const transcriptData = {
        filename: transcript.filename,
        duration: transcript.duration || 0,
        participant_count: transcript.participantCount || 2,
        language: transcript.language || 'en',
        segments: segments
      };

      return NextResponse.json(transcriptData);

    } catch (error) {
      console.error('Error fetching transcript:', error);
      return NextResponse.json({ error: 'Failed to load transcript data' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in transcript API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Forward delete request to file-uploader service
    const response = await fetch(
      `${process.env.FILE_UPLOADER_URL || 'http://file-uploader:8002'}/api/v1/transcripts/${sessionId}?user_id=${session.user.id}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ message: errorData.message || 'Failed to delete transcript' }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error deleting transcript:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}