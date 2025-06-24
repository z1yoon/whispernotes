import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000';

export async function GET(req: NextRequest) {
  try {
    // Correct way to get session in App Router
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
    }

    const response = await axios.get(`${AUTH_SERVICE_URL}/api/v1/admin/access-requests`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Get access requests error:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || error.response?.data?.error || 'Internal Server Error';
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, requestId } = await req.json();

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    // Correct way to get session in App Router
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
    }

    let endpoint = '';
    let successMessage = '';

    if (action === 'approve') {
      endpoint = `${AUTH_SERVICE_URL}/api/v1/admin/access-requests/${requestId}/approve`;
      successMessage = 'Access request approved successfully';
    } else if (action === 'reject') {
      endpoint = `${AUTH_SERVICE_URL}/api/v1/admin/access-requests/${requestId}/reject`;
      successMessage = 'Access request rejected successfully';
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const response = await axios.post(endpoint, {}, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    return NextResponse.json({ success: true, message: successMessage });
  } catch (error: any) {
    console.error('Access request action error:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || error.response?.data?.error || 'Internal Server Error';
    return NextResponse.json({ error: message }, { status });
  }
}