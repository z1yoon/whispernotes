import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { withAuth } from '@/lib/middleware';

// Use environment variables for service URLs
const FILE_UPLOADER_URL = process.env.FILE_UPLOADER_URL || 'http://file-uploader:8002';

// Define transcript interface
interface Transcript {
  id: string;
  sessionId: string;
  userId: string;
  username: string;
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

// This endpoint allows admin users to get all transcripts from all users
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if user is admin - handled by withAuth middleware
  const user = (req as any).user;
  if (!user.is_admin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }

  try {
    // Get all transcripts from the file-uploader service
    const response = await axios.get(
      `${FILE_UPLOADER_URL}/api/v1/transcripts/admin/all`,
      { headers: { 'Authorization': `Bearer ${(req as any).token}` } }
    );

    // Calculate stats from the transcripts
    const transcriptions: Transcript[] = response.data.transcriptions || [];
    const stats = {
      total: transcriptions.length,
      completed: transcriptions.filter((t: Transcript) => t.status === 'completed').length,
      processing: transcriptions.filter((t: Transcript) => ['processing', 'transcribing', 'uploading'].includes(t.status)).length,
      failed: transcriptions.filter((t: Transcript) => t.status === 'failed').length,
      totalDuration: transcriptions.reduce((acc: number, t: Transcript) => acc + (t.duration || 0), 0),
      totalSize: transcriptions.reduce((acc: number, t: Transcript) => acc + (t.fileSize || 0), 0),
      userCount: new Set(transcriptions.map((t: Transcript) => t.userId)).size
    };

    // Return both transcripts and stats
    return res.status(200).json({
      transcriptions,
      stats
    });

  } catch (error: any) {
    console.error('Error fetching all transcripts:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || 'Internal Server Error';
    return res.status(status).json({ error: message });
  }
};

export default withAuth(handler); 