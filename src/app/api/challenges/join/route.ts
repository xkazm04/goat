/**
 * Challenge Join API Route
 * Handles accepting/declining challenge invitations
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getChallengeManager,
  getInvitationSystem,
  getShareChainTracker,
} from '@/lib/challenges';

/**
 * POST /api/challenges/join
 * Accept an invitation and join a challenge
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token, userName, userAvatar } = body as {
      token: string;
      userName: string;
      userAvatar?: string;
    };

    if (!token) {
      return NextResponse.json(
        { error: 'Missing invitation token' },
        { status: 400 }
      );
    }

    const invitationSystem = getInvitationSystem();
    const result = await invitationSystem.acceptInvitation(
      token,
      userId,
      userName,
      userAvatar
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      );
    }

    const { invitation, participant } = result;

    // Get the challenge
    const challengeManager = getChallengeManager();
    const challenge = await challengeManager.getChallenge(invitation.challengeId);

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    // Update challenge stats
    await challengeManager.updateChallenge({
      challengeId: invitation.challengeId,
      updates: {
        stats: {
          ...challenge.stats,
          invitationsAccepted: challenge.stats.invitationsAccepted + 1,
        },
      },
    });

    // Add to share chain
    const shareChainTracker = getShareChainTracker();
    await shareChainTracker.addParticipant(
      invitation.challengeId,
      userId,
      userName,
      invitation.inviterId,
      userAvatar
    );

    return NextResponse.json({
      challenge,
      participant,
      invitation,
    });
  } catch (error) {
    console.error('Error joining challenge:', error);
    return NextResponse.json(
      { error: 'Failed to join challenge' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/challenges/join
 * Get invitation details by token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing invitation token' },
        { status: 400 }
      );
    }

    const invitationSystem = getInvitationSystem();
    const invitation = await invitationSystem.getInvitationByToken(token);

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired', expired: true },
        { status: 400 }
      );
    }

    // Get challenge details
    const challengeManager = getChallengeManager();
    const challenge = await challengeManager.getChallenge(invitation.challengeId);

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    return NextResponse.json({
      invitation,
      challenge: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        type: challenge.type,
        status: challenge.status,
        creatorName: challenge.creatorName,
        stats: {
          submissions: challenge.stats.submissions,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/challenges/join
 * Decline an invitation
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing invitation token' },
        { status: 400 }
      );
    }

    const invitationSystem = getInvitationSystem();
    const invitation = await invitationSystem.declineInvitation(token);

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or already responded invitation' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error declining invitation:', error);
    return NextResponse.json(
      { error: 'Failed to decline invitation' },
      { status: 500 }
    );
  }
}
