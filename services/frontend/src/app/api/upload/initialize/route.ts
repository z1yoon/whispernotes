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

    const { filename, file_size, num_speakers } = await req.json();

    if (!filename || !file_size) {
      return NextResponse.json({ message: 'Missing required fields: filename, file_size' }, { status: 400 });
    }

    console.log(`API: Initializing upload for file: ${filename}, size: ${file_size}, speakers: ${num_speakers}`);

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
          num_speakers: num_speakers || 2,
          user_id: session.user.id,
        }),
      }
    );

    if (!uploaderResponse.ok) {
      throw new Error(`Upload initialization failed: ${uploaderResponse.status}`);
    }

    const result = await uploaderResponse.json();
    console.log(`API: Initialize upload response:`, result);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('API: Error initializing upload:', error.message);
    
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || 'Internal Server Error';
    return NextResponse.json({ message }, { status });
  }
}