import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const token = req.cookies.token;
    console.log('API /me: Token exists:', !!token);

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const authServiceUrl = 'http://host.docker.internal:8000/api/v1/auth/me';

    try {
      console.log('API /me: Calling auth service:', authServiceUrl);
      const response = await axios.get(authServiceUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('API /me: Auth service response status:', response.status);

      // The response from the auth service is already the user object
      res.status(200).json({ user: response.data });
    } catch (error: any) {
      console.error('API /me: Error fetching user profile:', error.message);
      if (error.response) {
        console.error('API /me: Response status:', error.response.status);
        console.error('API /me: Response data:', error.response.data);
      }
      const status = error.response?.status || 500;
      const message = error.response?.data?.detail || 'An error occurred';
      res.status(status).json({ success: false, error: message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 