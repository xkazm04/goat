/**
 * SmartGridLayout Engine
 * Calculates optimal grid arrangement with tier-aware positioning
 */

import { GridItemType } from "@/types/match";
import { TierDefinition, TierId, getTierForPosition, adjustTiersForSize } from "./tierConfig";

/**
 * Item metadata for smart arrangement
 */
export interface ItemMetadata {
  id: string;
  /** User preference score (0-100) */
  preferenceScore?: number;
  /** Popularity/rating from source */
  popularity?: number;
  /** Release year for chronological sorting */
  year?: number;
  /** Category for grouping */
  category?: string;
  /** Tags for filtering */
  tags?: string[];
  /** User's previous position for this item */
  previousPosition?: number;
  /** Time spent considering this item */
  considerationTime?: number;
}

/**
 * Arrangement strategy
 */
export type ArrangementStrategy =
  | 'preference'      // Based on user preference scores
  | 'popularity'      // Based on item popularity
  | 'chronological'   // By release year
  | 'category'        // Group by category within tiers
  | 'balanced'        // Balance fill across tiers
  | 'compact'         // Fill from top, minimize gaps
  | 'custom';         // User-defined order

/**
 * Layout calculation result
 */
export interface LayoutResult {
  /** Suggested positions for items */
  positions: Map<string, number>;
  /** Items that couldn't be placed */
  overflow: string[];
  /** Layout score (0-100) */
  score: number;
  /** Strategy used */
  strategy: ArrangementStrategy;
  /** Tier fill statistics */
  tierFill: Map<TierId, { filled: number; total: number }>;
}

/**
 * Auto-arrange options
 */
export interface AutoArrangeOptions {
  /** Strategy to use */
  strategy: ArrangementStrategy;
  /** Whether to preserve existing placements */
  preserveExisting?: boolean;
  /** Whether to respect tier boundaries */
  respectTiers?: boolean;
  /** Category priority order */
  categoryPriority?: string[];
  /** Maximum items per tier (for balanced mode) */
  maxPerTier?: Record<TierId, number>;
}

/**
 * SmartGridLayout class
 */
export class SmartGridLayout {
  private listSize: number;
  private tiers: TierDefinition[];

  constructor(listSize: number = 50) {
    this.listSize = listSize;
    this.tiers = adjustTiersForSize(listSize);
  }

  /**
   * Calculate optimal layout for items
   */
  calculateLayout(
    items: Array<{ id: string; metadata?: ItemMetadata }>,
    currentGrid: GridItemType[],
    options: AutoArrangeOptions
  ): LayoutResult {
    const positions = new Map<string, number>();
    const overflow: string[] = [];
    const tierFill = new Map<TierId, { filled: number; total: number }>();

    // Initialize tier fill tracking
    this.tiers.forEach(tier => {
      tierFill.set(tier.id, {
        filled: 0,
        total: tier.range.end - tier.range.start,
      });
    });

    // Get available positions
    const availablePositions = this.getAvailablePositions(
      currentGrid,
      options.preserveExisting ?? false
    );

    // Sort items based on strategy
    const sortedItems = this.sortItemsByStrategy(items, options.strategy);

    // Assign positions
    let positionIndex = 0;
    for (const item of sortedItems) {
      if (positionIndex >= availablePositions.length) {
        overflow.push(item.id);
        continue;
      }

      const position = availablePositions[positionIndex];

      if (options.respectTiers) {
        const tier = getTierForPosition(position, this.tiers);
        if (tier) {
          const fill = tierFill.get(tier.id)!;
          fill.filled++;
        }
      }

      positions.set(item.id, position);
      positionIndex++;
    }

    // Calculate layout score
    const score = this.calculateLayoutScore(positions, items, options);

    return {
      positions,
      overflow,
      score,
      strategy: options.strategy,
      tierFill,
    };
  }

  /**
   * Get available positions in the grid
   */
  private getAvailablePositions(
    currentGrid: GridItemType[],
    preserveExisting: boolean
  ): number[] {
    const available: number[] = [];

    for (let i = 0; i < this.listSize; i++) {
      const item = currentGrid[i];
      if (!item?.matched || !preserveExisting) {
        available.push(i);
      }
    }

    return available;
  }

  /**
   * Sort items based on strategy
   */
  private sortItemsByStrategy(
    items: Array<{ id: string; metadata?: ItemMetadata }>,
    strategy: ArrangementStrategy
  ): Array<{ id: string; metadata?: ItemMetadata }> {
    const sorted = [...items];

    switch (strategy) {
      case 'preference':
        sorted.sort((a, b) => {
          const scoreA = a.metadata?.preferenceScore ?? 50;
          const scoreB = b.metadata?.preferenceScore ?? 50;
          return scoreB - scoreA; // Higher scores first
        });
        break;

      case 'popularity':
        sorted.sort((a, b) => {
          const popA = a.metadata?.popularity ?? 0;
          const popB = b.metadata?.popularity ?? 0;
          return popB - popA; // Higher popularity first
        });
        break;

      case 'chronological':
        sorted.sort((a, b) => {
          const yearA = a.metadata?.year ?? 0;
          const yearB = b.metadata?.year ?? 0;
          return yearB - yearA; // Newer first (can be reversed)
        });
        break;

      case 'category':
        // Group by category, then by preference within category
        sorted.sort((a, b) => {
          const catA = a.metadata?.category ?? 'zzz';
          const catB = b.metadata?.category ?? 'zzz';
          if (catA !== catB) {
            return catA.localeCompare(catB);
          }
          const scoreA = a.metadata?.preferenceScore ?? 50;
          const scoreB = b.metadata?.preferenceScore ?? 50;
          return scoreB - scoreA;
        });
        break;

      case 'balanced':
      case 'compact':
      case 'custom':
      default:
        // No sorting, use original order
        break;
    }

    return sorted;
  }

  /**
   * Calculate layout quality score
   */
  private calculateLayoutScore(
    positions: Map<string, number>,
    items: Array<{ id: string; metadata?: ItemMetadata }>,
    options: AutoArrangeOptions
  ): number {
    let score = 100;

    // Penalize gaps in placement
    const positionArray = Array.from(positions.values()).sort((a, b) => a - b);
    for (let i = 1; i < positionArray.length; i++) {
      const gap = positionArray[i] - positionArray[i - 1] - 1;
      if (gap > 0) {
        score -= gap * 2; // -2 points per gap position
      }
    }

    // Bonus for filling top positions
    const topPositions = positionArray.filter(p => p < 10).length;
    score += topPositions * 2;

    // Bonus for balanced tier fill
    if (options.respectTiers) {
      const tierBalanceScore = this.calculateTierBalance(positions);
      score += tierBalanceScore * 0.3;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate tier balance score
   */
  private calculateTierBalance(positions: Map<string, number>): number {
    const tierCounts = new Map<TierId, number>();

    Array.from(positions.values()).forEach(position => {
      const tier = getTierForPosition(position, this.tiers);
      if (tier) {
        tierCounts.set(tier.id, (tierCounts.get(tier.id) || 0) + 1);
      }
    });

    // Calculate standard deviation of fill percentages
    const fillPercentages: number[] = [];
    this.tiers.forEach(tier => {
      const count = tierCounts.get(tier.id) || 0;
      const total = tier.range.end - tier.range.start;
      fillPercentages.push(count / total);
    });

    if (fillPercentages.length === 0) return 0;

    const mean = fillPercentages.reduce((a, b) => a + b, 0) / fillPercentages.length;
    const variance = fillPercentages.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / fillPercentages.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation = more balanced = higher score
    return Math.max(0, 100 - stdDev * 200);
  }

  /**
   * Suggest optimal positions for new items
   */
  suggestPositions(
    newItems: Array<{ id: string; metadata?: ItemMetadata }>,
    currentGrid: GridItemType[],
    count: number = 5
  ): Map<string, number[]> {
    const suggestions = new Map<string, number[]>();

    for (const item of newItems) {
      const itemSuggestions: number[] = [];

      // Find empty positions
      for (let i = 0; i < this.listSize && itemSuggestions.length < count; i++) {
        if (!currentGrid[i]?.matched) {
          itemSuggestions.push(i);
        }
      }

      // Sort by relevance based on metadata
      if (item.metadata) {
        itemSuggestions.sort((a, b) => {
          // Prefer positions matching preference score tier
          const tierA = getTierForPosition(a, this.tiers);
          const tierB = getTierForPosition(b, this.tiers);

          const score = item.metadata?.preferenceScore ?? 50;
          const targetTierIndex = Math.floor((100 - score) / 25);

          const tierIndexA = this.tiers.findIndex(t => t.id === tierA?.id);
          const tierIndexB = this.tiers.findIndex(t => t.id === tierB?.id);

          return Math.abs(tierIndexA - targetTierIndex) - Math.abs(tierIndexB - targetTierIndex);
        });
      }

      suggestions.set(item.id, itemSuggestions);
    }

    return suggestions;
  }

  /**
   * Find optimal swap to improve layout
   */
  findOptimalSwap(
    currentGrid: GridItemType[]
  ): { from: number; to: number; improvement: number } | null {
    let bestSwap: { from: number; to: number; improvement: number } | null = null;

    for (let i = 0; i < this.listSize; i++) {
      for (let j = i + 1; j < this.listSize; j++) {
        const itemA = currentGrid[i];
        const itemB = currentGrid[j];

        // Skip if both empty or both same state
        if ((!itemA?.matched && !itemB?.matched)) continue;

        // Calculate current arrangement score
        const currentScore = this.calculatePositionScore(i, itemA) +
                            this.calculatePositionScore(j, itemB);

        // Calculate swapped score
        const swappedScore = this.calculatePositionScore(i, itemB) +
                            this.calculatePositionScore(j, itemA);

        const improvement = swappedScore - currentScore;

        if (improvement > 0 && (!bestSwap || improvement > bestSwap.improvement)) {
          bestSwap = { from: i, to: j, improvement };
        }
      }
    }

    return bestSwap;
  }

  /**
   * Calculate score for an item at a position
   */
  private calculatePositionScore(position: number, item: GridItemType | null): number {
    if (!item?.matched) return 0;

    let score = 100 - position; // Base score from position

    // Bonus for top positions
    if (position < 3) score += 30;
    else if (position < 10) score += 20;
    else if (position < 25) score += 10;

    return score;
  }

  /**
   * Get tier recommendations for improvement
   */
  getTierRecommendations(currentGrid: GridItemType[]): Array<{
    tier: TierDefinition;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const recommendations: Array<{
      tier: TierDefinition;
      recommendation: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    for (const tier of this.tiers) {
      let filledCount = 0;
      for (let i = tier.range.start; i < tier.range.end; i++) {
        if (currentGrid[i]?.matched) filledCount++;
      }

      const totalSlots = tier.range.end - tier.range.start;
      const fillPercentage = (filledCount / totalSlots) * 100;

      if (tier.id === 'elite' && fillPercentage < 50) {
        recommendations.push({
          tier,
          recommendation: `Fill your ${tier.displayName} tier - only ${filledCount}/${totalSlots} positions filled`,
          priority: 'high',
        });
      } else if (fillPercentage === 0) {
        recommendations.push({
          tier,
          recommendation: `${tier.displayName} tier is empty - add some items`,
          priority: 'medium',
        });
      } else if (fillPercentage > 90 && tier.id !== 'elite') {
        recommendations.push({
          tier,
          recommendation: `${tier.displayName} tier is nearly full - consider promoting top performers`,
          priority: 'low',
        });
      }
    }

    return recommendations;
  }
}

/**
 * Create a smart grid layout instance
 */
export function createSmartGridLayout(listSize: number = 50): SmartGridLayout {
  return new SmartGridLayout(listSize);
}

export default SmartGridLayout;
