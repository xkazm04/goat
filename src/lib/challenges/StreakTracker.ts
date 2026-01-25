/**
 * StreakTracker
 * Tracks user engagement streaks for challenges
 * Encourages daily participation and return visits
 */

import type { UserStreak } from './types';

/**
 * Streak type definition
 */
export type StreakType = 'daily_challenge' | 'any_challenge' | 'collaborative';

/**
 * Streak milestone for rewards
 */
export interface StreakMilestone {
  /** Days required */
  days: number;
  /** Milestone name */
  name: string;
  /** Description */
  description: string;
  /** Bonus multiplier at this milestone */
  bonusMultiplier: number;
  /** Badge/icon */
  badge: string;
}

/**
 * Streak milestones configuration
 */
export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, name: 'Getting Started', description: '3-day streak!', bonusMultiplier: 1.1, badge: '🔥' },
  { days: 7, name: 'Week Warrior', description: 'One week streak!', bonusMultiplier: 1.25, badge: '⚡' },
  { days: 14, name: 'Two Weeks Strong', description: '14-day streak!', bonusMultiplier: 1.5, badge: '💪' },
  { days: 30, name: 'Monthly Master', description: '30-day streak!', bonusMultiplier: 2.0, badge: '🏆' },
  { days: 60, name: 'Two Month Champion', description: '60-day streak!', bonusMultiplier: 2.5, badge: '👑' },
  { days: 100, name: 'Century Legend', description: '100-day streak!', bonusMultiplier: 3.0, badge: '💎' },
  { days: 365, name: 'Year of GOAT', description: 'Full year streak!', bonusMultiplier: 5.0, badge: '🐐' },
];

/**
 * User streak data
 */
export interface UserStreakData {
  /** User ID */
  userId: string;
  /** Streaks by type */
  streaks: Map<StreakType, UserStreak>;
  /** Total challenges completed */
  totalChallengesCompleted: number;
  /** Highest score ever */
  highestScore: number;
  /** Milestones achieved */
  milestonesAchieved: StreakMilestone[];
  /** Last activity */
  lastActivity: string;
}

/**
 * StreakTracker class
 * Manages user streaks and engagement metrics
 */
export class StreakTracker {
  private userStreaks: Map<string, UserStreakData> = new Map();

  /**
   * Initialize user streak data
   */
  private initializeUser(userId: string): UserStreakData {
    const now = new Date().toISOString();
    const data: UserStreakData = {
      userId,
      streaks: new Map(),
      totalChallengesCompleted: 0,
      highestScore: 0,
      milestonesAchieved: [],
      lastActivity: now,
    };

    // Initialize streak types
    const streakTypes: StreakType[] = ['daily_challenge', 'any_challenge', 'collaborative'];
    streakTypes.forEach(type => {
      data.streaks.set(type, {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: '',
        streakType: type,
        streakStartedAt: '',
        daysUntilBreak: 1,
        bonusMultiplier: 1,
      });
    });

    this.userStreaks.set(userId, data);
    return data;
  }

  /**
   * Get user streak data
   */
  async getUserData(userId: string): Promise<UserStreakData> {
    return this.userStreaks.get(userId) || this.initializeUser(userId);
  }

  /**
   * Get specific streak for user
   */
  async getUserStreak(userId: string, streakType: StreakType): Promise<UserStreak> {
    const data = await this.getUserData(userId);
    return data.streaks.get(streakType)!;
  }

  /**
   * Record activity for a user
   */
  async recordActivity(
    userId: string,
    streakType: StreakType,
    score?: number
  ): Promise<{
    streak: UserStreak;
    isNewStreak: boolean;
    newMilestone?: StreakMilestone;
    streakBroken: boolean;
  }> {
    const data = await this.getUserData(userId);
    const streak = data.streaks.get(streakType)!;
    const now = new Date();
    const today = this.getDateString(now);

    let isNewStreak = false;
    let streakBroken = false;
    let newMilestone: StreakMilestone | undefined;

    // Check if activity already recorded today
    if (streak.lastActivityDate === today) {
      // Already active today, just update score if higher
      if (score !== undefined && score > data.highestScore) {
        data.highestScore = score;
      }
      return { streak, isNewStreak: false, streakBroken: false };
    }

    // Check if streak continues or breaks
    const yesterday = this.getDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000));

    if (streak.lastActivityDate === yesterday) {
      // Streak continues
      streak.currentStreak++;
    } else if (streak.lastActivityDate === '') {
      // First activity ever
      streak.currentStreak = 1;
      streak.streakStartedAt = today;
      isNewStreak = true;
    } else {
      // Streak broken
      streakBroken = streak.currentStreak > 0;
      streak.currentStreak = 1;
      streak.streakStartedAt = today;
      isNewStreak = true;
    }

    // Update streak data
    streak.lastActivityDate = today;
    streak.daysUntilBreak = 1;

    // Update longest streak
    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }

    // Calculate bonus multiplier
    streak.bonusMultiplier = this.calculateBonusMultiplier(streak.currentStreak);

    // Check for new milestone
    const milestone = this.checkMilestone(streak.currentStreak, data.milestonesAchieved);
    if (milestone) {
      newMilestone = milestone;
      data.milestonesAchieved.push(milestone);
    }

    // Update totals
    data.totalChallengesCompleted++;
    if (score !== undefined && score > data.highestScore) {
      data.highestScore = score;
    }
    data.lastActivity = now.toISOString();

    return { streak, isNewStreak, newMilestone, streakBroken };
  }

  /**
   * Get date string in YYYY-MM-DD format
   */
  private getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Calculate bonus multiplier based on streak length
   */
  private calculateBonusMultiplier(streakDays: number): number {
    // Find the highest milestone the user has reached
    for (let i = STREAK_MILESTONES.length - 1; i >= 0; i--) {
      if (streakDays >= STREAK_MILESTONES[i].days) {
        return STREAK_MILESTONES[i].bonusMultiplier;
      }
    }
    return 1;
  }

  /**
   * Check if user reached a new milestone
   */
  private checkMilestone(
    streakDays: number,
    achieved: StreakMilestone[]
  ): StreakMilestone | undefined {
    const achievedDays = new Set(achieved.map(m => m.days));

    for (const milestone of STREAK_MILESTONES) {
      if (streakDays >= milestone.days && !achievedDays.has(milestone.days)) {
        return milestone;
      }
    }

    return undefined;
  }

  /**
   * Get next milestone for user
   */
  async getNextMilestone(
    userId: string,
    streakType: StreakType
  ): Promise<{ milestone: StreakMilestone; daysRemaining: number } | null> {
    const streak = await this.getUserStreak(userId, streakType);

    for (const milestone of STREAK_MILESTONES) {
      if (streak.currentStreak < milestone.days) {
        return {
          milestone,
          daysRemaining: milestone.days - streak.currentStreak,
        };
      }
    }

    return null;
  }

  /**
   * Check if streak is at risk (expiring today)
   */
  async isStreakAtRisk(userId: string, streakType: StreakType): Promise<boolean> {
    const streak = await this.getUserStreak(userId, streakType);
    if (streak.currentStreak === 0) return false;

    const today = this.getDateString(new Date());
    return streak.lastActivityDate !== today;
  }

  /**
   * Get streak status message
   */
  getStreakStatusMessage(streak: UserStreak): string {
    if (streak.currentStreak === 0) {
      return 'Start your streak today!';
    }

    const emoji = this.getStreakEmoji(streak.currentStreak);
    const nextMilestone = STREAK_MILESTONES.find(m => m.days > streak.currentStreak);

    if (nextMilestone) {
      const daysToGo = nextMilestone.days - streak.currentStreak;
      return `${emoji} ${streak.currentStreak} day streak! ${daysToGo} more to ${nextMilestone.name}`;
    }

    return `${emoji} ${streak.currentStreak} day streak! You're a legend!`;
  }

  /**
   * Get emoji for streak length
   */
  private getStreakEmoji(days: number): string {
    if (days >= 365) return '🐐';
    if (days >= 100) return '💎';
    if (days >= 60) return '👑';
    if (days >= 30) return '🏆';
    if (days >= 14) return '💪';
    if (days >= 7) return '⚡';
    if (days >= 3) return '🔥';
    return '✨';
  }

  /**
   * Get leaderboard by streak length
   */
  async getStreakLeaderboard(
    streakType: StreakType,
    limit: number = 10
  ): Promise<Array<{
    rank: number;
    userId: string;
    currentStreak: number;
    longestStreak: number;
    bonusMultiplier: number;
  }>> {
    const allUsers = Array.from(this.userStreaks.values());

    const sorted = allUsers
      .map(data => ({
        userId: data.userId,
        streak: data.streaks.get(streakType)!,
      }))
      .filter(u => u.streak.currentStreak > 0)
      .sort((a, b) => b.streak.currentStreak - a.streak.currentStreak)
      .slice(0, limit);

    return sorted.map((u, index) => ({
      rank: index + 1,
      userId: u.userId,
      currentStreak: u.streak.currentStreak,
      longestStreak: u.streak.longestStreak,
      bonusMultiplier: u.streak.bonusMultiplier,
    }));
  }

  /**
   * Apply streak bonus to a score
   */
  async applyStreakBonus(
    userId: string,
    baseScore: number,
    streakType: StreakType = 'any_challenge'
  ): Promise<{
    baseScore: number;
    bonusMultiplier: number;
    finalScore: number;
    bonusPoints: number;
  }> {
    const streak = await this.getUserStreak(userId, streakType);
    const finalScore = Math.round(baseScore * streak.bonusMultiplier);

    return {
      baseScore,
      bonusMultiplier: streak.bonusMultiplier,
      finalScore,
      bonusPoints: finalScore - baseScore,
    };
  }

  /**
   * Get users with expiring streaks (for notifications)
   */
  async getUsersWithExpiringStreaks(
    streakType: StreakType
  ): Promise<Array<{
    userId: string;
    currentStreak: number;
    hoursRemaining: number;
  }>> {
    const today = this.getDateString(new Date());
    const expiringUsers: Array<{
      userId: string;
      currentStreak: number;
      hoursRemaining: number;
    }> = [];

    this.userStreaks.forEach((data, userId) => {
      const streak = data.streaks.get(streakType);
      if (!streak || streak.currentStreak === 0) return;

      if (streak.lastActivityDate !== today) {
        // Calculate hours until midnight
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const hoursRemaining = (midnight.getTime() - now.getTime()) / (1000 * 60 * 60);

        expiringUsers.push({
          userId,
          currentStreak: streak.currentStreak,
          hoursRemaining: Math.round(hoursRemaining),
        });
      }
    });

    return expiringUsers;
  }

  /**
   * Reset streak (e.g., after rules violation)
   */
  async resetStreak(userId: string, streakType: StreakType): Promise<void> {
    const data = await this.getUserData(userId);
    const streak = data.streaks.get(streakType)!;

    streak.currentStreak = 0;
    streak.streakStartedAt = '';
    streak.bonusMultiplier = 1;
    streak.daysUntilBreak = 1;
  }

  /**
   * Get streak statistics for a user
   */
  async getStreakStatistics(userId: string): Promise<{
    totalDaysActive: number;
    currentStreaks: Record<StreakType, number>;
    longestStreaks: Record<StreakType, number>;
    milestonesAchieved: number;
    nextMilestones: Record<StreakType, number>;
  }> {
    const data = await this.getUserData(userId);

    const currentStreaks: Record<StreakType, number> = {} as Record<StreakType, number>;
    const longestStreaks: Record<StreakType, number> = {} as Record<StreakType, number>;
    const nextMilestones: Record<StreakType, number> = {} as Record<StreakType, number>;

    data.streaks.forEach((streak, type) => {
      currentStreaks[type] = streak.currentStreak;
      longestStreaks[type] = streak.longestStreak;

      const next = STREAK_MILESTONES.find(m => m.days > streak.currentStreak);
      nextMilestones[type] = next ? next.days - streak.currentStreak : 0;
    });

    return {
      totalDaysActive: data.totalChallengesCompleted,
      currentStreaks,
      longestStreaks,
      milestonesAchieved: data.milestonesAchieved.length,
      nextMilestones,
    };
  }
}

/**
 * Create a streak tracker instance
 */
export function createStreakTracker(): StreakTracker {
  return new StreakTracker();
}

// Singleton instance
let streakTrackerInstance: StreakTracker | null = null;

/**
 * Get the singleton streak tracker instance
 */
export function getStreakTracker(): StreakTracker {
  if (!streakTrackerInstance) {
    streakTrackerInstance = new StreakTracker();
  }
  return streakTrackerInstance;
}
