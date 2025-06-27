import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

// Use environment variables for service URLs
const FILE_UPLOADER_URL = process.env.FILE_UPLOADER_URL || 'http://file-uploader:8002';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized: Not authenticated' }, { status: 401 });
    }

    const { filename, file_size, content_type, num_speakers } = await req.json();

    if (!filename || !file_size) {
      return NextResponse.json({ message: 'Missing required fields: filename, file_size' }, { status: 400 });
    }

    console.log(`API: Initializing upload for file: ${filename}, size: ${file_size}, type: ${content_type}, speakers: ${num_speakers}`);

    // Forward the initialization request to the file-uploader service
    const uploaderResponse = await fetch(
      `${FILE_UPLOADER_URL}/api/v1/uploads/initialize`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          filename,
          file_size,
          content_type: content_type || 'application/octet-stream',
          user_id: session.user.id,
          num_speakers: num_speakers || 2, // Pass speaker count to file-uploader
        }),
      }
    );

    if (!uploaderResponse.ok) {
      const errorText = await uploaderResponse.text();
      console.error(`Upload initialization failed: ${uploaderResponse.status} - ${errorText}`);
      throw new Error(`Upload initialization failed: ${uploaderResponse.status}`);
    }

    const result = await uploaderResponse.json();
    console.log(`API: Initialize upload response:`, result);

    // Create immediate transcription entry for progress tracking
    try {
      // Store immediate transcription entry directly in Redis
      const transcriptionEntry = {
        session_id: result.session_id,
        id: result.session_id,
        sessionId: result.session_id,
        filename: filename,
        fileSize: file_size,
        mimeType: content_type || 'application/octet-stream',
        participantCount: num_speakers || 2,
        status: 'uploading',
        sessionStatus: 'uploading',
        progress: 0,
        hasTranscript: false,
        transcriptData: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
        duration: 0,
        segmentCount: 0,
        language: 'en',
        speakers: [],
        diarizedSegments: [],
        user_id: session.user.id,
        content_type: content_type || 'application/octet-stream',
        file_size: file_size,
        speaker_count: num_speakers || 2,
        transcript: [],
        created_at: new Date().toISOString(),
        completed_at: null
      };

      // Store in Redis directly using the same key pattern that transcripts API expects
      const response = await fetch(`${FILE_UPLOADER_URL}/api/v1/immediate-transcription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transcriptionEntry)
      });

      if (response.ok) {
        console.log(`API: Created immediate transcription entry for session ${result.session_id}`);
      } else {
        console.error('Failed to create immediate transcription entry:', await response.text());
      }
    } catch (entryError) {
      console.error('Failed to create immediate entry:', entryError);
      // Don't fail the upload if this fails
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('API: Error initializing upload:', error.message);
    
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || error.message || 'Internal Server Error';
    return NextResponse.json({ message }, { status });
  }
}