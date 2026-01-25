/**
 * ThresholdRecommender
 * Provides data-based threshold recommendations based on list characteristics
 */

import { TierAlgorithm, TierSuggestion } from './types';
import {
  ALGORITHM_PRESETS,
  AlgorithmPresetDefinition,
  calculateBoundariesFromAlgorithm,
} from './constants';

/**
 * List characteristics that influence recommendations
 */
export interface ListCharacteristics {
  listSize: number;
  filledPositions: number[];
  tierCount: number;
  hasGaps?: boolean;
  gapPositions?: number[];
  distributionSkew?: 'top-heavy' | 'bottom-heavy' | 'balanced' | 'clustered';
}

/**
 * Threshold recommendation with reasoning
 */
export interface ThresholdRecommendation {
  algorithm: AlgorithmPresetDefinition;
  boundaries: number[];
  confidence: number;  // 0-100
  reasoning: string;
  pros: string[];
  cons: string[];
  bestFor: string[];
}

/**
 * Recommendation comparison result
 */
export interface RecommendationComparison {
  recommendations: ThresholdRecommendation[];
  topRecommendation: ThresholdRecommendation;
  comparisonNotes: string[];
}

/**
 * ThresholdRecommender class
 */
export class ThresholdRecommender {
  private characteristics: ListCharacteristics;

  constructor(characteristics: ListCharacteristics) {
    this.characteristics = characteristics;
  }

  /**
   * Update characteristics
   */
  setCharacteristics(characteristics: ListCharacteristics): void {
    this.characteristics = characteristics;
  }

  /**
   * Analyze list distribution
   */
  private analyzeDistribution(): {
    skew: 'top-heavy' | 'bottom-heavy' | 'balanced' | 'clustered';
    density: number;
    clusterCount: number;
  } {
    const { filledPositions, listSize } = this.characteristics;

    if (filledPositions.length === 0) {
      return { skew: 'balanced', density: 0, clusterCount: 0 };
    }

    // Calculate density
    const density = filledPositions.length / listSize;

    // Calculate average position
    const avgPosition = filledPositions.reduce((a, b) => a + b, 0) / filledPositions.length;
    const midPoint = listSize / 2;

    // Determine skew
    let skew: 'top-heavy' | 'bottom-heavy' | 'balanced' | 'clustered';
    const skewRatio = avgPosition / midPoint;

    if (skewRatio < 0.7) {
      skew = 'top-heavy';
    } else if (skewRatio > 1.3) {
      skew = 'bottom-heavy';
    } else {
      // Check for clustering
      const sorted = [...filledPositions].sort((a, b) => a - b);
      let gapCount = 0;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] - sorted[i - 1] > listSize / 5) {
          gapCount++;
        }
      }
      skew = gapCount >= 2 ? 'clustered' : 'balanced';
    }

    // Count clusters
    const clusterCount = this.countClusters(filledPositions);

    return { skew, density, clusterCount };
  }

  /**
   * Count natural clusters in positions
   */
  private countClusters(positions: number[]): number {
    if (positions.length < 2) return positions.length;

    const sorted = [...positions].sort((a, b) => a - b);
    const { listSize } = this.characteristics;
    const gapThreshold = listSize / 10;  // 10% gap counts as cluster break

    let clusters = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] > gapThreshold) {
        clusters++;
      }
    }

    return clusters;
  }

  /**
   * Generate recommendation for a specific algorithm
   */
  private generateRecommendation(
    algorithm: AlgorithmPresetDefinition
  ): ThresholdRecommendation {
    const { listSize, tierCount, filledPositions } = this.characteristics;
    const boundaries = calculateBoundariesFromAlgorithm(algorithm, listSize, tierCount);

    const distribution = this.analyzeDistribution();
    let confidence = 70;  // Base confidence
    const pros: string[] = [];
    const cons: string[] = [];
    const bestFor: string[] = [];
    let reasoning = '';

    // Evaluate based on algorithm type
    switch (algorithm.algorithm) {
      case 'equal':
        reasoning = 'Equal distribution provides consistent tier sizes';
        pros.push('Simple and predictable');
        pros.push('Fair representation for all tiers');
        cons.push('May not reflect natural quality differences');

        if (distribution.skew === 'balanced') {
          confidence += 15;
          pros.push('Matches your balanced item distribution');
        }

        bestFor.push('Small lists (≤10 items)');
        bestFor.push('When you want equal representation');

        if (listSize <= 10) confidence += 10;
        break;

      case 'pyramid':
        reasoning = 'Pyramid creates exclusive top tiers with larger lower tiers';
        pros.push('Makes top tier feel exclusive');
        pros.push('Natural ranking progression');
        cons.push('Top tiers may be too small for large lists');

        if (distribution.skew === 'top-heavy') {
          confidence += 10;
          pros.push('Complements your top-heavy distribution');
        }

        bestFor.push('Medium lists (10-50 items)');
        bestFor.push('Traditional tier lists');
        bestFor.push('When quality varies significantly');

        if (listSize >= 10 && listSize <= 50) confidence += 10;
        if (distribution.skew === 'top-heavy') confidence += 5;
        break;

      case 'bell':
        reasoning = 'Bell curve places most items in middle tiers';
        pros.push('Realistic quality distribution');
        pros.push('Small elite and bottom groups');
        cons.push('May feel less decisive');

        if (distribution.skew === 'balanced') {
          confidence += 15;
          pros.push('Matches your balanced distribution');
        }

        bestFor.push('Larger lists (25+ items)');
        bestFor.push('When most items are "average"');
        bestFor.push('Academic-style grading');

        if (listSize >= 25) confidence += 10;
        break;

      case 'percentile':
        reasoning = 'Percentile-based ensures top % are in top tiers';
        pros.push('Intuitive "top 10%" concept');
        pros.push('Statistical basis');
        cons.push('Fixed percentages may not fit all lists');

        bestFor.push('Any list size');
        bestFor.push('When percentile ranking matters');

        confidence += 5;  // Generally reliable
        break;

      case 'custom':
        if (algorithm.id === 'algo-elite') {
          reasoning = 'Elite focus keeps top tier very exclusive (5%)';
          pros.push('Extremely selective top tier');
          pros.push('Clear "best of the best"');
          cons.push('Very few items can be top tier');

          bestFor.push('Large lists (50+ items)');
          bestFor.push('Competitive rankings');

          if (listSize >= 50) confidence += 15;
          if (filledPositions.length >= listSize * 0.8) confidence += 10;
        } else if (algorithm.id === 'algo-balanced') {
          reasoning = 'Balanced pyramid offers moderate distribution';
          pros.push('Good middle ground');
          pros.push('Flexible for various uses');
          cons.push('Not distinctive');

          bestFor.push('When unsure which to pick');
          bestFor.push('General purpose tier lists');

          confidence += 5;
        }
        break;
    }

    // Adjust confidence based on list completeness
    const completeness = filledPositions.length / listSize;
    if (completeness < 0.5) {
      confidence -= 10;
      cons.push('List is less than 50% complete');
    }

    return {
      algorithm,
      boundaries,
      confidence: Math.max(0, Math.min(100, confidence)),
      reasoning,
      pros,
      cons,
      bestFor,
    };
  }

  /**
   * Get all recommendations ranked by confidence
   */
  getAllRecommendations(): ThresholdRecommendation[] {
    const recommendations = ALGORITHM_PRESETS.map(algo =>
      this.generateRecommendation(algo)
    );

    // Sort by confidence descending
    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get top recommendation
   */
  getTopRecommendation(): ThresholdRecommendation {
    return this.getAllRecommendations()[0];
  }

  /**
   * Compare recommendations
   */
  compareRecommendations(): RecommendationComparison {
    const recommendations = this.getAllRecommendations();
    const topRecommendation = recommendations[0];
    const comparisonNotes: string[] = [];

    // Generate comparison insights
    const { listSize, filledPositions } = this.characteristics;
    const completeness = Math.round((filledPositions.length / listSize) * 100);

    comparisonNotes.push(`List size: ${listSize} items`);
    comparisonNotes.push(`Completion: ${completeness}%`);

    const distribution = this.analyzeDistribution();
    comparisonNotes.push(`Distribution pattern: ${distribution.skew}`);

    if (distribution.clusterCount > 2) {
      comparisonNotes.push(`Detected ${distribution.clusterCount} natural clusters`);
    }

    // Confidence spread
    const maxConf = recommendations[0].confidence;
    const minConf = recommendations[recommendations.length - 1].confidence;
    if (maxConf - minConf < 15) {
      comparisonNotes.push('Multiple algorithms work well for your list');
    } else {
      comparisonNotes.push(
        `${topRecommendation.algorithm.name} is clearly best for your data`
      );
    }

    return {
      recommendations,
      topRecommendation,
      comparisonNotes,
    };
  }

  /**
   * Get quick suggestion (simplified)
   */
  getQuickSuggestion(): TierSuggestion {
    const top = this.getTopRecommendation();

    return {
      boundaries: top.boundaries,
      confidence: top.confidence,
      reasoning: top.reasoning,
      algorithm: top.algorithm.algorithm as TierAlgorithm,
    };
  }

  /**
   * Recommend tier count based on list size
   */
  static recommendTierCount(listSize: number): number {
    if (listSize <= 5) return 3;
    if (listSize <= 10) return 4;
    if (listSize <= 25) return 5;
    if (listSize <= 50) return 6;
    if (listSize <= 100) return 7;
    return 9;
  }

  /**
   * Check if custom thresholds are sensible
   */
  validateCustomThresholds(boundaries: number[]): {
    valid: boolean;
    warnings: string[];
    suggestions: string[];
  } {
    const { listSize, tierCount } = this.characteristics;
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check tier sizes
    for (let i = 1; i < boundaries.length; i++) {
      const tierSize = boundaries[i] - boundaries[i - 1];
      const percentage = Math.round((tierSize / listSize) * 100);

      // Very small top tier
      if (i === 1 && percentage < 3 && listSize > 20) {
        warnings.push(`Top tier (${percentage}%) may be too small`);
        suggestions.push('Consider increasing to at least 5%');
      }

      // Very large tier
      if (percentage > 50) {
        warnings.push(`Tier ${i} has ${percentage}% of items - may be too large`);
        suggestions.push('Consider splitting this tier');
      }

      // Empty tier risk
      if (tierSize < 2 && listSize > 10) {
        warnings.push(`Tier ${i} may end up with 0-1 items`);
      }
    }

    // Check distribution balance
    const tierSizes = [];
    for (let i = 1; i < boundaries.length; i++) {
      tierSizes.push(boundaries[i] - boundaries[i - 1]);
    }

    const avgSize = tierSizes.reduce((a, b) => a + b, 0) / tierSizes.length;
    const variance = tierSizes.reduce((sum, size) => sum + Math.pow(size - avgSize, 2), 0) / tierSizes.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev > avgSize * 1.5) {
      warnings.push('Tier sizes vary significantly');
      suggestions.push('Consider using a built-in algorithm for more balanced distribution');
    }

    return {
      valid: warnings.length === 0,
      warnings,
      suggestions,
    };
  }
}

/**
 * Factory function
 */
export function createThresholdRecommender(
  characteristics: ListCharacteristics
): ThresholdRecommender {
  return new ThresholdRecommender(characteristics);
}

/**
 * Quick recommendation helper
 */
export function getQuickRecommendation(
  listSize: number,
  filledPositions: number[] = [],
  tierCount?: number
): ThresholdRecommendation {
  const effectiveTierCount = tierCount || ThresholdRecommender.recommendTierCount(listSize);

  const recommender = new ThresholdRecommender({
    listSize,
    filledPositions,
    tierCount: effectiveTierCount,
  });

  return recommender.getTopRecommendation();
}

export default ThresholdRecommender;
