/**
 * Challenge Submission API Route
 * Handles ranking submissions for challenges
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getChallengeManager,
  getInvitationSystem,
  getShareChainTracker,
  getStreakTracker,
  type RankedItem,
} from '@/lib/challenges';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/challenges/[id]/submit
 * Submit a ranking for a challenge
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: challengeId } = await context.params;
    const body = await request.json();
    const { items, userName, userAvatar, timeTaken, referredBy } = body as {
      items: RankedItem[];
      userName: string;
      userAvatar?: string;
      timeTaken?: number;
      referredBy?: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid items array' },
        { status: 400 }
      );
    }

    const challengeManager = getChallengeManager();
    const challenge = await challengeManager.getChallenge(challengeId);

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    if (challenge.status !== 'active') {
      return NextResponse.json(
        { error: 'Challenge is not active' },
        { status: 400 }
      );
    }

    // Check if challenge is expired
    if (challengeManager.isChallengeExpired(challenge)) {
      return NextResponse.json(
        { error: 'Challenge has expired' },
        { status: 400 }
      );
    }

    // Add to share chain if referred
    const shareChainTracker = getShareChainTracker();
    if (referredBy) {
      await shareChainTracker.addParticipant(
        challengeId,
        userId,
        userName,
        referredBy,
        userAvatar
      );
    }

    // Submit the ranking
    const submission = await challengeManager.submitRanking(
      challengeId,
      userId,
      userName,
      items,
      timeTaken,
      userAvatar
    );

    if (!submission) {
      return NextResponse.json(
        { error: 'Failed to submit ranking' },
        { status: 500 }
      );
    }

    // Mark completed in share chain
    await shareChainTracker.markCompleted(challengeId, userId, submission.score);

    // Update participant status
    const invitationSystem = getInvitationSystem();
    await invitationSystem.updateParticipantStatus(challengeId, userId, 'submitted');

    // Record streak activity
    const streakTracker = getStreakTracker();
    const streakResult = await streakTracker.recordActivity(
      userId,
      'any_challenge',
      submission.score
    );

    // Apply streak bonus if any
    let finalScore = submission.score || 0;
    if (streakResult.streak) {
      const bonusResult = await streakTracker.applyStreakBonus(
        userId,
        finalScore,
        'any_challenge'
      );
      finalScore = bonusResult.finalScore;
    }

    // Get updated leaderboard
    const leaderboard = await challengeManager.getLeaderboard(challengeId, 10, userId);

    // Get user's rank
    const userRank = leaderboard.findIndex((entry) => entry.userId === userId) + 1;

    return NextResponse.json({
      submission: {
        ...submission,
        finalScore,
      },
      leaderboard,
      userRank: userRank > 0 ? userRank : null,
      streak: streakResult.streak,
      newMilestone: streakResult.newMilestone,
    });
  } catch (error) {
    console.error('Error submitting ranking:', error);
    return NextResponse.json(
      { error: 'Failed to submit ranking' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/challenges/[id]/submit
 * Get user's submission for a challenge
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: challengeId } = await context.params;
    const challengeManager = getChallengeManager();

    const submission = await challengeManager.getUserSubmission(challengeId, userId);

    return NextResponse.json({ submission });
  } catch (error) {
    console.error('Error fetching submission:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submission' },
      { status: 500 }
    );
  }
}
