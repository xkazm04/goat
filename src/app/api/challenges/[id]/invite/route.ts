/**
 * Challenge Invitation API Route
 * Handles sending and managing invitations
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
 * POST /api/challenges/[id]/invite
 * Send invitations for a challenge
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: challengeId } = await context.params;
    const body = await request.json();
    const { invitees, inviterName } = body as {
      invitees: Array<{ userId?: string; email?: string }>;
      inviterName: string;
    };

    if (!invitees || !Array.isArray(invitees) || invitees.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid invitees array' },
        { status: 400 }
      );
    }

    const challengeManager = getChallengeManager();
    const challenge = await challengeManager.getChallenge(challengeId);

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    // Only creator can invite
    if (challenge.creatorId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invitationSystem = getInvitationSystem();
    const invitations = await invitationSystem.createBulkInvitations(
      challengeId,
      challenge.title,
      userId,
      inviterName,
      invitees
    );

    // Update challenge stats
    await challengeManager.updateChallenge({
      challengeId,
      updates: {
        stats: {
          ...challenge.stats,
          invitationsSent: challenge.stats.invitationsSent + invitations.length,
        },
      },
    });

    // Generate invitation links
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goat.app';
    const invitationsWithLinks = invitations.map((inv) => ({
      ...inv,
      link: invitationSystem.generateInvitationLink(inv, baseUrl),
    }));

    return NextResponse.json({ invitations: invitationsWithLinks });
  } catch (error) {
    console.error('Error sending invitations:', error);
    return NextResponse.json(
      { error: 'Failed to send invitations' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/challenges/[id]/invite
 * Get invitations for a challenge
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: challengeId } = await context.params;

    const challengeManager = getChallengeManager();
    const challenge = await challengeManager.getChallenge(challengeId);

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    // Only creator can see all invitations
    if (challenge.creatorId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invitationSystem = getInvitationSystem();
    const [invitations, stats] = await Promise.all([
      invitationSystem.getChallengeInvitations(challengeId),
      invitationSystem.getInvitationStats(challengeId),
    ]);

    return NextResponse.json({ invitations, stats });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}
