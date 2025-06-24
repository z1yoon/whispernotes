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
    const { parts } = await req.json();

    console.log('API: Completing upload for session:', sessionId, 'with parts:', JSON.stringify(parts));

    if (!sessionId || !parts) {
      return NextResponse.json({ message: 'Missing required fields: sessionId, parts' }, { status: 400 });
    }

    // Forward the completion request to the file-uploader service
    const uploaderResponse = await axios.post(
      `${FILE_UPLOADER_URL}/api/v1/uploads/${sessionId}/complete`,
      { parts },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('API: Complete upload response:', uploaderResponse.data);

    return NextResponse.json(uploaderResponse.data);

  } catch (completeError: any) {
    console.error('API: Error completing upload:', completeError.message);
    console.error('API: Error details:', completeError.response?.data || 'No detailed error data');
    
    const status = completeError.response?.status || 500;
    const message = completeError.response?.data?.detail || 'Internal Server Error';
    return NextResponse.json({ message }, { status });
  }
}