import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

// Use environment variables for service URLs
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8001';

export async function POST(req: NextRequest) {
  try {
    // Get session to verify admin access
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized: Not authenticated' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get data from request body instead of query params
    const { userId, makeAdmin } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Forward the toggle admin request to auth service
    const response = await axios.post(
      `${AUTH_SERVICE_URL}/api/v1/admin/users/${userId}/toggle-admin`,
      { make_admin: makeAdmin },
      { 
        headers: { 
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        } 
      }
    );

    return NextResponse.json(response.data);

  } catch (error: any) {
    console.error('Error toggling admin status:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || error.response?.data?.error || 'Internal Server Error';
    return NextResponse.json({ error: message }, { status });
  }
}