/**
 * Advanced Tier Algorithms
 * Exports all advanced tier calculation algorithms
 */

// Types
export type {
  AdvancedTierAlgorithm,
  Comparison,
  ELORatedItem,
  Cluster,
  JenksBreak,
  TierConfidence,
  AlgorithmResult,
  AlgorithmComparison,
  BaseAlgorithmConfig,
  ELOConfig,
  KMeansConfig,
  JenksConfig,
  HybridConfig,
  AlgorithmConfig,
} from './types';

// ELO Tier Calculator
export {
  ELOTierCalculator,
  createELOTierCalculator,
  getELOTierCalculator,
} from './ELOTierCalculator';

// Clustering Engine (K-means)
export {
  ClusteringEngine,
  createClusteringEngine,
  getClusteringEngine,
} from './ClusteringEngine';

// Jenks Natural Breaks
export {
  JenksBreaks,
  createJenksBreaks,
  getJenksBreaks,
} from './JenksBreaks';

// Hybrid Calculator
export {
  HybridCalculator,
  createHybridCalculator,
  getHybridCalculator,
} from './HybridCalculator';

import type { AdvancedTierAlgorithm, AlgorithmResult, Comparison } from './types';
import { ELOTierCalculator, createELOTierCalculator } from './ELOTierCalculator';
import { ClusteringEngine, createClusteringEngine } from './ClusteringEngine';
import { JenksBreaks, createJenksBreaks } from './JenksBreaks';
import { HybridCalculator, createHybridCalculator } from './HybridCalculator';
import { calculateTierBoundaries } from '../TierCalculator';

/**
 * Algorithm registry
 * Maps algorithm names to their calculators
 */
export interface AlgorithmRegistry {
  elo: ELOTierCalculator;
  kmeans: ClusteringEngine;
  jenks: JenksBreaks;
  hybrid: HybridCalculator;
}

/**
 * Create algorithm registry with all calculators
 */
export function createAlgorithmRegistry(tierCount: number = 5): AlgorithmRegistry {
  return {
    elo: createELOTierCalculator({ tierCount }),
    kmeans: createClusteringEngine({ tierCount }),
    jenks: createJenksBreaks({ tierCount }),
    hybrid: createHybridCalculator({ tierCount }),
  };
}

/**
 * Run a specific algorithm
 */
export function runAlgorithm(
  algorithm: AdvancedTierAlgorithm,
  listSize: number,
  options?: {
    comparisons?: Comparison[];
    positions?: number[];
    tierCount?: number;
  }
): AlgorithmResult {
  const tierCount = options?.tierCount || 5;
  const startTime = performance.now();

  switch (algorithm) {
    case 'elo': {
      const calculator = createELOTierCalculator({ tierCount });
      if (options?.comparisons) {
        calculator.initializeItems(
          Array.from(new Set(options.comparisons.flatMap((c) => [c.itemA, c.itemB])))
        );
        calculator.processComparisons(options.comparisons);
      }
      return calculator.calculate(listSize);
    }

    case 'kmeans': {
      const engine = createClusteringEngine({ tierCount });
      if (options?.positions) {
        engine.setData(options.positions);
      }
      return engine.calculate(listSize);
    }

    case 'jenks': {
      const jenks = createJenksBreaks({ tierCount });
      if (options?.positions) {
        jenks.setData(options.positions);
      }
      return jenks.calculate(listSize);
    }

    case 'hybrid': {
      const hybrid = createHybridCalculator({ tierCount });
      if (options?.comparisons) {
        hybrid.setComparisons(options.comparisons);
      }
      if (options?.positions) {
        hybrid.setPositions(options.positions);
      }
      return hybrid.calculate(listSize);
    }

    case 'percentile':
    case 'equal':
    case 'pyramid':
    case 'bell': {
      const boundaries = calculateTierBoundaries(listSize, tierCount, algorithm);
      return {
        algorithm,
        boundaries,
        confidence: 75,
        executionTime: performance.now() - startTime,
        metadata: {},
      };
    }

    default: {
      const boundaries = calculateTierBoundaries(listSize, tierCount, 'equal');
      return {
        algorithm: 'equal',
        boundaries,
        confidence: 70,
        executionTime: performance.now() - startTime,
        metadata: {},
      };
    }
  }
}

/**
 * Run all algorithms and compare
 */
export function compareAllAlgorithms(
  listSize: number,
  options?: {
    comparisons?: Comparison[];
    positions?: number[];
    tierCount?: number;
  }
): {
  results: AlgorithmResult[];
  agreement: number;
  best: AdvancedTierAlgorithm;
} {
  const algorithms: AdvancedTierAlgorithm[] = [
    'elo',
    'kmeans',
    'jenks',
    'percentile',
    'pyramid',
  ];

  const results = algorithms.map((algo) => runAlgorithm(algo, listSize, options));

  // Calculate agreement
  let totalAgreement = 0;
  let comparisons = 0;

  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      let matches = 0;
      for (let pos = 0; pos < listSize; pos++) {
        const tier1 = getTierForPosition(pos, results[i].boundaries);
        const tier2 = getTierForPosition(pos, results[j].boundaries);
        if (tier1 === tier2) matches++;
      }
      totalAgreement += (matches / listSize) * 100;
      comparisons++;
    }
  }

  const agreement = comparisons > 0 ? totalAgreement / comparisons : 0;

  // Find best
  let best: AdvancedTierAlgorithm = 'percentile';
  let bestConfidence = 0;
  for (const result of results) {
    if (result.confidence > bestConfidence) {
      bestConfidence = result.confidence;
      best = result.algorithm;
    }
  }

  return { results, agreement: Math.round(agreement), best };
}

/**
 * Get tier index for a position
 */
function getTierForPosition(position: number, boundaries: number[]): number {
  for (let i = 0; i < boundaries.length - 1; i++) {
    if (position >= boundaries[i] && position < boundaries[i + 1]) {
      return i;
    }
  }
  return boundaries.length - 2;
}

/**
 * Algorithm metadata for UI
 */
export const ALGORITHM_INFO: Record<
  AdvancedTierAlgorithm,
  {
    name: string;
    description: string;
    pros: string[];
    cons: string[];
    dataRequirements: string;
  }
> = {
  elo: {
    name: 'ELO Rating',
    description: 'Uses head-to-head comparisons to calculate ratings, then assigns tiers based on rating distribution.',
    pros: ['Incorporates comparison history', 'Handles inconsistent preferences', 'Proven algorithm'],
    cons: ['Requires comparison data', 'Needs many comparisons for accuracy'],
    dataRequirements: 'At least 3 comparisons per item recommended',
  },
  kmeans: {
    name: 'K-Means Clustering',
    description: 'Groups items into natural clusters based on position similarity.',
    pros: ['Finds natural groupings', 'Adapts to data distribution', 'Good for uneven data'],
    cons: ['May produce uneven tier sizes', 'Results can vary'],
    dataRequirements: 'Works with any number of items',
  },
  jenks: {
    name: 'Jenks Natural Breaks',
    description: 'Optimizes break points to minimize within-class variance and maximize between-class variance.',
    pros: ['Statistically optimal breaks', 'Consistent results', 'Good for skewed data'],
    cons: ['Computationally intensive for large datasets'],
    dataRequirements: 'Works best with 10+ items',
  },
  hybrid: {
    name: 'Hybrid (Combined)',
    description: 'Combines multiple algorithms using weighted voting for robust results.',
    pros: ['Most reliable results', 'Handles edge cases', 'Best of all methods'],
    cons: ['Slower than individual algorithms'],
    dataRequirements: 'Works with any data',
  },
  percentile: {
    name: 'Percentile-Based',
    description: 'Places top percentages in top tiers using predefined thresholds.',
    pros: ['Predictable results', 'Fast calculation', 'Easy to understand'],
    cons: ['Ignores data distribution', 'May not fit natural groups'],
    dataRequirements: 'Works with any number of items',
  },
  equal: {
    name: 'Equal Distribution',
    description: 'Divides items evenly across all tiers.',
    pros: ['Simple and predictable', 'Fast calculation', 'Even tier sizes'],
    cons: ['Ignores natural groupings', 'May separate similar items'],
    dataRequirements: 'Works with any number of items',
  },
  pyramid: {
    name: 'Pyramid Distribution',
    description: 'Fewer items in top tiers, more in lower tiers.',
    pros: ['Reflects elite/common distribution', 'Intuitive tier sizes'],
    cons: ['Fixed distribution pattern'],
    dataRequirements: 'Works with any number of items',
  },
  bell: {
    name: 'Bell Curve',
    description: 'Most items in middle tiers, fewer at extremes.',
    pros: ['Normal distribution', 'Balanced appearance'],
    cons: ['May not match actual data'],
    dataRequirements: 'Works best with 10+ items',
  },
  statistical: {
    name: 'Statistical Analysis',
    description: 'Uses statistical measures to determine breaks.',
    pros: ['Data-driven', 'Objective'],
    cons: ['Requires understanding of statistics'],
    dataRequirements: 'Works with any number of items',
  },
  custom: {
    name: 'Custom',
    description: 'User-defined tier boundaries.',
    pros: ['Full control', 'Flexible'],
    cons: ['Requires manual input'],
    dataRequirements: 'N/A',
  },
};
