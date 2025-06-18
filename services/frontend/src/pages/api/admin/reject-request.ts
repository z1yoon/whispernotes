import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { id } = req.query;
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!id) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    try {
      const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000';
      const rejectEndpoint = `${authServiceUrl}/api/v1/admin/access-requests/${id}/reject`;

      const response = await axios.post(rejectEndpoint, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      });

      res.status(200).json({ success: true, message: 'Access request rejected successfully' });
    } catch (error: any) {
      console.error('API reject error:', error.message);
      const status = error.response?.status || 500;
      const message = error.response?.data?.detail || 'Failed to reject access request';
      res.status(status).json({ success: false, error: message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}