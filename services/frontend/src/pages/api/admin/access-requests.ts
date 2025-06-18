import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      // Use the Docker service name for internal communication
      const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000';
      const requestsEndpoint = `${authServiceUrl}/api/v1/admin/access-requests`;

      const response = await axios.get(requestsEndpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      });

      res.status(200).json(response.data);
    } catch (error: any) {
      console.error('API /admin/access-requests: Error fetching requests:', error.message);
      if (error.response) {
        console.error('API /admin/access-requests: Response status:', error.response.status);
        console.error('API /admin/access-requests: Response data:', error.response.data);
      }
      const status = error.response?.status || 500;
      const message = error.response?.data?.detail || 'Failed to fetch access requests';
      res.status(status).json({ success: false, error: message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}