import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { username, email, full_name, password, purpose } = req.body;
    const authServiceUrl = 'http://auth-service:8000/api/v1/auth/request-access';

    try {
      console.log('API signup: Processing signup request for:', email);
      
      await axios.post(authServiceUrl, {
        username,
        email,
        full_name,
        password,
        purpose,
      });

      console.log('API signup: Request successful for:', email);
      res.status(201).json({ success: true, message: 'Access request submitted' });
    } catch (error: any) {
      // Log the error with helpful details for debugging
      console.error('API signup error:', {
        email: email,
        status: error.response?.status,
        message: error.response?.data?.detail || error.message
      });
      
      const status = error.response?.status || 500;
      
      // Handle specific duplicate email errors from the backend
      if (status === 400) {
        const errorMessage = error.response?.data?.detail || '';
        
        if (errorMessage.includes('already exists') || 
            errorMessage.includes('already pending') ||
            errorMessage.includes('already approved') ||
            errorMessage.includes('rejected')) {
          
          // Return specific error message from the backend for the frontend to display
          return res.status(status).json({ 
            success: false, 
            error: errorMessage 
          });
        }
      }

      // Handle validation errors specifically
      if (error.response?.data?.detail && Array.isArray(error.response.data.detail)) {
        // Extract the first validation error message
        const validationError = error.response.data.detail[0];
        const message = validationError.msg || 'Invalid input';
        res.status(status).json({ success: false, error: message });
      } else {
        const message = error.response?.data?.detail || error.response?.data?.error || 'An error occurred during signup';
        res.status(status).json({ success: false, error: message });
      }
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}