/**
 * ConfidenceScorer
 * Calculates confidence scores for tier assignments
 */

import type { TierDefinition, TieredItem } from './types';
import type { TierConfidence, Comparison, AlgorithmResult } from './algorithms/types';

/**
 * Confidence factor weights
 */
interface ConfidenceWeights {
  dataPoints: number;
  consistency: number;
  proximity: number;
  separation: number;
  algorithmAgreement: number;
}

/**
 * Default weights
 */
const DEFAULT_WEIGHTS: ConfidenceWeights = {
  dataPoints: 0.25,
  consistency: 0.20,
  proximity: 0.20,
  separation: 0.15,
  algorithmAgreement: 0.20,
};

/**
 * ConfidenceScorer class
 * Provides confidence metrics for tier assignments
 */
export class ConfidenceScorer {
  private weights: ConfidenceWeights;
  private comparisons: Comparison[] = [];
  private algorithmResults: AlgorithmResult[] = [];

  constructor(weights?: Partial<ConfidenceWeights>) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /**
   * Set comparison data
   */
  setComparisons(comparisons: Comparison[]): void {
    this.comparisons = comparisons;
  }

  /**
   * Set algorithm results for comparison
   */
  setAlgorithmResults(results: AlgorithmResult[]): void {
    this.algorithmResults = results;
  }

  /**
   * Calculate confidence for a single item
   */
  calculateItemConfidence(
    item: TieredItem,
    allItems: TieredItem[],
    tiers: TierDefinition[]
  ): TierConfidence {
    const factors = {
      dataPoints: this.calculateDataPointsFactor(item.itemId),
      consistency: this.calculateConsistencyFactor(item.itemId, item.position, allItems),
      proximity: this.calculateProximityFactor(item, tiers),
      separation: this.calculateSeparationFactor(item, allItems),
    };

    // Calculate overall confidence
    const confidence = Math.round(
      factors.dataPoints * this.weights.dataPoints * 100 +
      factors.consistency * this.weights.consistency * 100 +
      factors.proximity * this.weights.proximity * 100 +
      factors.separation * this.weights.separation * 100 +
      this.calculateAlgorithmAgreement(item.position) * this.weights.algorithmAgreement * 100
    );

    // Find alternative tier
    const { alternativeTier, alternativeConfidence } = this.findAlternativeTier(item, tiers);

    return {
      itemId: item.itemId,
      tier: item.tier,
      confidence: Math.min(100, Math.max(0, confidence)),
      factors: {
        dataPoints: Math.round(factors.dataPoints * 100),
        consistency: Math.round(factors.consistency * 100),
        proximity: Math.round(factors.proximity * 100),
        separation: Math.round(factors.separation * 100),
      },
      alternativeTier,
      alternativeConfidence,
    };
  }

  /**
   * Calculate data points factor
   * More comparisons = higher confidence
   */
  private calculateDataPointsFactor(itemId: string): number {
    const itemComparisons = this.comparisons.filter(
      (c) => c.itemA === itemId || c.itemB === itemId
    );

    const count = itemComparisons.length;
    const minComparisons = 3;
    const optimalComparisons = 15;

    if (count >= optimalComparisons) return 1;
    if (count < minComparisons) return count / minComparisons * 0.5;

    return 0.5 + ((count - minComparisons) / (optimalComparisons - minComparisons)) * 0.5;
  }

  /**
   * Calculate consistency factor
   * Consistent comparisons = higher confidence
   */
  private calculateConsistencyFactor(
    itemId: string,
    position: number,
    allItems: TieredItem[]
  ): number {
    const itemComparisons = this.comparisons.filter(
      (c) => c.itemA === itemId || c.itemB === itemId
    );

    if (itemComparisons.length === 0) return 0.5;

    let consistentCount = 0;

    for (const comparison of itemComparisons) {
      const otherId = comparison.itemA === itemId ? comparison.itemB : comparison.itemA;
      const otherItem = allItems.find((i) => i.itemId === otherId);

      if (!otherItem) continue;

      // Check if comparison result is consistent with positions
      const isWinner = comparison.winner === itemId;
      const isDraw = comparison.winner === null;
      const isHigherRanked = position < otherItem.position;

      if (isDraw) {
        // Draws are somewhat consistent if items are close
        if (Math.abs(position - otherItem.position) <= 3) {
          consistentCount += 0.8;
        } else {
          consistentCount += 0.4;
        }
      } else if (isWinner === isHigherRanked) {
        // Winner should be higher ranked
        consistentCount += 1;
      } else {
        // Inconsistent
        consistentCount += 0;
      }
    }

    return consistentCount / itemComparisons.length;
  }

  /**
   * Calculate proximity factor
   * Items closer to tier center = higher confidence
   */
  private calculateProximityFactor(item: TieredItem, tiers: TierDefinition[]): number {
    const tier = item.tier;
    const tierSize = tier.endPosition - tier.startPosition;

    if (tierSize <= 1) return 1;

    // Distance from tier center
    const tierCenter = (tier.startPosition + tier.endPosition) / 2;
    const distFromCenter = Math.abs(item.position - tierCenter);
    const maxDist = tierSize / 2;

    return 1 - (distFromCenter / maxDist) * 0.5;
  }

  /**
   * Calculate separation factor
   * Clear gaps between items = higher confidence
   */
  private calculateSeparationFactor(item: TieredItem, allItems: TieredItem[]): number {
    const sortedItems = [...allItems].sort((a, b) => a.position - b.position);
    const idx = sortedItems.findIndex((i) => i.itemId === item.itemId);

    if (idx === -1) return 0.5;

    // Check if item is near a tier boundary
    const prevItem = sortedItems[idx - 1];
    const nextItem = sortedItems[idx + 1];

    let separation = 1;

    // Check if same tier as neighbors
    if (prevItem && prevItem.tier.id !== item.tier.id) {
      // At tier boundary - slightly lower confidence
      separation *= 0.9;
    }

    if (nextItem && nextItem.tier.id !== item.tier.id) {
      // At tier boundary - slightly lower confidence
      separation *= 0.9;
    }

    return separation;
  }

  /**
   * Calculate algorithm agreement
   * How much different algorithms agree on this position
   */
  private calculateAlgorithmAgreement(position: number): number {
    if (this.algorithmResults.length < 2) return 0.8;

    let agreementCount = 0;
    const totalComparisons = this.algorithmResults.length * (this.algorithmResults.length - 1) / 2;

    for (let i = 0; i < this.algorithmResults.length; i++) {
      for (let j = i + 1; j < this.algorithmResults.length; j++) {
        const tierI = this.getTierForPosition(position, this.algorithmResults[i].boundaries);
        const tierJ = this.getTierForPosition(position, this.algorithmResults[j].boundaries);

        if (tierI === tierJ) {
          agreementCount++;
        } else if (Math.abs(tierI - tierJ) === 1) {
          agreementCount += 0.5; // Adjacent tiers get partial credit
        }
      }
    }

    return agreementCount / totalComparisons;
  }

  /**
   * Get tier index for a position
   */
  private getTierForPosition(position: number, boundaries: number[]): number {
    for (let i = 0; i < boundaries.length - 1; i++) {
      if (position >= boundaries[i] && position < boundaries[i + 1]) {
        return i;
      }
    }
    return boundaries.length - 2;
  }

  /**
   * Find alternative tier for an item
   */
  private findAlternativeTier(
    item: TieredItem,
    tiers: TierDefinition[]
  ): { alternativeTier?: TierDefinition; alternativeConfidence?: number } {
    const currentTierIdx = tiers.findIndex((t) => t.id === item.tier.id);

    if (currentTierIdx === -1) return {};

    // Check distance to tier boundaries
    const distToStart = item.position - item.tier.startPosition;
    const distToEnd = item.tier.endPosition - item.position - 1;

    if (distToStart <= distToEnd) {
      // Closer to start (higher tier boundary)
      const alternateTier = tiers[currentTierIdx - 1];
      if (alternateTier) {
        const tierSize = item.tier.endPosition - item.tier.startPosition;
        const alternativeConfidence = Math.round((distToStart / (tierSize / 2)) * 100);
        return { alternativeTier: alternateTier, alternativeConfidence };
      }
    } else {
      // Closer to end (lower tier boundary)
      const alternateTier = tiers[currentTierIdx + 1];
      if (alternateTier) {
        const tierSize = item.tier.endPosition - item.tier.startPosition;
        const alternativeConfidence = Math.round((distToEnd / (tierSize / 2)) * 100);
        return { alternativeTier: alternateTier, alternativeConfidence };
      }
    }

    return {};
  }

  /**
   * Calculate confidence for all items
   */
  calculateAllConfidences(
    items: TieredItem[],
    tiers: TierDefinition[]
  ): TierConfidence[] {
    return items.map((item) => this.calculateItemConfidence(item, items, tiers));
  }

  /**
   * Get overall tier confidence
   */
  calculateOverallConfidence(confidences: TierConfidence[]): number {
    if (confidences.length === 0) return 0;

    return Math.round(
      confidences.reduce((sum, c) => sum + c.confidence, 0) / confidences.length
    );
  }

  /**
   * Get low confidence items (potential issues)
   */
  getLowConfidenceItems(
    confidences: TierConfidence[],
    threshold: number = 60
  ): TierConfidence[] {
    return confidences.filter((c) => c.confidence < threshold);
  }

  /**
   * Get items near tier boundaries
   */
  getBoundaryItems(
    confidences: TierConfidence[],
    alternativeThreshold: number = 30
  ): TierConfidence[] {
    return confidences.filter(
      (c) => c.alternativeTier && c.alternativeConfidence && c.alternativeConfidence >= alternativeThreshold
    );
  }

  /**
   * Generate confidence report
   */
  generateReport(
    items: TieredItem[],
    tiers: TierDefinition[]
  ): {
    overallConfidence: number;
    tierConfidences: Map<string, number>;
    lowConfidenceCount: number;
    boundaryItemCount: number;
    recommendations: string[];
    confidences: TierConfidence[];
  } {
    const confidences = this.calculateAllConfidences(items, tiers);
    const overallConfidence = this.calculateOverallConfidence(confidences);
    const lowConfidenceItems = this.getLowConfidenceItems(confidences);
    const boundaryItems = this.getBoundaryItems(confidences);

    // Calculate per-tier confidence
    const tierConfidences = new Map<string, number>();
    for (const tier of tiers) {
      const tierItems = confidences.filter((c) => c.tier.id === tier.id);
      if (tierItems.length > 0) {
        tierConfidences.set(
          tier.id,
          Math.round(tierItems.reduce((sum, c) => sum + c.confidence, 0) / tierItems.length)
        );
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (lowConfidenceItems.length > 0) {
      recommendations.push(
        `${lowConfidenceItems.length} item(s) have low confidence scores. Consider more comparisons.`
      );
    }

    if (boundaryItems.length > 0) {
      recommendations.push(
        `${boundaryItems.length} item(s) are near tier boundaries and could shift with more data.`
      );
    }

    if (this.comparisons.length < items.length * 3) {
      recommendations.push(
        `More comparisons would improve confidence. Current: ${this.comparisons.length}, Recommended: ${items.length * 3}+`
      );
    }

    if (overallConfidence < 70) {
      recommendations.push(
        'Overall confidence is below 70%. Results may change with additional data.'
      );
    }

    return {
      overallConfidence,
      tierConfidences,
      lowConfidenceCount: lowConfidenceItems.length,
      boundaryItemCount: boundaryItems.length,
      recommendations,
      confidences,
    };
  }

  /**
   * Reset scorer
   */
  reset(): void {
    this.comparisons = [];
    this.algorithmResults = [];
  }
}

/**
 * Create confidence scorer
 */
export function createConfidenceScorer(weights?: Partial<ConfidenceWeights>): ConfidenceScorer {
  return new ConfidenceScorer(weights);
}

// Singleton instance
let scorerInstance: ConfidenceScorer | null = null;

/**
 * Get or create confidence scorer instance
 */
export function getConfidenceScorer(weights?: Partial<ConfidenceWeights>): ConfidenceScorer {
  if (!scorerInstance) {
    scorerInstance = new ConfidenceScorer(weights);
  }
  return scorerInstance;
}
