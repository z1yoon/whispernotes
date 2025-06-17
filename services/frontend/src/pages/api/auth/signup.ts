import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { email, fullName, password, purpose } = req.body;
    const authServiceUrl = 'http://auth-service:8000/api/v1/auth/request-access';

    try {
      await axios.post(authServiceUrl, {
        email,
        full_name: fullName,
        password,
        purpose,
      });

      res.status(201).json({ success: true, message: 'Access request submitted' });
    } catch (error: any) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.detail || 'An error occurred';
      res.status(status).json({ success: false, error: message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 