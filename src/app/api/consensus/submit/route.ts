/**
 * Consensus Submit API Route
 * POST /api/consensus/submit
 * Submits user ranking to community aggregate
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Ranking submission payload
 */
interface SubmitPayload {
  listId: string;
  userId: string;
  rankings: Array<{
    itemId: string;
    position: number;
  }>;
}

/**
 * POST handler
 */
export async function POST(request: NextRequest) {
  try {
    const body: SubmitPayload = await request.json();

    // Validate payload
    if (!body.listId || !body.userId || !body.rankings) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.rankings) || body.rankings.length === 0) {
      return NextResponse.json(
        { error: 'Rankings must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate each ranking entry
    for (const ranking of body.rankings) {
      if (!ranking.itemId || typeof ranking.position !== 'number') {
        return NextResponse.json(
          { error: 'Invalid ranking entry format' },
          { status: 400 }
        );
      }

      if (ranking.position < 0) {
        return NextResponse.json(
          { error: 'Position must be non-negative' },
          { status: 400 }
        );
      }
    }

    // In production, this would:
    // 1. Verify user authentication
    // 2. Store ranking in database
    // 3. Update aggregate statistics
    // 4. Trigger real-time updates via WebSocket

    // For now, just acknowledge the submission
    console.log('Ranking submitted:', {
      listId: body.listId,
      userId: body.userId,
      itemCount: body.rankings.length,
    });

    return NextResponse.json({
      success: true,
      message: 'Ranking submitted successfully',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Failed to submit ranking:', error);
    return NextResponse.json(
      { error: 'Failed to submit ranking' },
      { status: 500 }
    );
  }
}
