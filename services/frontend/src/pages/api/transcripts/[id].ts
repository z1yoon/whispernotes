import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const FILE_UPLOADER_URL = process.env.FILE_UPLOADER_URL || 'http://file-uploader:8002';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000';

export default async function transcriptHandler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Valid transcript ID is required' });
  }

  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    // First verify user authentication and get user ID
    const authResponse = await axios.get(`${AUTH_SERVICE_URL}/api/v1/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const userId = authResponse.data.id;

    if (req.method === 'DELETE') {
      // Delete transcript
      const response = await axios.delete(
        `${FILE_UPLOADER_URL}/api/v1/transcripts/${id}`,
        { 
          headers: { 'Authorization': `Bearer ${token}` },
          params: { user_id: userId }
        }
      );

      if (response.status === 200) {
        return res.status(200).json({ message: 'Transcript deleted successfully' });
      } else {
        return res.status(response.status).json({ message: 'Failed to delete transcript' });
      }
    } else {
      res.setHeader('Allow', ['DELETE']);
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

  } catch (error: any) {
    console.error('Error handling transcript request:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || error.response?.data?.message || 'Internal Server Error';
    return res.status(status).json({ message });
  }
}