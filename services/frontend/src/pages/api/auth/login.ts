import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    console.log('API login: Started login process');
    const { email, password } = req.body;
    console.log('API login: Email provided:', !!email);

    // Use the Docker service name for internal communication
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000';
    const loginEndpoint = `${authServiceUrl}/api/v1/auth/login`;
    const jwtExpireMinutes = parseInt(process.env.JWT_EXPIRE_MINUTES || '60', 10);

    try {
      console.log('API login: Sending form data to auth service:', loginEndpoint);
      
      // Form data for FastAPI's OAuth2PasswordRequestForm
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      
      const response = await axios.post(loginEndpoint, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000 // 10 second timeout
      });

      console.log('API login: Auth service response:', response.status);
      const { access_token } = response.data;
      console.log('API login: Got token, length:', access_token?.length);

      // Set the token in an HTTP-only cookie for security
      res.setHeader(
        'Set-Cookie',
        `token=${access_token}; HttpOnly; Path=/; Max-Age=${jwtExpireMinutes * 60}; SameSite=Lax`
      );

      console.log('API login: Cookie set, returning success');
      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('API login: Error during login:', error.message);
      if (error.response) {
        console.error('API login: Response status:', error.response.status);
        console.error('API login: Response data:', error.response.data);
      } else if (error.request) {
        console.error('API login: No response received');
      } else {
        console.error('API login: Error setting up request:', error.message);
      }
      
      const status = error.response?.status || 500;
      const message = error.response?.data?.detail || 'Login failed';
      return res.status(status).json({ success: false, error: message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}