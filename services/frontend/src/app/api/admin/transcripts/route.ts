import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

// Use environment variables for service URLs
const FILE_UPLOADER_URL = process.env.FILE_UPLOADER_URL || 'http://file-uploader:8002';

export async function GET(req: NextRequest) {
  try {
    // Get session to verify admin access
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized: Not authenticated' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all transcripts from file uploader service
    const response = await axios.get(
      `${FILE_UPLOADER_URL}/api/v1/transcripts/admin/all`,
      { 
        headers: { 
          'Authorization': `Bearer ${session.accessToken}` 
        } 
      }
    );

    // Calculate stats from the transcripts
    const transcriptions = response.data.transcriptions || [];
    const stats = {
      total: transcriptions.length,
      completed: transcriptions.filter((t: any) => t.status === 'completed').length,
      processing: transcriptions.filter((t: any) => ['processing', 'transcribing', 'uploading', 'analyzing', 'pending'].includes(t.status)).length,
      failed: transcriptions.filter((t: any) => t.status === 'failed').length,
      totalSize: transcriptions.reduce((sum: number, t: any) => sum + (t.fileSize || 0), 0),
      totalDuration: transcriptions.reduce((sum: number, t: any) => sum + (t.duration || 0), 0),
      userCount: new Set(transcriptions.map((t: any) => t.userId)).size,
    };

    return NextResponse.json({
      transcriptions,
      stats
    });

  } catch (error: any) {
    console.error('Error fetching admin transcripts:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || 'Internal Server Error';
    return NextResponse.json({ message }, { status });
  }
}