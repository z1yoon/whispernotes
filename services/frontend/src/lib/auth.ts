import { NextApiRequest } from 'next';
import { getServerSession } from 'next-auth/next';
import NextAuth from '../pages/api/auth/[...nextauth]';

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  isAdmin?: boolean;
  username?: string;
  full_name?: string;
  role?: string;
  is_admin?: boolean;
}

/**
 * Get the user session from the request
 * Uses your actual auth service to validate tokens and get real user data
 */
export const getSession = async (req: NextApiRequest): Promise<UserSession | null> => {
  try {
    const session = await getServerSession(req, {} as any, NextAuth);
    
    if (!session || !session.user) {
      return null;
    }

    return {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      isAdmin: session.user.role === 'admin',
    };
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};