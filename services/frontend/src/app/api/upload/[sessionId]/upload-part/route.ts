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

    const { sessionId } = await context.params;

    if (!sessionId) {
      return NextResponse.json({ message: 'Missing sessionId parameter' }, { status: 400 });
    }

    // Get the form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const partNumber = formData.get('partNumber') as string;

    if (!file || !partNumber) {
      return NextResponse.json({ message: 'Missing required fields: file, partNumber' }, { status: 400 });
    }

    // Only log errors and every 20th part to reduce spam
    if (parseInt(partNumber) === 1 || parseInt(partNumber) % 20 === 0) {
      console.log(`API: Uploading part ${partNumber} for session ${sessionId}`);
    }

    // Create a new FormData to send to the file-uploader service
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    // Note: partNumber goes in URL path, not form data

    // Forward the part to the file-uploader service
    const uploaderResponse = await fetch(
      `${FILE_UPLOADER_URL}/api/v1/uploads/${sessionId}/upload-part/${partNumber}`,
      {
        method: 'POST',
        body: uploadFormData,
      }
    );

    if (!uploaderResponse.ok) {
      throw new Error(`Part upload failed: ${uploaderResponse.status}`);
    }

    const result = await uploaderResponse.json();
    
    // Only log every 20th part or errors
    if (parseInt(partNumber) === 1 || parseInt(partNumber) % 20 === 0) {
      console.log(`API: Upload part ${partNumber} response:`, result);
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('API: Error uploading part:', error.message);
    
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || 'Internal Server Error';
    return NextResponse.json({ message }, { status });
  }
}