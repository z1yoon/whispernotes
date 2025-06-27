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

    const response = await axios.get(`${AUTH_SERVICE_URL}/api/v1/admin/users`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Get users error:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || error.response?.data?.error || 'Internal Server Error';
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
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

    const response = await axios.delete(`${AUTH_SERVICE_URL}/api/v1/admin/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || error.response?.data?.error || 'Internal Server Error';
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
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

    if (action === 'toggle-admin') {
      const response = await axios.post(`${AUTH_SERVICE_URL}/api/v1/admin/users/${userId}/toggle-admin`, {}, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      return NextResponse.json({ success: true, message: 'Admin status toggled successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('User action error:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || error.response?.data?.error || 'Internal Server Error';
    return NextResponse.json({ error: message }, { status });
  }
}