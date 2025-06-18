import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Clear the authentication cookie
    res.setHeader(
      'Set-Cookie',
      'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'
    );
    
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}