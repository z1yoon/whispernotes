import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';

// Use environment variables for service URLs
const FILE_UPLOADER_URL = process.env.FILE_UPLOADER_URL || 'http://file-uploader:8002';

export async function POST(req: NextRequest, context: { params: { sessionId: string } }) {
  try {
    // Correct way to get session in App Router
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
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }
    
    console.log(`API: Direct upload for session ${sessionId}, file: ${file.name}, size: ${file.size} bytes`);
    
    // Create a new FormData to send to the file-uploader service
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    
    // Forward the file to the file-uploader service
    const uploaderResponse = await fetch(
      `${FILE_UPLOADER_URL}/api/v1/uploads/${sessionId}/direct-upload`,
      {
        method: 'POST',
        body: uploadFormData,
      }
    );
    
    if (!uploaderResponse.ok) {
      throw new Error(`Upload failed: ${uploaderResponse.status}`);
    }
    
    const result = await uploaderResponse.json();
    console.log(`API: Direct upload response:`, result);
    
    return NextResponse.json(result);

  } catch (uploadError: any) {
    console.error('API: Error in direct upload:', uploadError.message);
    
    const status = uploadError.response?.status || 500;
    const message = uploadError.response?.data?.detail || 'Internal Server Error';
    return NextResponse.json({ message }, { status });
  }
}