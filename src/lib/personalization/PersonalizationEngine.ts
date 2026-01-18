/**
 * Personalization Engine
 * Scores and selects content based on user interests, context, and exploration
 */

import {
  PersonalizationConfig,
  PersonalizationContext,
  PersonalizedShowcaseItem,
  SelectionReason,
  BoostFactor,
  DEFAULT_PERSONALIZATION_CONFIG,
  CategoryInterest,
  InterestCategory,
} from './types';
import { InterestTracker, getInterestTracker } from './InterestTracker';

/**
 * Content item interface for scoring
 */
export interface ContentItem {
  id: string | number;
  category: string;
  subcategory?: string;
  popularity?: number; // 0-100
  createdAt?: number;
  trending?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Scoring weights for different factors
 */
interface ScoringWeights {
  interest: number;
  context: number;
  popularity: number;
  freshness: number;
  trending: number;
}

/**
 * Personalization Engine class
 * Handles content selection and scoring based on user profile
 */
export class PersonalizationEngine {
  private config: PersonalizationConfig;
  private tracker: InterestTracker;
  private context: PersonalizationContext | null = null;

  constructor(config: Partial<PersonalizationConfig> = {}) {
    this.config = { ...DEFAULT_PERSONALIZATION_CONFIG, ...config };
    this.tracker = getInterestTracker();
  }

  /**
   * Set the current personalization context
   */
  setContext(context: PersonalizationContext): void {
    this.context = context;
  }

  /**
   * Get the current context
   */
  getContext(): PersonalizationContext | null {
    return this.context;
  }

  /**
   * Score a single content item
   */
  scoreItem<T extends ContentItem>(item: T): PersonalizedShowcaseItem<T> {
    const boostFactors: BoostFactor[] = [];
    let baseScore = 50; // Start with neutral score
    let selectionReason: SelectionReason = 'default';

    // Interest-based scoring
    const interestScore = this.calculateInterestScore(item);
    if (interestScore > 0) {
      const interestBoost = interestScore * this.config.interestWeight;
      baseScore += interestBoost;
      boostFactors.push({
        type: 'interest',
        value: interestBoost,
        reason: `Category affinity: ${item.category}`,
      });
      if (interestScore > 30) {
        selectionReason = 'interest_match';
      }
    }

    // Contextual scoring
    if (this.context) {
      const contextScore = this.calculateContextScore(item);
      if (contextScore > 0) {
        const contextBoost = contextScore * this.config.contextWeight;
        baseScore += contextBoost;
        boostFactors.push({
          type: 'context',
          value: contextBoost,
          reason: 'Time/location relevance',
        });
        if (contextScore > 40 && selectionReason === 'default') {
          selectionReason = 'contextual';
        }
      }
    }

    // Popularity scoring
    if (item.popularity !== undefined) {
      const popularityBoost = (item.popularity / 100) * 30 * this.config.popularityWeight;
      baseScore += popularityBoost;
      boostFactors.push({
        type: 'popularity',
        value: popularityBoost,
        reason: `Popularity: ${item.popularity}%`,
      });
      if (item.popularity > 80 && selectionReason === 'default') {
        selectionReason = 'popular';
      }
    }

    // Trending boost
    if (item.trending) {
      const trendingBoost = 20;
      baseScore += trendingBoost;
      boostFactors.push({
        type: 'trending',
        value: trendingBoost,
        reason: 'Currently trending',
      });
      if (selectionReason === 'default') {
        selectionReason = 'trending';
      }
    }

    // Freshness scoring
    if (item.createdAt) {
      const freshnessScore = this.calculateFreshnessScore(item.createdAt);
      if (freshnessScore > 0) {
        baseScore += freshnessScore;
        boostFactors.push({
          type: 'freshness',
          value: freshnessScore,
          reason: 'New content',
        });
        if (freshnessScore > 15 && selectionReason === 'default') {
          selectionReason = 'new_content';
        }
      }
    }

    // Returning user boost
    if (!this.tracker.isNewUser() && this.tracker.getVisitCount() > 3) {
      const profile = this.tracker.getProfile();
      if (profile && profile.interests.length > 0) {
        const returningBoost = 5;
        baseScore += returningBoost;
        boostFactors.push({
          type: 'returning_user',
          value: returningBoost,
          reason: 'Personalized for returning visitor',
        });
        if (selectionReason === 'interest_match') {
          selectionReason = 'returning_user';
        }
      }
    }

    // Normalize score to 0-100
    const relevanceScore = Math.max(0, Math.min(100, baseScore));

    return {
      item,
      relevanceScore,
      selectionReason,
      boostFactors,
    };
  }

  /**
   * Score and sort multiple items
   */
  scoreItems<T extends ContentItem>(items: T[]): PersonalizedShowcaseItem<T>[] {
    if (!this.config.enabled) {
      // Return items in original order with default scores
      return items.map((item) => ({
        item,
        relevanceScore: 50,
        selectionReason: 'default' as SelectionReason,
        boostFactors: [],
      }));
    }

    // Check if user has enough visits for personalization
    const visitCount = this.tracker.getVisitCount();
    if (visitCount < this.config.minVisitsForPersonalization) {
      // Return popular/trending items for new users
      return this.scoreForNewUsers(items);
    }

    // Score all items
    const scored = items.map((item) => this.scoreItem(item));

    // Add exploration items for diversity
    return this.addExplorationItems(scored);
  }

  /**
   * Select top N personalized items
   */
  selectTopItems<T extends ContentItem>(
    items: T[],
    count: number = this.config.maxPersonalizedItems
  ): PersonalizedShowcaseItem<T>[] {
    const scored = this.scoreItems(items);

    // Sort by relevance score descending
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Return top N items
    return scored.slice(0, count);
  }

  /**
   * Calculate interest-based score for an item
   */
  private calculateInterestScore(item: ContentItem): number {
    const categoryScore = this.tracker.getCategoryScore(item.category);

    if (categoryScore === 0) return 0;

    let score = categoryScore;

    // Boost for subcategory match
    if (item.subcategory) {
      const subcategoryScore = this.tracker.getSubcategoryScore(
        item.category,
        item.subcategory
      );
      if (subcategoryScore > 0) {
        score += subcategoryScore * 0.5;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate context-based score for an item
   */
  private calculateContextScore(item: ContentItem): number {
    if (!this.context) return 0;

    let score = 0;

    // Time-of-day relevance (example: gaming content in evening)
    const timeRelevance = this.getTimeRelevance(item.category);
    score += timeRelevance;

    // Weekend boost for leisure categories
    if (this.context.isWeekend) {
      const leisureCategories = ['Games', 'Movies', 'Music', 'Sports'];
      if (leisureCategories.includes(item.category)) {
        score += 10;
      }
    }

    // Seasonal relevance
    const seasonalRelevance = this.getSeasonalRelevance(item);
    score += seasonalRelevance;

    // Device-specific adjustments
    if (this.context.deviceType === 'mobile') {
      // Favor shorter/snackable content on mobile
      score += 5;
    }

    return Math.min(score, 50);
  }

  /**
   * Get time-of-day relevance for a category
   */
  private getTimeRelevance(category: string): number {
    if (!this.context) return 0;

    const timePreferences: Record<string, string[]> = {
      morning: ['Food', 'Technology', 'Stories'],
      afternoon: ['Technology', 'Art', 'Fashion'],
      evening: ['Games', 'Movies', 'Music', 'Sports'],
      night: ['Movies', 'Music', 'Games'],
    };

    const preferredCategories = timePreferences[this.context.timeOfDay] || [];
    return preferredCategories.includes(category) ? 15 : 0;
  }

  /**
   * Get seasonal relevance for an item
   */
  private getSeasonalRelevance(item: ContentItem): number {
    if (!this.context) return 0;

    const seasonalCategories: Record<string, string[]> = {
      winter: ['Movies', 'Games', 'Food'],
      spring: ['Sports', 'Travel', 'Fashion'],
      summer: ['Travel', 'Sports', 'Music'],
      fall: ['Movies', 'Food', 'Art'],
    };

    const preferredCategories = seasonalCategories[this.context.season] || [];
    return preferredCategories.includes(item.category) ? 10 : 0;
  }

  /**
   * Calculate freshness score based on creation date
   */
  private calculateFreshnessScore(createdAt: number): number {
    const now = Date.now();
    const ageMs = now - createdAt;
    const ageDays = ageMs / (24 * 60 * 60 * 1000);

    // Content less than 7 days old gets a boost
    if (ageDays < 1) return 20;
    if (ageDays < 3) return 15;
    if (ageDays < 7) return 10;
    if (ageDays < 14) return 5;

    return 0;
  }

  /**
   * Score items for new users (popularity-focused)
   */
  private scoreForNewUsers<T extends ContentItem>(
    items: T[]
  ): PersonalizedShowcaseItem<T>[] {
    return items.map((item) => {
      let score = 50;
      let selectionReason: SelectionReason = 'default';
      const boostFactors: BoostFactor[] = [];

      // Heavy weight on popularity for new users
      if (item.popularity !== undefined) {
        const popularityBoost = (item.popularity / 100) * 40;
        score += popularityBoost;
        boostFactors.push({
          type: 'popularity',
          value: popularityBoost,
          reason: 'Popular content',
        });
        selectionReason = 'popular';
      }

      // Trending boost
      if (item.trending) {
        score += 25;
        boostFactors.push({
          type: 'trending',
          value: 25,
          reason: 'Trending now',
        });
        selectionReason = 'trending';
      }

      return {
        item,
        relevanceScore: Math.min(100, score),
        selectionReason,
        boostFactors,
      };
    });
  }

  /**
   * Add exploration items for diversity
   */
  private addExplorationItems<T extends ContentItem>(
    scored: PersonalizedShowcaseItem<T>[]
  ): PersonalizedShowcaseItem<T>[] {
    if (this.config.explorationRate <= 0) return scored;

    const explorationCount = Math.ceil(scored.length * this.config.explorationRate);
    const topInterests = this.tracker.getTopInterests(3);
    const topCategories = topInterests.map((i) => i.category);

    // Find items from underrepresented categories
    const explorationCandidates = scored.filter(
      (item) => !topCategories.includes(item.item.category as InterestCategory)
    );

    // Randomly select exploration items
    const shuffled = [...explorationCandidates].sort(() => Math.random() - 0.5);
    const explorationItems = shuffled.slice(0, explorationCount);

    // Mark them as exploration
    explorationItems.forEach((item) => {
      item.selectionReason = 'exploration';
      item.boostFactors.push({
        type: 'exploration',
        value: 10,
        reason: 'Discovering new categories',
      });
      item.relevanceScore = Math.min(100, item.relevanceScore + 10);
    });

    return scored;
  }

  /**
   * Get personalization stats for debugging/analytics
   */
  getStats(): {
    isEnabled: boolean;
    isPersonalized: boolean;
    visitCount: number;
    topInterests: CategoryInterest[];
    context: PersonalizationContext | null;
  } {
    return {
      isEnabled: this.config.enabled,
      isPersonalized:
        this.config.enabled &&
        this.tracker.getVisitCount() >= this.config.minVisitsForPersonalization,
      visitCount: this.tracker.getVisitCount(),
      topInterests: this.tracker.getTopInterests(5),
      context: this.context,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PersonalizationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): PersonalizationConfig {
    return { ...this.config };
  }
}

// Singleton instance
let engineInstance: PersonalizationEngine | null = null;

/**
 * Get the singleton PersonalizationEngine instance
 */
export function getPersonalizationEngine(
  config?: Partial<PersonalizationConfig>
): PersonalizationEngine {
  if (!engineInstance) {
    engineInstance = new PersonalizationEngine(config);
  } else if (config) {
    engineInstance.updateConfig(config);
  }
  return engineInstance;
}
