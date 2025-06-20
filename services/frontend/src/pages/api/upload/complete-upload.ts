import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Use environment variables for service URLs
const FILE_UPLOADER_URL = process.env.FILE_UPLOADER_URL || 'http://file-uploader:8002';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000';

export default async function completeUpload(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    // Verify authentication token
    await axios.get(`${AUTH_SERVICE_URL}/api/v1/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (authError) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }

  try {
    // Get the session ID from the request
    const { sessionId } = req.query;
    
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ message: 'Missing sessionId parameter' });
    }
    
    // Get the parts data from the request body
    const { parts } = req.body;
    
    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ message: 'Missing or invalid parts data' });
    }
    
    console.log(`API: Completing multipart upload for session ${sessionId} with ${parts.length} parts`);
    
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
    
    console.log(`API: Complete upload response:`, uploaderResponse.data);
    
    // Return the response to the client
    return res.status(200).json(uploaderResponse.data);

  } catch (completeError: any) {
    console.error('API: Error in completing upload:', completeError.message);
    console.error('API: Error details:', completeError.response?.data || 'No detailed error data');
    
    const status = completeError.response?.status || 500;
    const message = completeError.response?.data?.detail || 'Internal Server Error';
    return res.status(status).json({ message });
  }
} 