import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(
  req: NextRequest,
  context: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized: Not authenticated' }, { status: 401 });
    }

    const { sessionId } = await context.params;

    if (!sessionId) {
      return NextResponse.json({ message: 'Missing sessionId parameter' }, { status: 400 });
    }

    // Get user ID - check multiple possible fields
    const userId = session.user.id || session.user.sub || session.user.userId;
    const isAdmin = session.user.role === 'admin';

    if (!userId && !isAdmin) {
      console.error('No user ID found in session:', JSON.stringify(session.user, null, 2));
      return NextResponse.json({ message: 'Invalid session: No user ID' }, { status: 401 });
    }

    try {
      // Fetch LLM analysis from the LLM service
      const llmServiceUrl = process.env.LLM_SERVICE_URL || 'http://llm-service:8004';
      const response = await fetch(`${llmServiceUrl}/analysis/${sessionId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return NextResponse.json({ message: 'Analysis not found' }, { status: 404 });
        }
        throw new Error('Failed to fetch analysis data');
      }

      const analysisData = await response.json();
      
      // Verify user has access to this transcript (unless admin)
      if (!isAdmin) {
        // First get the transcript to check ownership
        const transcriptResponse = await fetch(`${process.env.FILE_UPLOADER_URL || 'http://file-uploader:8002'}/api/v1/transcripts/user/${userId}`);
        
        if (transcriptResponse.ok) {
          const transcriptData = await transcriptResponse.json();
          const transcript = transcriptData.transcriptions?.find((t: any) => t.sessionId === sessionId);
          
          if (!transcript || transcript.user_id !== userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
          }
        } else {
          return NextResponse.json({ error: 'Could not verify transcript ownership' }, { status: 403 });
        }
      }

      return NextResponse.json(analysisData);

    } catch (error) {
      console.error('Error fetching analysis:', error);
      return NextResponse.json({ error: 'Failed to load analysis data' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in analysis API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}