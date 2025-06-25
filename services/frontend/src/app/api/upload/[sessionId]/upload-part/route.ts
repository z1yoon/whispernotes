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

    if (!sessionId) {
      return NextResponse.json({ message: 'Missing sessionId parameter' }, { status: 400 });
    }

    // Get the form data
    const formData = await req.formData();
    const part = formData.get('part') as File;
    const partNumber = formData.get('partNumber') as string;

    if (!part || !partNumber) {
      return NextResponse.json({ message: 'Missing required fields: part, partNumber' }, { status: 400 });
    }

    console.log(`API: Uploading part ${partNumber} for session ${sessionId}, size: ${part.size} bytes`);

    // Create a new FormData to send to the file-uploader service
    const uploadFormData = new FormData();
    uploadFormData.append('part', part);
    uploadFormData.append('partNumber', partNumber);

    // Forward the part to the file-uploader service
    const uploaderResponse = await fetch(
      `${FILE_UPLOADER_URL}/api/v1/uploads/${sessionId}/upload-part`,
      {
        method: 'POST',
        body: uploadFormData,
      }
    );

    if (!uploaderResponse.ok) {
      throw new Error(`Part upload failed: ${uploaderResponse.status}`);
    }

    const result = await uploaderResponse.json();
    console.log(`API: Upload part ${partNumber} response:`, result);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('API: Error uploading part:', error.message);
    
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || 'Internal Server Error';
    return NextResponse.json({ message }, { status });
  }
}