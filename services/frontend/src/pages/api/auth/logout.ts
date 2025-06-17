import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Clear the token cookie
    res.setHeader(
      'Set-Cookie',
      'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'
    );
    res.status(200).json({ success: true, message: 'Logged out' });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 