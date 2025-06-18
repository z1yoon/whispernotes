import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { username, email, full_name, password, purpose } = req.body;
    const authServiceUrl = 'http://auth-service:8000/api/v1/auth/request-access';

    try {
      await axios.post(authServiceUrl, {
        username,
        email,
        full_name,
        password,
        purpose,
      });

      res.status(201).json({ success: true, message: 'Access request submitted' });
    } catch (error: any) {
      console.error('Signup API error:', error.response?.data || error.message);
      const status = error.response?.status || 500;

      // Handle validation errors specifically
      if (error.response?.data?.detail && Array.isArray(error.response.data.detail)) {
        // Extract the first validation error message
        const validationError = error.response.data.detail[0];
        const message = validationError.msg || 'Invalid input';
        res.status(status).json({ success: false, error: message });
      } else {
        const message = error.response?.data?.detail || error.response?.data?.error || 'An error occurred';
        res.status(status).json({ success: false, error: message });
      }
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}