import { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { id } = req.query;
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000';

    try {
      const response = await axios.post(
        `${authServiceUrl}/api/v1/admin/users/${id}/toggle-admin`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      res.status(200).json(response.data);
    } catch (error: any) {
      console.error('Error toggling admin status:', error.response?.data || error.message);
      const status = error.response?.status || 500;
      const message = error.response?.data?.detail || 'Failed to toggle admin status';
      res.status(status).json({ error: message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}