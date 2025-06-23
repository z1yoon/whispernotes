import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/middleware';
import axios from 'axios';

// Environment variables
const FILE_UPLOADER_URL = process.env.FILE_UPLOADER_URL || 'http://file-uploader:8002';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000';

/**
 * Fetches transcription data by ID
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionId = req.query.id as string;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing transcription ID' });
  }

  // Get the auth token from cookies
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    // First verify user authentication and get user ID
    const authResponse = await axios.get(`${AUTH_SERVICE_URL}/api/v1/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const userId = authResponse.data.id;
    
    // Get all user transcripts from file-uploader service
    const transcriptsResponse = await axios.get(
      `${FILE_UPLOADER_URL}/api/v1/transcripts/user/${userId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    // Find the specific transcription by session ID
    const transcriptions = transcriptsResponse.data.transcriptions || [];
    const transcription = transcriptions.find((t: any) => 
      t.sessionId === sessionId || t.id === sessionId
    );

    if (!transcription) {
      return res.status(404).json({ error: 'Transcription not found' });
    }

    return res.status(200).json(transcription);
  } catch (error: any) {
    console.error('Error fetching transcription:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return res.status(500).json({ 
      error: `Server error: ${error.message || 'Unknown error'}` 
    });
  }
};

export default withAuth(handler);