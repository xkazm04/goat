/**
 * Challenge Leaderboard API Route
 * Handles leaderboard data for challenges
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getChallengeManager } from '@/lib/challenges';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/challenges/[id]/leaderboard
 * Get leaderboard for a challenge
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: challengeId } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const challengeManager = getChallengeManager();
    const challenge = await challengeManager.getChallenge(challengeId);

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const leaderboard = await challengeManager.getLeaderboard(
      challengeId,
      limit,
      userId || undefined
    );

    // Get user's rank if authenticated
    let userRank: number | null = null;
    let userSubmission = null;

    if (userId) {
      userSubmission = await challengeManager.getUserSubmission(challengeId, userId);
      if (userSubmission) {
        const fullLeaderboard = await challengeManager.getLeaderboard(challengeId, 1000, userId);
        userRank = fullLeaderboard.findIndex((entry) => entry.userId === userId) + 1;
      }
    }

    return NextResponse.json({
      leaderboard,
      totalParticipants: challenge.stats.submissions,
      userRank,
      userSubmission,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
