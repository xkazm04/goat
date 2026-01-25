/**
 * Algorithm Types
 * Type definitions for tier algorithms
 */

import type { TierAlgorithm, TierDefinition } from '../types';

/**
 * Extended algorithm types for advanced calculations
 */
export type AdvancedTierAlgorithm = TierAlgorithm | 'elo' | 'jenks' | 'hybrid' | 'statistical';

/**
 * Comparison data for ELO calculation
 */
export interface Comparison {
  /** ID of item A */
  itemA: string;
  /** ID of item B */
  itemB: string;
  /** Winner ID (itemA, itemB, or null for draw) */
  winner: string | null;
  /** Timestamp of comparison */
  timestamp: number;
  /** Comparison confidence (0-1) */
  confidence?: number;
}

/**
 * Item with ELO rating
 */
export interface ELORatedItem {
  id: string;
  rating: number;
  comparisons: number;
  wins: number;
  losses: number;
  draws: number;
  confidence: number;
  tier?: TierDefinition;
}

/**
 * Cluster for k-means
 */
export interface Cluster {
  centroid: number;
  items: number[];
  variance: number;
}

/**
 * Natural break (Jenks)
 */
export interface JenksBreak {
  value: number;
  goodness: number; // Goodness of Variance Fit
}

/**
 * Confidence score for a tier assignment
 */
export interface TierConfidence {
  itemId: string;
  tier: TierDefinition;
  confidence: number; // 0-100
  factors: {
    dataPoints: number;
    consistency: number;
    proximity: number;
    separation: number;
  };
  alternativeTier?: TierDefinition;
  alternativeConfidence?: number;
}

/**
 * Algorithm result with metadata
 */
export interface AlgorithmResult {
  algorithm: AdvancedTierAlgorithm;
  boundaries: number[];
  confidence: number;
  executionTime: number;
  metadata: {
    iterations?: number;
    clusters?: Cluster[];
    gvf?: number; // Goodness of Variance Fit for Jenks
    convergence?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Algorithm comparison result
 */
export interface AlgorithmComparison {
  algorithms: AdvancedTierAlgorithm[];
  results: AlgorithmResult[];
  agreement: number; // 0-100, how much algorithms agree
  bestAlgorithm: AdvancedTierAlgorithm;
  recommendation: string;
}

/**
 * Base algorithm configuration
 */
export interface BaseAlgorithmConfig {
  algorithm: AdvancedTierAlgorithm;
  tierCount: number;
  maxIterations?: number;
  convergenceThreshold?: number;
}

/**
 * ELO algorithm configuration
 */
export interface ELOConfig extends BaseAlgorithmConfig {
  algorithm: 'elo';
  kFactor: number;
  initialRating: number;
  minComparisons: number;
  decayFactor?: number;
}

/**
 * K-means clustering configuration
 */
export interface KMeansConfig extends BaseAlgorithmConfig {
  algorithm: 'kmeans';
  maxIterations: number;
  initMethod: 'random' | 'kmeans++' | 'quantile';
}

/**
 * Jenks natural breaks configuration
 */
export interface JenksConfig extends BaseAlgorithmConfig {
  algorithm: 'jenks';
  minGVF: number; // Minimum Goodness of Variance Fit
}

/**
 * Hybrid algorithm configuration
 */
export interface HybridConfig extends BaseAlgorithmConfig {
  algorithm: 'hybrid';
  weights: {
    elo: number;
    kmeans: number;
    jenks: number;
    percentile: number;
  };
  fallback: AdvancedTierAlgorithm;
}

export type AlgorithmConfig = ELOConfig | KMeansConfig | JenksConfig | HybridConfig | BaseAlgorithmConfig;
