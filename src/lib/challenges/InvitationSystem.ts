/**
 * InvitationSystem
 * Handles challenge invitations, acceptance, and tracking
 */

import {
  Challenge,
  ChallengeInvitation,
  ChallengeParticipant,
  ParticipantStatus,
} from './types';

/**
 * Generate a unique invitation token
 */
function generateInvitationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `inv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Default invitation expiry (7 days)
 */
const DEFAULT_EXPIRY_DAYS = 7;

/**
 * InvitationSystem class
 * Manages all invitation-related operations
 */
export class InvitationSystem {
  private invitations: Map<string, ChallengeInvitation> = new Map();
  private participants: Map<string, ChallengeParticipant[]> = new Map();
  private tokenToInvitation: Map<string, string> = new Map();

  /**
   * Create an invitation
   */
  async createInvitation(
    challengeId: string,
    challengeTitle: string,
    inviterId: string,
    inviterName: string,
    options: {
      inviteeId?: string;
      inviteeEmail?: string;
      expiryDays?: number;
    } = {}
  ): Promise<ChallengeInvitation> {
    const token = generateInvitationToken();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + (options.expiryDays || DEFAULT_EXPIRY_DAYS) * 24 * 60 * 60 * 1000
    );

    const invitation: ChallengeInvitation = {
      id: generateId(),
      challengeId,
      challengeTitle,
      inviterId,
      inviterName,
      inviteeId: options.inviteeId,
      inviteeEmail: options.inviteeEmail,
      token,
      status: 'pending',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    this.invitations.set(invitation.id, invitation);
    this.tokenToInvitation.set(token, invitation.id);

    // Also create participant entry
    await this.addParticipant(challengeId, {
      userId: options.inviteeId || `pending_${token.substring(0, 8)}`,
      displayName: options.inviteeEmail || 'Invited User',
      status: 'invited',
      invitedAt: now.toISOString(),
      invitedBy: inviterId,
    });

    return invitation;
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<ChallengeInvitation | null> {
    const invitationId = this.tokenToInvitation.get(token);
    if (!invitationId) return null;
    return this.invitations.get(invitationId) || null;
  }

  /**
   * Get invitation by ID
   */
  async getInvitation(invitationId: string): Promise<ChallengeInvitation | null> {
    return this.invitations.get(invitationId) || null;
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(
    token: string,
    userId: string,
    userName: string,
    userAvatar?: string
  ): Promise<{ invitation: ChallengeInvitation; participant: ChallengeParticipant } | null> {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation) return null;

    // Check if expired
    if (new Date(invitation.expiresAt) < new Date()) {
      invitation.status = 'expired';
      return null;
    }

    // Check if already responded
    if (invitation.status !== 'pending') {
      return null;
    }

    // Update invitation
    invitation.status = 'accepted';
    invitation.respondedAt = new Date().toISOString();
    invitation.inviteeId = userId;

    // Update participant
    const participants = this.participants.get(invitation.challengeId) || [];
    let participant = participants.find(
      p => p.userId === userId || p.userId.startsWith('pending_')
    );

    if (participant) {
      participant.userId = userId;
      participant.displayName = userName;
      participant.avatarUrl = userAvatar;
      participant.status = 'accepted';
      participant.joinedAt = new Date().toISOString();
    } else {
      participant = {
        userId,
        displayName: userName,
        avatarUrl: userAvatar,
        status: 'accepted',
        invitedAt: invitation.createdAt,
        joinedAt: new Date().toISOString(),
        invitedBy: invitation.inviterId,
      };
      participants.push(participant);
      this.participants.set(invitation.challengeId, participants);
    }

    return { invitation, participant };
  }

  /**
   * Decline an invitation
   */
  async declineInvitation(token: string): Promise<ChallengeInvitation | null> {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation || invitation.status !== 'pending') return null;

    invitation.status = 'declined';
    invitation.respondedAt = new Date().toISOString();

    // Update participant status
    const participants = this.participants.get(invitation.challengeId) || [];
    const participant = participants.find(
      p => p.userId === invitation.inviteeId || p.userId.startsWith('pending_')
    );
    if (participant) {
      participant.status = 'declined';
    }

    return invitation;
  }

  /**
   * Get all invitations for a challenge
   */
  async getChallengeInvitations(challengeId: string): Promise<ChallengeInvitation[]> {
    return Array.from(this.invitations.values())
      .filter(inv => inv.challengeId === challengeId);
  }

  /**
   * Get invitations sent by a user
   */
  async getSentInvitations(userId: string): Promise<ChallengeInvitation[]> {
    return Array.from(this.invitations.values())
      .filter(inv => inv.inviterId === userId);
  }

  /**
   * Get invitations received by a user
   */
  async getReceivedInvitations(userId: string): Promise<ChallengeInvitation[]> {
    return Array.from(this.invitations.values())
      .filter(inv => inv.inviteeId === userId);
  }

  /**
   * Get pending invitations for a user
   */
  async getPendingInvitations(userId: string): Promise<ChallengeInvitation[]> {
    return Array.from(this.invitations.values())
      .filter(inv => inv.inviteeId === userId && inv.status === 'pending');
  }

  /**
   * Add a participant to a challenge
   */
  async addParticipant(
    challengeId: string,
    participant: Omit<ChallengeParticipant, 'submission'>
  ): Promise<ChallengeParticipant> {
    const participants = this.participants.get(challengeId) || [];

    // Check if already exists
    const existing = participants.find(p => p.userId === participant.userId);
    if (existing) {
      Object.assign(existing, participant);
      return existing;
    }

    const newParticipant: ChallengeParticipant = {
      ...participant,
      submission: undefined,
    };
    participants.push(newParticipant);
    this.participants.set(challengeId, participants);

    return newParticipant;
  }

  /**
   * Get participants for a challenge
   */
  async getParticipants(challengeId: string): Promise<ChallengeParticipant[]> {
    return this.participants.get(challengeId) || [];
  }

  /**
   * Update participant status
   */
  async updateParticipantStatus(
    challengeId: string,
    userId: string,
    status: ParticipantStatus
  ): Promise<ChallengeParticipant | null> {
    const participants = this.participants.get(challengeId) || [];
    const participant = participants.find(p => p.userId === userId);

    if (!participant) return null;

    participant.status = status;
    if (status === 'submitted') {
      participant.submittedAt = new Date().toISOString();
    }

    return participant;
  }

  /**
   * Get participant by user ID
   */
  async getParticipant(
    challengeId: string,
    userId: string
  ): Promise<ChallengeParticipant | null> {
    const participants = this.participants.get(challengeId) || [];
    return participants.find(p => p.userId === userId) || null;
  }

  /**
   * Check if user is participant
   */
  async isParticipant(challengeId: string, userId: string): Promise<boolean> {
    const participant = await this.getParticipant(challengeId, userId);
    return participant !== null && participant.status !== 'declined';
  }

  /**
   * Generate invitation link
   */
  generateInvitationLink(invitation: ChallengeInvitation, baseUrl: string): string {
    return `${baseUrl}/challenge/join?token=${invitation.token}`;
  }

  /**
   * Generate bulk invitations
   */
  async createBulkInvitations(
    challengeId: string,
    challengeTitle: string,
    inviterId: string,
    inviterName: string,
    invitees: Array<{ userId?: string; email?: string }>
  ): Promise<ChallengeInvitation[]> {
    const invitations: ChallengeInvitation[] = [];

    for (const invitee of invitees) {
      const invitation = await this.createInvitation(
        challengeId,
        challengeTitle,
        inviterId,
        inviterName,
        {
          inviteeId: invitee.userId,
          inviteeEmail: invitee.email,
        }
      );
      invitations.push(invitation);
    }

    return invitations;
  }

  /**
   * Cancel pending invitations for a challenge
   */
  async cancelPendingInvitations(challengeId: string): Promise<number> {
    let cancelled = 0;
    const invitations = Array.from(this.invitations.values());

    for (const invitation of invitations) {
      if (invitation.challengeId === challengeId && invitation.status === 'pending') {
        invitation.status = 'expired';
        cancelled++;
      }
    }

    return cancelled;
  }

  /**
   * Get invitation statistics for a challenge
   */
  async getInvitationStats(challengeId: string): Promise<{
    total: number;
    pending: number;
    accepted: number;
    declined: number;
    expired: number;
    acceptanceRate: number;
  }> {
    const invitations = await this.getChallengeInvitations(challengeId);

    const stats = {
      total: invitations.length,
      pending: invitations.filter(i => i.status === 'pending').length,
      accepted: invitations.filter(i => i.status === 'accepted').length,
      declined: invitations.filter(i => i.status === 'declined').length,
      expired: invitations.filter(i => i.status === 'expired').length,
      acceptanceRate: 0,
    };

    const responded = stats.accepted + stats.declined;
    stats.acceptanceRate = responded > 0 ? (stats.accepted / responded) * 100 : 0;

    return stats;
  }

  /**
   * Resend an invitation
   */
  async resendInvitation(invitationId: string): Promise<ChallengeInvitation | null> {
    const invitation = await this.getInvitation(invitationId);
    if (!invitation || invitation.status !== 'pending') return null;

    // Generate new token
    const oldToken = invitation.token;
    const newToken = generateInvitationToken();

    invitation.token = newToken;
    invitation.expiresAt = new Date(
      Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    // Update token mapping
    this.tokenToInvitation.delete(oldToken);
    this.tokenToInvitation.set(newToken, invitation.id);

    return invitation;
  }
}

/**
 * Create an invitation system instance
 */
export function createInvitationSystem(): InvitationSystem {
  return new InvitationSystem();
}

// Singleton instance
let invitationSystemInstance: InvitationSystem | null = null;

/**
 * Get the singleton invitation system instance
 */
export function getInvitationSystem(): InvitationSystem {
  if (!invitationSystemInstance) {
    invitationSystemInstance = new InvitationSystem();
  }
  return invitationSystemInstance;
}
