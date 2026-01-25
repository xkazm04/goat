/**
 * Challenge Detail API Routes
 * Handles operations for a specific challenge
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getChallengeManager,
  getInvitationSystem,
  getShareChainTracker,
} from '@/lib/challenges';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/challenges/[id]
 * Get challenge details
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: challengeId } = await context.params;
    const { userId } = await auth();

    const challengeManager = getChallengeManager();
    const challenge = await challengeManager.getChallenge(challengeId);

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    // Record view
    await challengeManager.recordView(challengeId);

    // Get additional data
    const invitationSystem = getInvitationSystem();
    const shareChainTracker = getShareChainTracker();

    const [participants, leaderboard, chainInfo, userSubmission] = await Promise.all([
      invitationSystem.getParticipants(challengeId),
      challengeManager.getLeaderboard(challengeId, 10, userId || undefined),
      shareChainTracker.getChainInfo(challengeId),
      userId ? challengeManager.getUserSubmission(challengeId, userId) : null,
    ]);

    return NextResponse.json({
      challenge,
      participants,
      leaderboard,
      chainInfo,
      userSubmission,
    });
  } catch (error) {
    console.error('Error fetching challenge:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenge' },
      { status: 500 }
    );
  }
}
