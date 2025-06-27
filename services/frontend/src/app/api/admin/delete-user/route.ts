import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

// Use environment variables for service URLs
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8001';

export async function DELETE(req: NextRequest) {
  try {
    // Get session to verify admin access
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized: Not authenticated' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get user ID from request body instead of query params
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Forward the delete request to auth service
    const response = await axios.delete(
      `${AUTH_SERVICE_URL}/api/v1/admin/users/${userId}`,
      { 
        headers: { 
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        } 
      }
    );

    return NextResponse.json(response.data);

  } catch (error: any) {
    console.error('Error deleting user:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || error.response?.data?.error || 'Internal Server Error';
    return NextResponse.json({ error: message }, { status });
  }
}