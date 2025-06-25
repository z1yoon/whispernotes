import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';

// Use environment variables for service URLs
const FILE_UPLOADER_URL = process.env.FILE_UPLOADER_URL || 'http://file-uploader:8002';

export async function POST(req: NextRequest, context: { params: { sessionId: string } }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized: Not authenticated' }, { status: 401 });
    }

    const { sessionId } = context.params;
    const { parts } = await req.json();

    if (!sessionId || !parts || !Array.isArray(parts)) {
      return NextResponse.json({ message: 'Missing required fields: sessionId, parts array' }, { status: 400 });
    }

    console.log(`API: Completing multipart upload for session ${sessionId} with ${parts.length} parts`);

    // Forward the completion request to the file-uploader service
    const uploaderResponse = await fetch(
      `${FILE_UPLOADER_URL}/api/v1/uploads/${sessionId}/complete-upload`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parts }),
      }
    );

    if (!uploaderResponse.ok) {
      throw new Error(`Multipart upload completion failed: ${uploaderResponse.status}`);
    }

    const result = await uploaderResponse.json();
    console.log(`API: Complete multipart upload response:`, result);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('API: Error completing multipart upload:', error.message);
    
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || 'Internal Server Error';
    return NextResponse.json({ message }, { status });
  }
}