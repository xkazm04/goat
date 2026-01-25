/**
 * HybridCalculator
 * Combines multiple tier algorithms for optimal results
 */

import type { TierDefinition } from '../types';
import type {
  HybridConfig,
  AlgorithmResult,
  AdvancedTierAlgorithm,
  AlgorithmComparison,
  Comparison,
} from './types';
import { ELOTierCalculator, createELOTierCalculator } from './ELOTierCalculator';
import { ClusteringEngine, createClusteringEngine } from './ClusteringEngine';
import { JenksBreaks, createJenksBreaks } from './JenksBreaks';
import { calculateTierBoundaries } from '../TierCalculator';

/**
 * Default hybrid configuration
 */
const DEFAULT_HYBRID_CONFIG: HybridConfig = {
  algorithm: 'hybrid',
  tierCount: 5,
  weights: {
    elo: 0.30,
    kmeans: 0.25,
    jenks: 0.25,
    percentile: 0.20,
  },
  fallback: 'percentile',
};

/**
 * HybridCalculator class
 * Orchestrates multiple algorithms and combines their results
 */
export class HybridCalculator {
  private config: HybridConfig;
  private eloCalculator: ELOTierCalculator;
  private clusteringEngine: ClusteringEngine;
  private jenksBreaks: JenksBreaks;
  private results: AlgorithmResult[] = [];

  constructor(config: Partial<HybridConfig> = {}) {
    this.config = { ...DEFAULT_HYBRID_CONFIG, ...config };
    this.eloCalculator = createELOTierCalculator({ tierCount: this.config.tierCount });
    this.clusteringEngine = createClusteringEngine({ tierCount: this.config.tierCount });
    this.jenksBreaks = createJenksBreaks({ tierCount: this.config.tierCount });
  }

  /**
   * Set comparison data for ELO
   */
  setComparisons(comparisons: Comparison[]): void {
    this.eloCalculator.initializeItems(Array.from(new Set(
      comparisons.flatMap(c => [c.itemA, c.itemB])
    )));
    this.eloCalculator.processComparisons(comparisons);
  }

  /**
   * Set position data for clustering and Jenks
   */
  setPositions(positions: number[]): void {
    this.clusteringEngine.setData(positions);
    this.jenksBreaks.setData(positions);
  }

  /**
   * Run all algorithms
   */
  runAllAlgorithms(listSize: number): AlgorithmResult[] {
    const results: AlgorithmResult[] = [];

    // Run ELO
    try {
      const eloResult = this.eloCalculator.calculate(listSize);
      results.push(eloResult);
    } catch (e) {
      console.warn('ELO algorithm failed:', e);
    }

    // Run K-means
    try {
      const kmeansResult = this.clusteringEngine.calculate(listSize);
      results.push(kmeansResult);
    } catch (e) {
      console.warn('K-means algorithm failed:', e);
    }

    // Run Jenks
    try {
      const jenksResult = this.jenksBreaks.calculate(listSize);
      results.push(jenksResult);
    } catch (e) {
      console.warn('Jenks algorithm failed:', e);
    }

    // Run percentile
    try {
      const startTime = performance.now();
      const boundaries = calculateTierBoundaries(
        listSize,
        this.config.tierCount,
        'percentile'
      );
      results.push({
        algorithm: 'percentile',
        boundaries,
        confidence: 75,
        executionTime: performance.now() - startTime,
        metadata: {},
      });
    } catch (e) {
      console.warn('Percentile algorithm failed:', e);
    }

    this.results = results;
    return results;
  }

  /**
   * Combine algorithm results using weighted voting
   */
  combineResults(listSize: number): AlgorithmResult {
    if (this.results.length === 0) {
      this.runAllAlgorithms(listSize);
    }

    const startTime = performance.now();

    // Create position-to-tier map for each algorithm
    type TierVote = { tier: number; weight: number; confidence: number };
    const tierVotes: TierVote[][] = Array(listSize).fill(null).map(() => []);

    for (const result of this.results) {
      const weight = this.getAlgorithmWeight(result.algorithm);

      for (let pos = 0; pos < listSize; pos++) {
        const tier = this.getTierForPosition(pos, result.boundaries);
        tierVotes[pos].push({ tier, weight, confidence: result.confidence });
      }
    }

    // Calculate weighted tier for each position
    const boundaries: number[] = [0];
    let currentTier = 0;

    for (let pos = 0; pos < listSize; pos++) {
      const votes = tierVotes[pos];
      const weightedTier = this.calculateWeightedTier(votes);

      if (weightedTier > currentTier && pos > 0) {
        boundaries.push(pos);
        currentTier = weightedTier;
      }
    }

    boundaries.push(listSize);

    // Ensure we have the right number of boundaries
    const targetBoundaries = this.config.tierCount + 1;
    while (boundaries.length < targetBoundaries) {
      // Add missing boundaries evenly
      const insertIdx = Math.floor(boundaries.length / 2);
      const insertPos = Math.floor(
        (boundaries[insertIdx - 1] + boundaries[insertIdx]) / 2
      );
      boundaries.splice(insertIdx, 0, insertPos);
    }
    while (boundaries.length > targetBoundaries) {
      // Remove boundaries (merge tiers)
      const removeIdx = boundaries.length - 2;
      boundaries.splice(removeIdx, 1);
    }

    // Calculate combined confidence
    const avgConfidence = this.results.reduce(
      (sum, r) => sum + r.confidence * this.getAlgorithmWeight(r.algorithm),
      0
    ) / this.results.reduce(
      (sum, r) => sum + this.getAlgorithmWeight(r.algorithm),
      0
    );

    const endTime = performance.now();

    return {
      algorithm: 'hybrid',
      boundaries,
      confidence: Math.round(avgConfidence),
      executionTime: endTime - startTime,
      metadata: {
        algorithms: this.results.map(r => r.algorithm),
        weights: this.config.weights,
        individualResults: this.results,
      },
    };
  }

  /**
   * Get weight for an algorithm
   */
  private getAlgorithmWeight(algorithm: AdvancedTierAlgorithm): number {
    switch (algorithm) {
      case 'elo': return this.config.weights.elo;
      case 'kmeans': return this.config.weights.kmeans;
      case 'jenks': return this.config.weights.jenks;
      case 'percentile': return this.config.weights.percentile;
      default: return 0.1;
    }
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
   * Calculate weighted tier from votes
   */
  private calculateWeightedTier(
    votes: Array<{ tier: number; weight: number; confidence: number }>
  ): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const vote of votes) {
      const effectiveWeight = vote.weight * (vote.confidence / 100);
      weightedSum += vote.tier * effectiveWeight;
      totalWeight += effectiveWeight;
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  /**
   * Compare algorithm results
   */
  compareAlgorithms(listSize: number): AlgorithmComparison {
    if (this.results.length === 0) {
      this.runAllAlgorithms(listSize);
    }

    // Calculate agreement between algorithms
    let totalAgreement = 0;
    let comparisons = 0;

    for (let i = 0; i < this.results.length; i++) {
      for (let j = i + 1; j < this.results.length; j++) {
        totalAgreement += this.calculateAgreement(
          this.results[i].boundaries,
          this.results[j].boundaries,
          listSize
        );
        comparisons++;
      }
    }

    const agreement = comparisons > 0 ? totalAgreement / comparisons : 0;

    // Find best algorithm
    let bestAlgorithm = this.config.fallback;
    let bestConfidence = 0;

    for (const result of this.results) {
      if (result.confidence > bestConfidence) {
        bestConfidence = result.confidence;
        bestAlgorithm = result.algorithm;
      }
    }

    // Generate recommendation
    let recommendation: string;
    if (agreement > 80) {
      recommendation = 'High agreement between algorithms. Results are reliable.';
    } else if (agreement > 60) {
      recommendation = `Moderate agreement. ${bestAlgorithm} shows highest confidence.`;
    } else if (agreement > 40) {
      recommendation = 'Low agreement. Consider using hybrid results or more data.';
    } else {
      recommendation = 'Very low agreement. Results may be unreliable. More comparisons needed.';
    }

    return {
      algorithms: this.results.map(r => r.algorithm),
      results: this.results,
      agreement: Math.round(agreement),
      bestAlgorithm,
      recommendation,
    };
  }

  /**
   * Calculate agreement between two boundary sets
   */
  private calculateAgreement(
    boundaries1: number[],
    boundaries2: number[],
    listSize: number
  ): number {
    let matches = 0;

    for (let pos = 0; pos < listSize; pos++) {
      const tier1 = this.getTierForPosition(pos, boundaries1);
      const tier2 = this.getTierForPosition(pos, boundaries2);

      if (tier1 === tier2) {
        matches++;
      } else if (Math.abs(tier1 - tier2) === 1) {
        matches += 0.5; // Partial credit for adjacent tiers
      }
    }

    return (matches / listSize) * 100;
  }

  /**
   * Get best algorithm based on data characteristics
   */
  recommendAlgorithm(
    hasComparisons: boolean,
    dataSize: number,
    varianceLevel: 'low' | 'medium' | 'high'
  ): AdvancedTierAlgorithm {
    // ELO is best when we have comparison data
    if (hasComparisons && this.eloCalculator.getSortedItems().length > 0) {
      return 'elo';
    }

    // Jenks is best for data with natural clusters
    if (varianceLevel === 'high') {
      return 'jenks';
    }

    // K-means is good for medium variance
    if (varianceLevel === 'medium' && dataSize >= 10) {
      return 'kmeans';
    }

    // Percentile is a safe fallback
    return 'percentile';
  }

  /**
   * Calculate final result using best method
   */
  calculate(listSize: number): AlgorithmResult {
    // First, run all algorithms
    this.runAllAlgorithms(listSize);

    // If we have good agreement, use hybrid
    const comparison = this.compareAlgorithms(listSize);

    if (comparison.agreement > 60) {
      return this.combineResults(listSize);
    }

    // Otherwise, use the best individual algorithm
    const bestResult = this.results.find(r => r.algorithm === comparison.bestAlgorithm);
    return bestResult || this.combineResults(listSize);
  }

  /**
   * Get individual algorithm results
   */
  getResults(): AlgorithmResult[] {
    return this.results;
  }

  /**
   * Reset all calculators
   */
  reset(): void {
    this.eloCalculator.reset();
    this.clusteringEngine.reset();
    this.jenksBreaks.reset();
    this.results = [];
  }
}

/**
 * Create hybrid calculator
 */
export function createHybridCalculator(config?: Partial<HybridConfig>): HybridCalculator {
  return new HybridCalculator(config);
}

// Singleton instance
let hybridInstance: HybridCalculator | null = null;

/**
 * Get or create hybrid calculator instance
 */
export function getHybridCalculator(config?: Partial<HybridConfig>): HybridCalculator {
  if (!hybridInstance) {
    hybridInstance = new HybridCalculator(config);
  }
  return hybridInstance;
}
