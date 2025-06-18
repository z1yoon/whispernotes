import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log('Deleting user with ID:', id);
    
    const response = await axios.delete(
      `${AUTH_SERVICE_URL}/api/v1/admin/users/${id}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('User deletion response:', response.status);
    res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Delete user error:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || error.response?.data?.error || 'Internal Server Error';
    res.status(status).json({ error: message });
  }
}