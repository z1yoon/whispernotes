import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

// Use environment variables for service URLs
const FILE_UPLOADER_URL = process.env.FILE_UPLOADER_URL || 'http://file-uploader:8002';

// Define transcript interface
interface Transcript {
  id: string;
  sessionId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  status: string;
  duration?: number;
  progress: number;
  hasTranscript: boolean;
  createdAt: string;
  completedAt?: string;
}

export async function GET(req: NextRequest) {
  try {
    // Correct way to get session in App Router
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized: Not authenticated' }, { status: 401 });
    }

    const userId = session.user.id;
    const isAdmin = session.user.role === 'admin';
    
    // Fetch transcripts based on user role
    let response;
    if (isAdmin) {
      // Admin can see all transcripts from all users
      response = await axios.get(
        `${FILE_UPLOADER_URL}/api/v1/transcripts/all`,
        { 
          headers: { 
            'Authorization': `Bearer ${session.accessToken}` 
          } 
        }
      );
    } else {
      // Regular users only see their own transcripts
      response = await axios.get(
        `${FILE_UPLOADER_URL}/api/v1/transcripts/user/${userId}`,
        { 
          headers: { 
            'Authorization': `Bearer ${session.accessToken}` 
          } 
        }
      );
    }

    // Calculate stats from the transcripts
    const transcriptions: Transcript[] = response.data.transcriptions || [];
    const stats = {
      total: transcriptions.length,
      completed: transcriptions.filter(t => t.status === 'completed').length,
      processing: transcriptions.filter(t => ['processing', 'transcribing', 'uploading', 'analyzing', 'pending'].includes(t.status)).length,
      failed: transcriptions.filter(t => t.status === 'failed').length,
      totalSize: transcriptions.reduce((sum, t) => sum + (t.fileSize || 0), 0),
      totalDuration: transcriptions.reduce((sum, t) => sum + (t.duration || 0), 0),
    };

    return NextResponse.json({
      transcriptions,
      stats
    });

  } catch (error: any) {
    console.error('Error fetching transcripts:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || 'Internal Server Error';
    return NextResponse.json({ message }, { status });
  }
}