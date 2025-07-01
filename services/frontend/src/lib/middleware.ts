import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/auth';

type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

/**
 * Middleware to check if the user is authenticated
 */
export const withAuth = (handler: ApiHandler): ApiHandler => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Get user session
      const session = await getSession(req);
      
      if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Attach user info to request object in the format expected by admin endpoints
      (req as any).user = {
        id: session.userId,
        email: session.email,
        full_name: session.name,
        is_admin: session.isAdmin || false,
      };
      
      return handler(req, res);
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  };
};