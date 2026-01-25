/**
 * Challenges API Routes
 * Handles challenge CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getChallengeManager,
  getInvitationSystem,
  getShareChainTracker,
  getStreakTracker,
  type CreateChallengeInput,
  type RankedItem,
} from '@/lib/challenges';

/**
 * GET /api/challenges
 * Get challenges for current user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'created' | 'participated' | 'all'
    const status = searchParams.get('status');
    const code = searchParams.get('code');

    const challengeManager = getChallengeManager();

    // Get by code
    if (code) {
      const challenge = await challengeManager.getChallengeByCode(code);
      if (!challenge) {
        return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
      }

      // Record view
      await challengeManager.recordView(challenge.id);

      return NextResponse.json({ challenge });
    }

    // Get user challenges
    const filters: Parameters<typeof challengeManager.getUserChallenges>[1] = {};

    if (type === 'created') {
      filters.creatorId = userId;
    } else if (type === 'participated') {
      filters.participantId = userId;
    }

    if (status) {
      filters.status = status.split(',') as ('active' | 'completed' | 'cancelled')[];
    }

    const challenges = await challengeManager.getUserChallenges(userId, filters);

    return NextResponse.json({ challenges });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/challenges
 * Create a new challenge
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { input, creatorName, creatorRanking } = body as {
      input: CreateChallengeInput;
      creatorName: string;
      creatorRanking?: RankedItem[];
    };

    if (!input || !input.title || !input.listId) {
      return NextResponse.json(
        { error: 'Missing required fields: title, listId' },
        { status: 400 }
      );
    }

    const challengeManager = getChallengeManager();
    const shareChainTracker = getShareChainTracker();

    // Create the challenge
    const challenge = await challengeManager.createChallenge(
      input,
      userId,
      creatorName,
      creatorRanking
    );

    // Create share chain for viral tracking
    await shareChainTracker.createChain(
      challenge.id,
      challenge.title,
      userId,
      creatorName
    );

    // Record streak activity
    const streakTracker = getStreakTracker();
    await streakTracker.recordActivity(userId, 'any_challenge');

    return NextResponse.json({ challenge }, { status: 201 });
  } catch (error) {
    console.error('Error creating challenge:', error);
    return NextResponse.json(
      { error: 'Failed to create challenge' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/challenges
 * Update a challenge
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { challengeId, updates } = body;

    if (!challengeId) {
      return NextResponse.json(
        { error: 'Missing challengeId' },
        { status: 400 }
      );
    }

    const challengeManager = getChallengeManager();
    const challenge = await challengeManager.getChallenge(challengeId);

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    // Only creator can update
    if (challenge.creatorId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await challengeManager.updateChallenge({
      challengeId,
      updates,
    });

    return NextResponse.json({ challenge: updated });
  } catch (error) {
    console.error('Error updating challenge:', error);
    return NextResponse.json(
      { error: 'Failed to update challenge' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/challenges
 * Cancel a challenge
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const challengeId = searchParams.get('id');

    if (!challengeId) {
      return NextResponse.json(
        { error: 'Missing challenge id' },
        { status: 400 }
      );
    }

    const challengeManager = getChallengeManager();
    const challenge = await challengeManager.getChallenge(challengeId);

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    // Only creator can cancel
    if (challenge.creatorId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Cancel pending invitations
    const invitationSystem = getInvitationSystem();
    await invitationSystem.cancelPendingInvitations(challengeId);

    // Cancel the challenge
    await challengeManager.cancelChallenge(challengeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling challenge:', error);
    return NextResponse.json(
      { error: 'Failed to cancel challenge' },
      { status: 500 }
    );
  }
}
