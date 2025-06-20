import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/middleware';

// Environment variables
const WHISPER_TRANSCRIBER_URL = process.env.WHISPER_TRANSCRIBER_URL || 'http://whisper-transcriber:8003';

/**
 * Updates speaker names for a transcription
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = req.query.id as string;
  
  if (!id) {
    return res.status(400).json({ error: 'Missing transcription ID' });
  }

  try {
    // Forward the request to the whisper-transcriber service
    const response = await fetch(`${WHISPER_TRANSCRIBER_URL}/transcription/${id}/speakers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error updating speaker names: ${errorText}`);
      return res.status(response.status).json({ 
        error: `Failed to update speaker names: ${response.statusText}` 
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error updating speaker names:', error);
    return res.status(500).json({ 
      error: `Server error: ${error.message || 'Unknown error'}` 
    });
  }
};

export default withAuth(handler); 