/**
 * ELOTierCalculator
 * ELO rating system adapted for tier assignment
 * Uses comparison history to calculate ratings and assign tiers
 */

import type { TierDefinition } from '../types';
import type {
  Comparison,
  ELORatedItem,
  ELOConfig,
  AlgorithmResult,
  TierConfidence,
} from './types';

/**
 * Default ELO configuration
 */
const DEFAULT_ELO_CONFIG: ELOConfig = {
  algorithm: 'elo',
  tierCount: 5,
  kFactor: 32,
  initialRating: 1500,
  minComparisons: 3,
  decayFactor: 0.95,
};

/**
 * ELOTierCalculator class
 * Calculates ELO ratings from comparisons and assigns tiers
 */
export class ELOTierCalculator {
  private config: ELOConfig;
  private items: Map<string, ELORatedItem> = new Map();

  constructor(config: Partial<ELOConfig> = {}) {
    this.config = { ...DEFAULT_ELO_CONFIG, ...config };
  }

  /**
   * Initialize items with default ratings
   */
  initializeItems(itemIds: string[]): void {
    for (const id of itemIds) {
      if (!this.items.has(id)) {
        this.items.set(id, {
          id,
          rating: this.config.initialRating,
          comparisons: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          confidence: 0,
        });
      }
    }
  }

  /**
   * Process a single comparison and update ratings
   */
  processComparison(comparison: Comparison): void {
    const itemA = this.items.get(comparison.itemA);
    const itemB = this.items.get(comparison.itemB);

    if (!itemA || !itemB) {
      // Initialize missing items
      this.initializeItems([comparison.itemA, comparison.itemB]);
      return this.processComparison(comparison);
    }

    // Calculate expected scores
    const expectedA = this.calculateExpected(itemA.rating, itemB.rating);
    const expectedB = 1 - expectedA;

    // Actual scores
    let actualA: number;
    let actualB: number;

    if (comparison.winner === comparison.itemA) {
      actualA = 1;
      actualB = 0;
      itemA.wins++;
      itemB.losses++;
    } else if (comparison.winner === comparison.itemB) {
      actualA = 0;
      actualB = 1;
      itemA.losses++;
      itemB.wins++;
    } else {
      actualA = 0.5;
      actualB = 0.5;
      itemA.draws++;
      itemB.draws++;
    }

    // Apply confidence weight if available
    const confidenceWeight = comparison.confidence ?? 1;

    // Calculate K-factor adjusted for comparisons (higher K for fewer comparisons)
    const kA = this.getAdjustedK(itemA.comparisons);
    const kB = this.getAdjustedK(itemB.comparisons);

    // Update ratings
    itemA.rating += kA * confidenceWeight * (actualA - expectedA);
    itemB.rating += kB * confidenceWeight * (actualB - expectedB);

    // Update comparison counts
    itemA.comparisons++;
    itemB.comparisons++;

    // Update confidence scores
    itemA.confidence = this.calculateConfidence(itemA);
    itemB.confidence = this.calculateConfidence(itemB);
  }

  /**
   * Process multiple comparisons
   */
  processComparisons(comparisons: Comparison[]): void {
    // Sort by timestamp to process in order
    const sorted = [...comparisons].sort((a, b) => a.timestamp - b.timestamp);

    // Apply decay to older comparisons
    if (this.config.decayFactor && this.config.decayFactor < 1) {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      for (const comparison of sorted) {
        const ageInDays = (now - comparison.timestamp) / dayMs;
        const decay = Math.pow(this.config.decayFactor, ageInDays / 7); // Weekly decay
        comparison.confidence = (comparison.confidence ?? 1) * decay;
      }
    }

    for (const comparison of sorted) {
      this.processComparison(comparison);
    }
  }

  /**
   * Calculate expected score using ELO formula
   */
  private calculateExpected(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  /**
   * Get adjusted K-factor based on number of comparisons
   * Higher K for items with fewer comparisons
   */
  private getAdjustedK(comparisons: number): number {
    if (comparisons < 10) {
      return this.config.kFactor * 1.5;
    } else if (comparisons < 30) {
      return this.config.kFactor;
    } else {
      return this.config.kFactor * 0.75;
    }
  }

  /**
   * Calculate confidence score for an item
   */
  private calculateConfidence(item: ELORatedItem): number {
    // Base confidence from comparison count
    const comparisonConfidence = Math.min(100, (item.comparisons / this.config.minComparisons) * 50);

    // Consistency bonus (higher for more decisive win/loss records)
    const totalDecisive = item.wins + item.losses;
    const consistency = totalDecisive > 0
      ? Math.abs(item.wins - item.losses) / totalDecisive * 30
      : 0;

    // Rating stability (deduced from variance over time - simplified here)
    const stabilityBonus = item.comparisons > 10 ? 20 : (item.comparisons / 10) * 20;

    return Math.min(100, comparisonConfidence + consistency + stabilityBonus);
  }

  /**
   * Calculate tier boundaries from ELO ratings
   */
  calculateBoundaries(tierCount?: number): number[] {
    const count = tierCount || this.config.tierCount;
    const ratings = this.getSortedRatings();

    if (ratings.length === 0) {
      return this.getDefaultBoundaries(50, count);
    }

    const minRating = Math.min(...ratings);
    const maxRating = Math.max(...ratings);
    const range = maxRating - minRating;

    if (range === 0) {
      return this.getDefaultBoundaries(ratings.length, count);
    }

    // Calculate boundaries as percentiles of the rating range
    const boundaries: number[] = [0];

    for (let i = 1; i < count; i++) {
      // Use pyramid distribution for tier sizes
      const percentile = this.getPyramidPercentile(i, count);
      const ratingThreshold = minRating + (range * percentile);

      // Find position where rating drops below threshold
      let position = 0;
      for (let j = 0; j < ratings.length; j++) {
        if (ratings[j] < ratingThreshold) {
          position = j;
          break;
        }
        position = j + 1;
      }

      boundaries.push(position);
    }

    boundaries.push(ratings.length);

    // Ensure boundaries are unique and sorted
    return Array.from(new Set(boundaries)).sort((a, b) => a - b);
  }

  /**
   * Get pyramid percentile for tier boundary
   */
  private getPyramidPercentile(tierIndex: number, tierCount: number): number {
    const ratio = 1.6;
    let totalWeight = 0;
    let weightSum = 0;

    for (let i = 0; i < tierCount; i++) {
      totalWeight += Math.pow(ratio, i);
    }

    for (let i = 0; i < tierIndex; i++) {
      weightSum += Math.pow(ratio, i);
    }

    return weightSum / totalWeight;
  }

  /**
   * Get default boundaries for equal distribution
   */
  private getDefaultBoundaries(listSize: number, tierCount: number): number[] {
    const boundaries: number[] = [0];
    const tierSize = Math.ceil(listSize / tierCount);

    for (let i = 1; i < tierCount; i++) {
      boundaries.push(Math.min(i * tierSize, listSize));
    }

    boundaries.push(listSize);
    return boundaries;
  }

  /**
   * Get items sorted by rating (descending)
   */
  getSortedItems(): ELORatedItem[] {
    return Array.from(this.items.values()).sort((a, b) => b.rating - a.rating);
  }

  /**
   * Get sorted ratings
   */
  private getSortedRatings(): number[] {
    return this.getSortedItems().map((item) => item.rating);
  }

  /**
   * Assign tiers to items
   */
  assignTiers(tiers: TierDefinition[]): Map<string, TierDefinition> {
    const sortedItems = this.getSortedItems();
    const assignments = new Map<string, TierDefinition>();

    sortedItems.forEach((item, index) => {
      for (const tier of tiers) {
        if (index >= tier.startPosition && index < tier.endPosition) {
          item.tier = tier;
          assignments.set(item.id, tier);
          break;
        }
      }
    });

    return assignments;
  }

  /**
   * Get tier confidence for each item
   */
  getTierConfidences(tiers: TierDefinition[]): TierConfidence[] {
    const sortedItems = this.getSortedItems();
    const confidences: TierConfidence[] = [];

    sortedItems.forEach((item, index) => {
      const tier = tiers.find(
        (t) => index >= t.startPosition && index < t.endPosition
      );

      if (!tier) return;

      // Calculate proximity to boundaries
      const distToLower = index - tier.startPosition;
      const distToUpper = tier.endPosition - index - 1;
      const tierSize = tier.endPosition - tier.startPosition;
      const proximityScore = Math.min(distToLower, distToUpper) / (tierSize / 2) * 100;

      // Find alternative tier if near boundary
      let alternativeTier: TierDefinition | undefined;
      let alternativeConfidence: number | undefined;

      if (distToLower < distToUpper && index > 0) {
        alternativeTier = tiers.find(
          (t) => index - 1 >= t.startPosition && index - 1 < t.endPosition
        );
        alternativeConfidence = 100 - proximityScore;
      } else if (distToUpper < distToLower) {
        alternativeTier = tiers.find(
          (t) => index + 1 >= t.startPosition && index + 1 < t.endPosition
        );
        alternativeConfidence = 100 - proximityScore;
      }

      // Calculate separation from next ranked items
      const nextItem = sortedItems[index + 1];
      const prevItem = sortedItems[index - 1];
      let separation = 100;

      if (nextItem) {
        const ratingGap = item.rating - nextItem.rating;
        separation = Math.min(100, ratingGap / 50 * 100);
      }

      confidences.push({
        itemId: item.id,
        tier,
        confidence: Math.round(
          (item.confidence * 0.4 + proximityScore * 0.3 + separation * 0.3)
        ),
        factors: {
          dataPoints: item.comparisons,
          consistency: Math.round(item.confidence),
          proximity: Math.round(proximityScore),
          separation: Math.round(separation),
        },
        alternativeTier,
        alternativeConfidence: alternativeConfidence ? Math.round(alternativeConfidence) : undefined,
      });
    });

    return confidences;
  }

  /**
   * Calculate algorithm result
   */
  calculate(listSize: number): AlgorithmResult {
    const startTime = performance.now();
    const boundaries = this.calculateBoundaries();
    const endTime = performance.now();

    // Calculate overall confidence
    const items = Array.from(this.items.values());
    const avgConfidence = items.length > 0
      ? items.reduce((sum, item) => sum + item.confidence, 0) / items.length
      : 0;

    // Check if we have enough data
    const hasEnoughData = items.every(
      (item) => item.comparisons >= this.config.minComparisons
    );

    return {
      algorithm: 'elo',
      boundaries,
      confidence: Math.round(hasEnoughData ? avgConfidence : avgConfidence * 0.5),
      executionTime: endTime - startTime,
      metadata: {
        itemCount: items.length,
        totalComparisons: items.reduce((sum, item) => sum + item.comparisons, 0) / 2,
        averageRating: items.reduce((sum, item) => sum + item.rating, 0) / (items.length || 1),
        ratingRange: items.length > 0
          ? Math.max(...items.map(i => i.rating)) - Math.min(...items.map(i => i.rating))
          : 0,
        hasEnoughData,
      },
    };
  }

  /**
   * Get item rating
   */
  getItemRating(itemId: string): number | null {
    return this.items.get(itemId)?.rating ?? null;
  }

  /**
   * Get all item ratings
   */
  getAllRatings(): Map<string, number> {
    const ratings = new Map<string, number>();
    this.items.forEach((item, id) => {
      ratings.set(id, item.rating);
    });
    return ratings;
  }

  /**
   * Reset all ratings
   */
  reset(): void {
    this.items.clear();
  }
}

/**
 * Create ELO tier calculator
 */
export function createELOTierCalculator(config?: Partial<ELOConfig>): ELOTierCalculator {
  return new ELOTierCalculator(config);
}

// Singleton instance
let eloCalculatorInstance: ELOTierCalculator | null = null;

/**
 * Get or create ELO tier calculator instance
 */
export function getELOTierCalculator(config?: Partial<ELOConfig>): ELOTierCalculator {
  if (!eloCalculatorInstance) {
    eloCalculatorInstance = new ELOTierCalculator(config);
  }
  return eloCalculatorInstance;
}
