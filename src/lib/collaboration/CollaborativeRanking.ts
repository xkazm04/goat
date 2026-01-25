/**
 * CollaborativeRanking
 * Multi-user ranking collaboration system
 * Allows multiple users to contribute to a shared ranking
 */

import type { RankedItem } from '../challenges/types';

/**
 * Collaboration mode for ranking
 */
export type CollaborationMode =
  | 'voting'       // Users vote on items, highest votes win
  | 'consensus'    // All must agree on final ranking
  | 'turn_based'   // Users take turns placing items
  | 'weighted'     // Weighted by user expertise/reputation
  | 'average';     // Average all rankings together

/**
 * Vote on an item
 */
export interface ItemVote {
  /** Item ID */
  itemId: string;
  /** Suggested position */
  position: number;
  /** User ID */
  userId: string;
  /** Confidence/weight */
  weight: number;
  /** Timestamp */
  votedAt: string;
}

/**
 * Collaborative session state
 */
export interface CollaborativeSession {
  /** Session ID */
  id: string;
  /** Challenge ID */
  challengeId: string;
  /** Collaboration mode */
  mode: CollaborationMode;
  /** Current state */
  state: 'waiting' | 'active' | 'voting' | 'finalizing' | 'completed';
  /** Participants */
  participants: CollaborativeParticipant[];
  /** Items to rank */
  items: CollaborativeItem[];
  /** Current round (for turn-based) */
  currentRound?: number;
  /** Current turn user (for turn-based) */
  currentTurnUserId?: string;
  /** Final ranking */
  finalRanking?: RankedItem[];
  /** Created at */
  createdAt: string;
  /** Updated at */
  updatedAt: string;
  /** Expires at */
  expiresAt?: string;
}

/**
 * Participant in collaborative session
 */
export interface CollaborativeParticipant {
  /** User ID */
  userId: string;
  /** Display name */
  displayName: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Joined at */
  joinedAt: string;
  /** Is ready to start */
  isReady: boolean;
  /** Has submitted for current round */
  hasSubmitted: boolean;
  /** User weight (for weighted mode) */
  weight?: number;
}

/**
 * Item in collaborative session with votes
 */
export interface CollaborativeItem {
  /** Item ID */
  id: string;
  /** Item title */
  title: string;
  /** Item image */
  imageUrl?: string;
  /** Current position (may be null if unranked) */
  position?: number;
  /** Votes received */
  votes: ItemVote[];
  /** Calculated score */
  score: number;
  /** Is locked (position finalized) */
  isLocked: boolean;
  /** Placed by user ID (for turn-based) */
  placedBy?: string;
}

/**
 * Action in collaborative session
 */
export type CollaborativeAction =
  | { type: 'join'; userId: string; displayName: string; avatarUrl?: string }
  | { type: 'ready'; userId: string }
  | { type: 'vote'; userId: string; itemId: string; position: number; weight?: number }
  | { type: 'place'; userId: string; itemId: string; position: number }
  | { type: 'lock'; itemId: string }
  | { type: 'finalize' }
  | { type: 'reset' };

/**
 * CollaborativeRanking class
 * Manages multi-user ranking collaboration
 */
export class CollaborativeRanking {
  private sessions: Map<string, CollaborativeSession> = new Map();
  private sessionByChallenge: Map<string, string> = new Map();

  /**
   * Generate a unique session ID
   */
  private generateId(): string {
    return `collab_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Create a collaborative session
   */
  async createSession(
    challengeId: string,
    mode: CollaborationMode,
    items: Array<{ id: string; title: string; imageUrl?: string }>,
    expiresInHours: number = 24
  ): Promise<CollaborativeSession> {
    const id = this.generateId();
    const now = new Date();

    const session: CollaborativeSession = {
      id,
      challengeId,
      mode,
      state: 'waiting',
      participants: [],
      items: items.map(item => ({
        ...item,
        votes: [],
        score: 0,
        isLocked: false,
      })),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + expiresInHours * 60 * 60 * 1000).toISOString(),
    };

    this.sessions.set(id, session);
    this.sessionByChallenge.set(challengeId, id);

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<CollaborativeSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get session by challenge ID
   */
  async getSessionByChallenge(challengeId: string): Promise<CollaborativeSession | null> {
    const sessionId = this.sessionByChallenge.get(challengeId);
    if (!sessionId) return null;
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Process an action
   */
  async processAction(
    sessionId: string,
    action: CollaborativeAction
  ): Promise<CollaborativeSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    switch (action.type) {
      case 'join':
        return this.handleJoin(session, action);

      case 'ready':
        return this.handleReady(session, action);

      case 'vote':
        return this.handleVote(session, action);

      case 'place':
        return this.handlePlace(session, action);

      case 'lock':
        return this.handleLock(session, action);

      case 'finalize':
        return this.handleFinalize(session);

      case 'reset':
        return this.handleReset(session);

      default:
        return session;
    }
  }

  /**
   * Handle join action
   */
  private handleJoin(
    session: CollaborativeSession,
    action: Extract<CollaborativeAction, { type: 'join' }>
  ): CollaborativeSession {
    // Check if already joined
    if (session.participants.some(p => p.userId === action.userId)) {
      return session;
    }

    session.participants.push({
      userId: action.userId,
      displayName: action.displayName,
      avatarUrl: action.avatarUrl,
      joinedAt: new Date().toISOString(),
      isReady: false,
      hasSubmitted: false,
      weight: 1,
    });

    session.updatedAt = new Date().toISOString();
    return session;
  }

  /**
   * Handle ready action
   */
  private handleReady(
    session: CollaborativeSession,
    action: Extract<CollaborativeAction, { type: 'ready' }>
  ): CollaborativeSession {
    const participant = session.participants.find(p => p.userId === action.userId);
    if (participant) {
      participant.isReady = true;
    }

    // Check if all participants are ready
    const allReady = session.participants.every(p => p.isReady);
    if (allReady && session.participants.length >= 2) {
      session.state = 'active';
      if (session.mode === 'turn_based') {
        session.currentRound = 1;
        session.currentTurnUserId = session.participants[0].userId;
      }
    }

    session.updatedAt = new Date().toISOString();
    return session;
  }

  /**
   * Handle vote action
   */
  private handleVote(
    session: CollaborativeSession,
    action: Extract<CollaborativeAction, { type: 'vote' }>
  ): CollaborativeSession {
    if (session.state !== 'active' && session.state !== 'voting') {
      return session;
    }

    const item = session.items.find(i => i.id === action.itemId);
    if (!item || item.isLocked) return session;

    // Remove previous vote from this user for this item
    item.votes = item.votes.filter(v => v.userId !== action.userId);

    // Add new vote
    const participant = session.participants.find(p => p.userId === action.userId);
    const weight = action.weight ?? participant?.weight ?? 1;

    item.votes.push({
      itemId: action.itemId,
      position: action.position,
      userId: action.userId,
      weight,
      votedAt: new Date().toISOString(),
    });

    // Recalculate score
    item.score = this.calculateItemScore(item, session.mode);

    session.updatedAt = new Date().toISOString();
    return session;
  }

  /**
   * Handle place action (for turn-based)
   */
  private handlePlace(
    session: CollaborativeSession,
    action: Extract<CollaborativeAction, { type: 'place' }>
  ): CollaborativeSession {
    if (session.mode !== 'turn_based' || session.state !== 'active') {
      return session;
    }

    if (session.currentTurnUserId !== action.userId) {
      return session; // Not this user's turn
    }

    const item = session.items.find(i => i.id === action.itemId);
    if (!item || item.isLocked || item.position !== undefined) {
      return session;
    }

    // Place the item
    item.position = action.position;
    item.isLocked = true;
    item.placedBy = action.userId;

    // Move to next turn
    const currentIndex = session.participants.findIndex(
      p => p.userId === session.currentTurnUserId
    );
    const nextIndex = (currentIndex + 1) % session.participants.length;
    session.currentTurnUserId = session.participants[nextIndex].userId;

    // Check if round is complete
    if (nextIndex === 0) {
      session.currentRound = (session.currentRound || 1) + 1;
    }

    // Check if all items are placed
    const allPlaced = session.items.every(i => i.position !== undefined);
    if (allPlaced) {
      session.state = 'finalizing';
    }

    session.updatedAt = new Date().toISOString();
    return session;
  }

  /**
   * Handle lock action
   */
  private handleLock(
    session: CollaborativeSession,
    action: Extract<CollaborativeAction, { type: 'lock' }>
  ): CollaborativeSession {
    const item = session.items.find(i => i.id === action.itemId);
    if (item) {
      item.isLocked = true;
    }

    session.updatedAt = new Date().toISOString();
    return session;
  }

  /**
   * Handle finalize action
   */
  private handleFinalize(session: CollaborativeSession): CollaborativeSession {
    // Calculate final ranking based on mode
    session.finalRanking = this.calculateFinalRanking(session);
    session.state = 'completed';
    session.updatedAt = new Date().toISOString();
    return session;
  }

  /**
   * Handle reset action
   */
  private handleReset(session: CollaborativeSession): CollaborativeSession {
    session.state = 'waiting';
    session.participants.forEach(p => {
      p.isReady = false;
      p.hasSubmitted = false;
    });
    session.items.forEach(item => {
      item.votes = [];
      item.score = 0;
      item.isLocked = false;
      item.position = undefined;
      item.placedBy = undefined;
    });
    session.currentRound = undefined;
    session.currentTurnUserId = undefined;
    session.finalRanking = undefined;
    session.updatedAt = new Date().toISOString();
    return session;
  }

  /**
   * Calculate item score based on mode
   */
  private calculateItemScore(item: CollaborativeItem, mode: CollaborationMode): number {
    if (item.votes.length === 0) return 0;

    switch (mode) {
      case 'voting': {
        // Sum of inverse positions (lower position = higher score)
        let totalWeight = 0;
        let weightedSum = 0;
        for (const vote of item.votes) {
          const positionScore = 100 - vote.position; // Higher position = lower score
          weightedSum += positionScore * vote.weight;
          totalWeight += vote.weight;
        }
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
      }

      case 'average': {
        const sum = item.votes.reduce((acc, v) => acc + v.position, 0);
        return item.votes.length > 0 ? sum / item.votes.length : 0;
      }

      case 'weighted': {
        let totalWeight = 0;
        let weightedSum = 0;
        for (const vote of item.votes) {
          weightedSum += vote.position * vote.weight;
          totalWeight += vote.weight;
        }
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
      }

      case 'consensus': {
        // All votes must agree
        if (item.votes.length === 0) return 0;
        const firstPosition = item.votes[0].position;
        const allAgree = item.votes.every(v => v.position === firstPosition);
        return allAgree ? firstPosition : 0;
      }

      default:
        return 0;
    }
  }

  /**
   * Calculate final ranking
   */
  private calculateFinalRanking(session: CollaborativeSession): RankedItem[] {
    const items = [...session.items];

    switch (session.mode) {
      case 'voting':
      case 'weighted':
        // Sort by score (higher = better = lower position)
        items.sort((a, b) => b.score - a.score);
        break;

      case 'average':
        // Sort by score (lower = better position)
        items.sort((a, b) => a.score - b.score);
        break;

      case 'turn_based':
        // Sort by assigned position
        items.sort((a, b) => (a.position || 999) - (b.position || 999));
        break;

      case 'consensus':
        // Only include items with consensus
        const consensusItems = items.filter(item => {
          if (item.votes.length === 0) return false;
          const firstPosition = item.votes[0].position;
          return item.votes.every(v => v.position === firstPosition);
        });
        consensusItems.sort((a, b) => (a.votes[0]?.position || 0) - (b.votes[0]?.position || 0));
        return consensusItems.map((item, index) => ({
          id: item.id,
          position: index + 1,
          title: item.title,
          imageUrl: item.imageUrl,
        }));
    }

    return items.map((item, index) => ({
      id: item.id,
      position: index + 1,
      title: item.title,
      imageUrl: item.imageUrl,
    }));
  }

  /**
   * Get current state summary
   */
  getSessionSummary(session: CollaborativeSession): {
    participantCount: number;
    readyCount: number;
    itemsRanked: number;
    totalItems: number;
    isComplete: boolean;
    currentTurn?: string;
  } {
    return {
      participantCount: session.participants.length,
      readyCount: session.participants.filter(p => p.isReady).length,
      itemsRanked: session.items.filter(i => i.position !== undefined || i.isLocked).length,
      totalItems: session.items.length,
      isComplete: session.state === 'completed',
      currentTurn: session.currentTurnUserId,
    };
  }

  /**
   * Check if user can take action
   */
  canUserAct(session: CollaborativeSession, userId: string): boolean {
    if (session.state !== 'active') return false;

    if (session.mode === 'turn_based') {
      return session.currentTurnUserId === userId;
    }

    return session.participants.some(p => p.userId === userId);
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    this.sessionByChallenge.delete(session.challengeId);
    this.sessions.delete(sessionId);
    return true;
  }
}

/**
 * Create a collaborative ranking instance
 */
export function createCollaborativeRanking(): CollaborativeRanking {
  return new CollaborativeRanking();
}

// Singleton instance
let collaborativeRankingInstance: CollaborativeRanking | null = null;

/**
 * Get the singleton collaborative ranking instance
 */
export function getCollaborativeRanking(): CollaborativeRanking {
  if (!collaborativeRankingInstance) {
    collaborativeRankingInstance = new CollaborativeRanking();
  }
  return collaborativeRankingInstance;
}
