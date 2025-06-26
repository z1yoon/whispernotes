import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]/route';

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
    const { speaker_mapping, action_items, updated_at } = body;

    if (!speaker_mapping && !action_items) {
      return NextResponse.json({ message: 'No changes provided' }, { status: 400 });
    }

    // Get user ID - check multiple possible fields
    const userId = session.user.id || session.user.sub || session.user.userId;
    const isAdmin = session.user.role === 'admin';

    if (!userId && !isAdmin) {
      console.error('No user ID found in session:', JSON.stringify(session.user, null, 2));
      return NextResponse.json({ message: 'Invalid session: No user ID' }, { status: 401 });
    }

    const results = [];

    try {
      // 1. Update speaker names if provided
      if (speaker_mapping && typeof speaker_mapping === 'object') {
        const whisperServiceUrl = process.env.WHISPER_SERVICE_URL || 'http://whisper-transcriber:8003';
        console.log(`Updating speakers via: ${whisperServiceUrl}/transcription/${sessionId}/speakers`);
        
        const speakerResponse = await fetch(`${whisperServiceUrl}/transcription/${sessionId}/speakers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            speaker_map: speaker_mapping
          })
        });
        
        if (!speakerResponse.ok) {
          const errorText = await speakerResponse.text();
          console.error(`Speaker update failed: ${speakerResponse.status} - ${errorText}`);
          throw new Error(`Failed to update speakers: ${speakerResponse.status}`);
        }

        const speakerResult = await speakerResponse.json();
        results.push({ type: 'speakers', success: true, data: speakerResult });
      }

      // 2. Save action items and edits to MinIO via file-uploader service
      if (action_items || speaker_mapping) {
        const uploaderServiceUrl = process.env.FILE_UPLOADER_URL || 'http://file-uploader:8002';
        console.log(`Saving edits to MinIO via: ${uploaderServiceUrl}/save-transcript-edits`);
        
        const editData = {
          session_id: sessionId,
          user_id: userId,
          speaker_mapping: speaker_mapping || null,
          action_items: action_items || [],
          updated_at: updated_at || new Date().toISOString(),
          saved_by: session.user.name || session.user.email || 'Unknown User'
        };

        const minioResponse = await fetch(`${uploaderServiceUrl}/save-transcript-edits`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editData)
        });
        
        if (!minioResponse.ok) {
          const errorText = await minioResponse.text();
          console.error(`MinIO save failed: ${minioResponse.status} - ${errorText}`);
          // Don't throw error here - speaker updates should still succeed even if MinIO fails
          results.push({ 
            type: 'minio_backup', 
            success: false, 
            error: `MinIO backup failed: ${minioResponse.status}` 
          });
        } else {
          const minioResult = await minioResponse.json();
          results.push({ type: 'minio_backup', success: true, data: minioResult });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Changes saved successfully',
        results,
        session_id: sessionId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error saving changes:', error);
      return NextResponse.json({ 
        error: 'Failed to save some changes', 
        details: error instanceof Error ? error.message : 'Unknown error',
        results 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in save-edits API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}