import { NextApiRequest, NextApiResponse } from 'next';

const LLM_SERVICE_URL = process.env.LLM_SERVICE_URL || 'http://llm-service:8004';

export default async function analysisHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Valid transcript ID is required' });
  }

  try {
    // Fetch analysis results from LLM service
    const response = await fetch(`${LLM_SERVICE_URL}/analysis/${id}`);

    if (response.status === 404) {
      return res.status(404).json({ error: 'Analysis results not found' });
    }

    if (!response.ok) {
      console.error(`LLM service error: ${response.status} - ${await response.text()}`);
      return res.status(500).json({ error: 'Failed to fetch analysis results' });
    }

    const analysisData = await response.json();
    return res.status(200).json(analysisData);

  } catch (error: any) {
    console.error('Error fetching analysis results:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}