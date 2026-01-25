/**
 * ChallengeManager
 * Creates and manages ranking challenges
 * Handles challenge lifecycle, scoring, and leaderboards
 */

import {
  Challenge,
  ChallengeConfig,
  ChallengeStatus,
  ChallengeType,
  CreateChallengeInput,
  UpdateChallengeInput,
  RankingSubmission,
  RankedItem,
  LeaderboardEntry,
  ScoringResult,
  ChallengeStats,
  CHALLENGE_TEMPLATES,
  ChallengeFilters,
} from './types';

/**
 * Generate a unique challenge code
 */
function generateChallengeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `ch_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Default challenge configuration
 */
const DEFAULT_CONFIG: ChallengeConfig = {
  type: 'beat_my_ranking',
  revealMode: 'immediate',
  scoringMethod: 'similarity',
  visibility: 'link_only',
};

/**
 * ChallengeManager class
 * Central manager for all challenge operations
 */
export class ChallengeManager {
  private challenges: Map<string, Challenge> = new Map();
  private submissions: Map<string, RankingSubmission[]> = new Map();

  /**
   * Create a new challenge
   */
  async createChallenge(
    input: CreateChallengeInput,
    creatorId: string,
    creatorName: string,
    creatorRanking?: RankedItem[]
  ): Promise<Challenge> {
    // Get template config if template specified
    let templateConfig: Partial<ChallengeConfig> = {};
    if (input.templateId) {
      const template = CHALLENGE_TEMPLATES.find(t => t.id === input.templateId);
      if (template) {
        templateConfig = template.defaultConfig;
      }
    }

    // Merge configs: default < template < custom
    const config: ChallengeConfig = {
      ...DEFAULT_CONFIG,
      ...templateConfig,
      ...input.config,
    };

    // Calculate expiry date based on config
    let expiresAt: string | undefined;
    if (config.deadline) {
      expiresAt = config.deadline;
    } else if (config.type === 'daily_challenge') {
      // Daily challenges expire at midnight
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      expiresAt = tomorrow.toISOString();
    }

    const now = new Date().toISOString();
    const challengeId = generateId();

    const challenge: Challenge = {
      id: challengeId,
      code: generateChallengeCode(),
      title: input.title,
      description: input.description,
      type: config.type,
      status: 'active',
      config,
      listId: input.listId,
      listTitle: input.title, // Would be fetched from list in production
      category: '', // Would be fetched from list in production
      creatorId,
      creatorName,
      creatorRanking: creatorRanking ? {
        id: generateId(),
        challengeId,
        userId: creatorId,
        userName: creatorName,
        items: creatorRanking,
        submittedAt: now,
      } : undefined,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      stats: {
        invitationsSent: 0,
        invitationsAccepted: 0,
        submissions: 0,
        views: 0,
        shares: 0,
      },
    };

    // Store challenge
    this.challenges.set(challengeId, challenge);
    this.submissions.set(challengeId, []);

    return challenge;
  }

  /**
   * Get a challenge by ID
   */
  async getChallenge(challengeId: string): Promise<Challenge | null> {
    return this.challenges.get(challengeId) || null;
  }

  /**
   * Get a challenge by code
   */
  async getChallengeByCode(code: string): Promise<Challenge | null> {
    const challenges = Array.from(this.challenges.values());
    return challenges.find(c => c.code === code) || null;
  }

  /**
   * Update a challenge
   */
  async updateChallenge(input: UpdateChallengeInput): Promise<Challenge | null> {
    const challenge = this.challenges.get(input.challengeId);
    if (!challenge) return null;

    const updated: Challenge = {
      ...challenge,
      ...input.updates,
      config: input.updates.config
        ? { ...challenge.config, ...input.updates.config }
        : challenge.config,
      updatedAt: new Date().toISOString(),
    };

    this.challenges.set(input.challengeId, updated);
    return updated;
  }

  /**
   * Submit a ranking for a challenge
   */
  async submitRanking(
    challengeId: string,
    userId: string,
    userName: string,
    items: RankedItem[],
    timeTaken?: number,
    userAvatar?: string
  ): Promise<RankingSubmission | null> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge || challenge.status !== 'active') return null;

    // Check if already submitted
    const existingSubmissions = this.submissions.get(challengeId) || [];
    const existing = existingSubmissions.find(s => s.userId === userId);
    if (existing) {
      // Update existing submission
      existing.items = items;
      existing.timeTaken = timeTaken;
      existing.submittedAt = new Date().toISOString();
      existing.score = this.calculateScore(challenge, items).score;
      return existing;
    }

    // Calculate score
    const scoringResult = this.calculateScore(challenge, items);

    const submission: RankingSubmission = {
      id: generateId(),
      challengeId,
      userId,
      userName,
      userAvatar,
      items,
      score: scoringResult.score,
      timeTaken,
      submittedAt: new Date().toISOString(),
    };

    existingSubmissions.push(submission);
    this.submissions.set(challengeId, existingSubmissions);

    // Update challenge stats
    challenge.stats.submissions = existingSubmissions.length;
    if (!challenge.stats.highScore || scoringResult.score > challenge.stats.highScore) {
      challenge.stats.highScore = scoringResult.score;
    }
    if (timeTaken) {
      const totalTime = existingSubmissions.reduce((sum, s) => sum + (s.timeTaken || 0), 0);
      const count = existingSubmissions.filter(s => s.timeTaken).length;
      challenge.stats.avgCompletionTime = count > 0 ? totalTime / count / 60 : undefined;
    }

    return submission;
  }

  /**
   * Calculate score for a submission
   */
  calculateScore(challenge: Challenge, items: RankedItem[]): ScoringResult {
    const breakdown: ScoringResult['breakdown'] = [];
    let totalScore = 0;

    switch (challenge.config.scoringMethod) {
      case 'similarity':
        return this.calculateSimilarityScore(challenge, items);

      case 'speed':
        // Speed scoring handled separately with time bonus
        breakdown.push({ rule: 'completion', points: 100 });
        return { score: 100, breakdown };

      case 'points':
        // Points-based scoring (collaborative)
        breakdown.push({ rule: 'participation', points: 10 });
        totalScore = 10;
        break;

      case 'custom':
        // Apply custom rules
        if (challenge.config.customScoring) {
          for (const rule of challenge.config.customScoring) {
            const points = this.applyCustomRule(rule, items, challenge);
            breakdown.push({ rule: rule.type, points });
            totalScore += points;
          }
        }
        break;
    }

    return { score: totalScore, breakdown };
  }

  /**
   * Calculate similarity score against creator's ranking
   */
  private calculateSimilarityScore(
    challenge: Challenge,
    items: RankedItem[]
  ): ScoringResult {
    const breakdown: ScoringResult['breakdown'] = [];

    if (!challenge.creatorRanking) {
      return { score: 0, breakdown: [{ rule: 'no_reference', points: 0 }] };
    }

    const creatorItems = challenge.creatorRanking.items;
    let matchingPositions = 0;
    let totalDeviation = 0;

    for (const item of items) {
      const creatorItem = creatorItems.find(ci => ci.id === item.id);
      if (creatorItem) {
        if (creatorItem.position === item.position) {
          matchingPositions++;
        }
        totalDeviation += Math.abs(creatorItem.position - item.position);
      }
    }

    const totalItems = Math.max(items.length, creatorItems.length);

    // Exact position matches
    const exactMatchScore = Math.round((matchingPositions / totalItems) * 50);
    breakdown.push({
      rule: 'exact_matches',
      points: exactMatchScore,
      details: `${matchingPositions}/${totalItems} exact matches`,
    });

    // Proximity score (inverse of average deviation)
    const maxDeviation = totalItems * (totalItems - 1) / 2;
    const proximityScore = maxDeviation > 0
      ? Math.round((1 - totalDeviation / maxDeviation) * 50)
      : 50;
    breakdown.push({
      rule: 'proximity',
      points: proximityScore,
      details: `Average deviation: ${(totalDeviation / totalItems).toFixed(1)}`,
    });

    const totalScore = exactMatchScore + proximityScore;
    const similarity = Math.round(totalScore);

    return { score: totalScore, breakdown, similarity };
  }

  /**
   * Apply a custom scoring rule
   */
  private applyCustomRule(
    rule: NonNullable<ChallengeConfig['customScoring']>[0],
    items: RankedItem[],
    challenge: Challenge
  ): number {
    switch (rule.type) {
      case 'position_match':
        // Check if specific position matches
        const position = rule.params?.position as number;
        if (position && challenge.creatorRanking) {
          const creatorItem = challenge.creatorRanking.items.find(i => i.position === position);
          const userItem = items.find(i => i.position === position);
          if (creatorItem && userItem && creatorItem.id === userItem.id) {
            return rule.points;
          }
        }
        return 0;

      case 'top_n_match':
        // Check top N items overlap
        const n = (rule.params?.n as number) || 3;
        if (challenge.creatorRanking) {
          const creatorTopN = new Set(
            challenge.creatorRanking.items
              .filter(i => i.position <= n)
              .map(i => i.id)
          );
          const userTopN = items.filter(i => i.position <= n);
          const matches = userTopN.filter(i => creatorTopN.has(i.id)).length;
          return Math.round((matches / n) * rule.points);
        }
        return 0;

      case 'bonus':
        return rule.points;

      case 'penalty':
        return -rule.points;

      default:
        return 0;
    }
  }

  /**
   * Get leaderboard for a challenge
   */
  async getLeaderboard(
    challengeId: string,
    limit: number = 10,
    currentUserId?: string
  ): Promise<LeaderboardEntry[]> {
    const submissions = this.submissions.get(challengeId) || [];

    // Sort by score (desc), then by time (asc)
    const sorted = [...submissions].sort((a, b) => {
      if ((b.score || 0) !== (a.score || 0)) {
        return (b.score || 0) - (a.score || 0);
      }
      return (a.timeTaken || Infinity) - (b.timeTaken || Infinity);
    });

    return sorted.slice(0, limit).map((submission, index) => ({
      rank: index + 1,
      userId: submission.userId,
      displayName: submission.userName,
      avatarUrl: submission.userAvatar,
      score: submission.score || 0,
      timeTaken: submission.timeTaken,
      submittedAt: submission.submittedAt,
      isCurrentUser: submission.userId === currentUserId,
    }));
  }

  /**
   * Get user's challenges
   */
  async getUserChallenges(
    userId: string,
    filters?: ChallengeFilters
  ): Promise<Challenge[]> {
    let challenges = Array.from(this.challenges.values());

    // Filter by creator or participant
    if (filters?.creatorId) {
      challenges = challenges.filter(c => c.creatorId === filters.creatorId);
    }

    if (filters?.participantId) {
      challenges = challenges.filter(c => {
        const submissions = this.submissions.get(c.id) || [];
        return submissions.some(s => s.userId === filters.participantId);
      });
    }

    // Filter by status
    if (filters?.status && filters.status.length > 0) {
      challenges = challenges.filter(c => filters.status!.includes(c.status));
    }

    // Filter by type
    if (filters?.type && filters.type.length > 0) {
      challenges = challenges.filter(c => filters.type!.includes(c.type));
    }

    // Sort by created date (newest first)
    return challenges.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Increment view count
   */
  async recordView(challengeId: string): Promise<void> {
    const challenge = this.challenges.get(challengeId);
    if (challenge) {
      challenge.stats.views++;
    }
  }

  /**
   * Increment share count
   */
  async recordShare(challengeId: string): Promise<void> {
    const challenge = this.challenges.get(challengeId);
    if (challenge) {
      challenge.stats.shares++;
    }
  }

  /**
   * Check if challenge is expired
   */
  isChallengeExpired(challenge: Challenge): boolean {
    if (!challenge.expiresAt) return false;
    return new Date(challenge.expiresAt) < new Date();
  }

  /**
   * Get user's submission for a challenge
   */
  async getUserSubmission(
    challengeId: string,
    userId: string
  ): Promise<RankingSubmission | null> {
    const submissions = this.submissions.get(challengeId) || [];
    return submissions.find(s => s.userId === userId) || null;
  }

  /**
   * Get all submissions for a challenge
   */
  async getSubmissions(challengeId: string): Promise<RankingSubmission[]> {
    return this.submissions.get(challengeId) || [];
  }

  /**
   * Generate shareable URL
   */
  generateShareUrl(challenge: Challenge, baseUrl: string): string {
    return `${baseUrl}/challenge/${challenge.code}`;
  }

  /**
   * End a challenge
   */
  async endChallenge(challengeId: string): Promise<Challenge | null> {
    return this.updateChallenge({
      challengeId,
      updates: { status: 'completed' },
    });
  }

  /**
   * Cancel a challenge
   */
  async cancelChallenge(challengeId: string): Promise<Challenge | null> {
    return this.updateChallenge({
      challengeId,
      updates: { status: 'cancelled' },
    });
  }
}

/**
 * Create a challenge manager instance
 */
export function createChallengeManager(): ChallengeManager {
  return new ChallengeManager();
}

// Singleton instance
let challengeManagerInstance: ChallengeManager | null = null;

/**
 * Get the singleton challenge manager instance
 */
export function getChallengeManager(): ChallengeManager {
  if (!challengeManagerInstance) {
    challengeManagerInstance = new ChallengeManager();
  }
  return challengeManagerInstance;
}
