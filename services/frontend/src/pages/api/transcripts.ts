import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Use environment variables for service URLs
const FILE_UPLOADER_URL = process.env.FILE_UPLOADER_URL || 'http://file-uploader:8002';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000';

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

export default async function transcriptsHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    // Verify user authentication
    const authResponse = await axios.get(`${AUTH_SERVICE_URL}/api/v1/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const userId = authResponse.data.id;
    
    // Fetch all transcripts for the user
    const response = await axios.get(
      `${FILE_UPLOADER_URL}/api/v1/transcripts/user/${userId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    // Calculate stats from the transcripts
    const transcriptions: Transcript[] = response.data.transcriptions || [];
    const stats = {
      total: transcriptions.length,
      completed: transcriptions.filter((t: Transcript) => t.status === 'completed').length,
      processing: transcriptions.filter((t: Transcript) => ['processing', 'transcribing', 'uploading'].includes(t.status)).length,
      failed: transcriptions.filter((t: Transcript) => t.status === 'failed').length,
      totalDuration: transcriptions.reduce((acc: number, t: Transcript) => acc + (t.duration || 0), 0),
      totalSize: transcriptions.reduce((acc: number, t: Transcript) => acc + (t.fileSize || 0), 0)
    };

    // Return both transcripts and stats
    return res.status(200).json({
      transcriptions,
      stats
    });

  } catch (error: any) {
    console.error('Error fetching transcripts:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || 'Internal Server Error';
    return res.status(status).json({ message });
  }
} 