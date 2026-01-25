/**
 * ShareChainTracker
 * Tracks viral share chains and visualizes spread
 * "X started, Y continued, Z completed"
 */

import type { ShareChainInfo } from './types';

/**
 * Share chain node
 */
export interface ShareChainNode {
  /** User ID */
  userId: string;
  /** Display name */
  displayName: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** When they joined the chain */
  joinedAt: string;
  /** Who referred them */
  referredBy?: string;
  /** How many they referred */
  referralCount: number;
  /** Did they complete the challenge */
  completed: boolean;
  /** Their submission score (if completed) */
  score?: number;
  /** Depth in the chain (0 = originator) */
  depth: number;
}

/**
 * Full share chain with all nodes
 */
export interface ShareChain {
  /** Chain ID (same as challenge ID) */
  id: string;
  /** Challenge ID */
  challengeId: string;
  /** Challenge title */
  challengeTitle: string;
  /** Originator user ID */
  originatorId: string;
  /** All nodes in the chain */
  nodes: ShareChainNode[];
  /** Maximum depth reached */
  maxDepth: number;
  /** Total participants */
  totalParticipants: number;
  /** Total completions */
  totalCompletions: number;
  /** Created at */
  createdAt: string;
  /** Last activity */
  lastActivityAt: string;
  /** Chain statistics */
  stats: ShareChainStats;
}

/**
 * Share chain statistics
 */
export interface ShareChainStats {
  /** Viral coefficient (avg referrals per user) */
  viralCoefficient: number;
  /** Completion rate */
  completionRate: number;
  /** Average score */
  averageScore: number;
  /** Time to first viral (when depth > 1) */
  timeToFirstViral?: number;
  /** Most active referrer */
  topReferrer?: {
    userId: string;
    displayName: string;
    referralCount: number;
  };
  /** Fastest completion */
  fastestCompletion?: {
    userId: string;
    displayName: string;
    timeTaken: number;
  };
}

/**
 * ShareChainTracker class
 * Manages share chain data and visualization
 */
export class ShareChainTracker {
  private chains: Map<string, ShareChain> = new Map();
  private userToChain: Map<string, Set<string>> = new Map();

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `chain_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Create a new share chain
   */
  async createChain(
    challengeId: string,
    challengeTitle: string,
    originatorId: string,
    originatorName: string,
    originatorAvatar?: string
  ): Promise<ShareChain> {
    const now = new Date().toISOString();

    const chain: ShareChain = {
      id: this.generateId(),
      challengeId,
      challengeTitle,
      originatorId,
      nodes: [
        {
          userId: originatorId,
          displayName: originatorName,
          avatarUrl: originatorAvatar,
          joinedAt: now,
          referralCount: 0,
          completed: true, // Originator is considered completed
          depth: 0,
        },
      ],
      maxDepth: 0,
      totalParticipants: 1,
      totalCompletions: 1,
      createdAt: now,
      lastActivityAt: now,
      stats: {
        viralCoefficient: 0,
        completionRate: 100,
        averageScore: 0,
      },
    };

    this.chains.set(challengeId, chain);
    this.trackUserChain(originatorId, challengeId);

    return chain;
  }

  /**
   * Track user's participation in a chain
   */
  private trackUserChain(userId: string, challengeId: string): void {
    const userChains = this.userToChain.get(userId) || new Set();
    userChains.add(challengeId);
    this.userToChain.set(userId, userChains);
  }

  /**
   * Add a participant to a chain
   */
  async addParticipant(
    challengeId: string,
    userId: string,
    displayName: string,
    referredBy?: string,
    avatarUrl?: string
  ): Promise<ShareChainNode | null> {
    const chain = this.chains.get(challengeId);
    if (!chain) return null;

    // Check if already in chain
    if (chain.nodes.some(n => n.userId === userId)) {
      return chain.nodes.find(n => n.userId === userId) || null;
    }

    // Find referrer's depth
    let depth = 1;
    if (referredBy) {
      const referrer = chain.nodes.find(n => n.userId === referredBy);
      if (referrer) {
        depth = referrer.depth + 1;
        referrer.referralCount++;
      }
    }

    const node: ShareChainNode = {
      userId,
      displayName,
      avatarUrl,
      joinedAt: new Date().toISOString(),
      referredBy,
      referralCount: 0,
      completed: false,
      depth,
    };

    chain.nodes.push(node);
    chain.totalParticipants++;
    chain.maxDepth = Math.max(chain.maxDepth, depth);
    chain.lastActivityAt = new Date().toISOString();

    this.trackUserChain(userId, challengeId);
    this.updateChainStats(chain);

    return node;
  }

  /**
   * Mark a participant as completed
   */
  async markCompleted(
    challengeId: string,
    userId: string,
    score?: number
  ): Promise<ShareChainNode | null> {
    const chain = this.chains.get(challengeId);
    if (!chain) return null;

    const node = chain.nodes.find(n => n.userId === userId);
    if (!node) return null;

    node.completed = true;
    node.score = score;
    chain.totalCompletions++;
    chain.lastActivityAt = new Date().toISOString();

    this.updateChainStats(chain);

    return node;
  }

  /**
   * Update chain statistics
   */
  private updateChainStats(chain: ShareChain): void {
    const stats = chain.stats;

    // Viral coefficient
    const nodesWithReferrals = chain.nodes.filter(n => n.referralCount > 0);
    if (nodesWithReferrals.length > 0) {
      const totalReferrals = nodesWithReferrals.reduce((sum, n) => sum + n.referralCount, 0);
      stats.viralCoefficient = totalReferrals / chain.nodes.length;
    }

    // Completion rate
    stats.completionRate = chain.totalParticipants > 0
      ? (chain.totalCompletions / chain.totalParticipants) * 100
      : 0;

    // Average score
    const completedWithScore = chain.nodes.filter(n => n.completed && n.score !== undefined);
    if (completedWithScore.length > 0) {
      stats.averageScore = completedWithScore.reduce((sum, n) => sum + (n.score || 0), 0)
        / completedWithScore.length;
    }

    // Top referrer
    const topReferrer = chain.nodes.reduce((top, node) =>
      node.referralCount > (top?.referralCount || 0) ? node : top,
      null as ShareChainNode | null
    );
    if (topReferrer && topReferrer.referralCount > 0) {
      stats.topReferrer = {
        userId: topReferrer.userId,
        displayName: topReferrer.displayName,
        referralCount: topReferrer.referralCount,
      };
    }
  }

  /**
   * Get a share chain
   */
  async getChain(challengeId: string): Promise<ShareChain | null> {
    return this.chains.get(challengeId) || null;
  }

  /**
   * Get chain info for a challenge
   */
  async getChainInfo(challengeId: string): Promise<ShareChainInfo | null> {
    const chain = this.chains.get(challengeId);
    if (!chain) return null;

    return {
      originatorId: chain.originatorId,
      depth: chain.maxDepth,
      path: chain.nodes.map(n => n.userId),
      totalParticipants: chain.totalParticipants,
      createdAt: chain.createdAt,
    };
  }

  /**
   * Get chain path from originator to a user
   */
  async getChainPath(challengeId: string, userId: string): Promise<ShareChainNode[]> {
    const chain = this.chains.get(challengeId);
    if (!chain) return [];

    const node = chain.nodes.find(n => n.userId === userId);
    if (!node) return [];

    const path: ShareChainNode[] = [node];
    let currentNode = node;

    while (currentNode.referredBy) {
      const referrer = chain.nodes.find(n => n.userId === currentNode.referredBy);
      if (!referrer) break;
      path.unshift(referrer);
      currentNode = referrer;
    }

    return path;
  }

  /**
   * Get nodes at a specific depth
   */
  async getNodesAtDepth(challengeId: string, depth: number): Promise<ShareChainNode[]> {
    const chain = this.chains.get(challengeId);
    if (!chain) return [];

    return chain.nodes.filter(n => n.depth === depth);
  }

  /**
   * Get referrals for a user
   */
  async getUserReferrals(challengeId: string, userId: string): Promise<ShareChainNode[]> {
    const chain = this.chains.get(challengeId);
    if (!chain) return [];

    return chain.nodes.filter(n => n.referredBy === userId);
  }

  /**
   * Get user's chains (all challenges they participated in)
   */
  async getUserChains(userId: string): Promise<ShareChain[]> {
    const chainIds = this.userToChain.get(userId);
    if (!chainIds) return [];

    const chains: ShareChain[] = [];
    chainIds.forEach(id => {
      const chain = this.chains.get(id);
      if (chain) chains.push(chain);
    });

    return chains;
  }

  /**
   * Generate chain visualization data
   * Returns data suitable for tree/graph visualization
   */
  generateVisualizationData(chain: ShareChain): {
    nodes: Array<{
      id: string;
      label: string;
      depth: number;
      completed: boolean;
      score?: number;
    }>;
    edges: Array<{
      source: string;
      target: string;
    }>;
  } {
    const nodes = chain.nodes.map(node => ({
      id: node.userId,
      label: node.displayName,
      depth: node.depth,
      completed: node.completed,
      score: node.score,
    }));

    const edges = chain.nodes
      .filter(node => node.referredBy)
      .map(node => ({
        source: node.referredBy!,
        target: node.userId,
      }));

    return { nodes, edges };
  }

  /**
   * Get chain summary text
   * e.g., "Alice started, Bob and 3 others continued, Carol completed"
   */
  getChainSummaryText(chain: ShareChain): string {
    if (chain.nodes.length === 1) {
      return `${chain.nodes[0].displayName} started this challenge`;
    }

    const originator = chain.nodes[0];
    const others = chain.nodes.slice(1);
    const completers = others.filter(n => n.completed);

    let summary = `${originator.displayName} started`;

    if (others.length === 1) {
      summary += `, ${others[0].displayName} continued`;
    } else if (others.length > 1) {
      summary += `, ${others[0].displayName} and ${others.length - 1} others continued`;
    }

    if (completers.length > 0) {
      if (completers.length === 1) {
        summary += `, ${completers[0].displayName} completed`;
      } else {
        summary += `, ${completers.length} completed`;
      }
    }

    return summary;
  }

  /**
   * Calculate viral potential score
   * Higher score = more likely to go viral
   */
  calculateViralPotential(chain: ShareChain): number {
    let score = 0;

    // Factor 1: Viral coefficient (0-40 points)
    score += Math.min(40, chain.stats.viralCoefficient * 20);

    // Factor 2: Completion rate (0-30 points)
    score += (chain.stats.completionRate / 100) * 30;

    // Factor 3: Depth reached (0-20 points)
    score += Math.min(20, chain.maxDepth * 5);

    // Factor 4: Recent activity (0-10 points)
    const hoursSinceActivity = (Date.now() - new Date(chain.lastActivityAt).getTime())
      / (1000 * 60 * 60);
    score += Math.max(0, 10 - hoursSinceActivity);

    return Math.round(score);
  }
}

/**
 * Create a share chain tracker instance
 */
export function createShareChainTracker(): ShareChainTracker {
  return new ShareChainTracker();
}

// Singleton instance
let shareChainTrackerInstance: ShareChainTracker | null = null;

/**
 * Get the singleton share chain tracker instance
 */
export function getShareChainTracker(): ShareChainTracker {
  if (!shareChainTrackerInstance) {
    shareChainTrackerInstance = new ShareChainTracker();
  }
  return shareChainTrackerInstance;
}
