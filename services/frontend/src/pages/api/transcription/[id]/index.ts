import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/middleware';

// Environment variables
const WHISPER_TRANSCRIBER_URL = process.env.WHISPER_TRANSCRIBER_URL || 'http://whisper-transcriber:8005';

/**
 * Fetches transcription data by ID
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = req.query.id as string;
  
  if (!id) {
    return res.status(400).json({ error: 'Missing transcription ID' });
  }

  try {
    // Forward the request to the whisper-transcriber service
    const response = await fetch(`${WHISPER_TRANSCRIBER_URL}/transcription/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error fetching transcription: ${errorText}`);
      
      if (response.status === 404) {
        return res.status(404).json({ error: 'Transcription not found' });
      }
      
      return res.status(response.status).json({ 
        error: `Failed to fetch transcription: ${response.statusText}` 
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error fetching transcription:', error);
    return res.status(500).json({ 
      error: `Server error: ${error.message || 'Unknown error'}` 
    });
  }
};

export default withAuth(handler); 