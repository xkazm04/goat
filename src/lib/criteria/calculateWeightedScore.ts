/**
 * Weighted Score Calculation
 *
 * Single source of truth for calculating weighted scores from criteria scores.
 * Consolidates duplicate implementations from:
 * - API routes
 * - criteria-store
 * - CriteriaManager
 *
 * @module calculateWeightedScore
 */

import type { Criterion, CriterionScore, WeightedScoreOptions } from './types';
import { DEFAULT_SCORE_OPTIONS } from './types';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for weighted score calculation
 */
export interface CalculateWeightedScoreOptions {
  /**
   * Normalization method
   * - 'linear': Score normalized linearly within min/max range (default)
   * - 'percentile': Score normalized as percentile (requires score distribution)
   */
  normalization?: 'linear' | 'percentile';

  /**
   * Whether to round the final result
   * @default true
   */
  roundResult?: boolean;

  /**
   * Number of decimal places for rounding
   * @default 2
   */
  decimalPlaces?: number;

  /**
   * Whether to skip criteria with zero weight
   * @default true
   */
  skipZeroWeight?: boolean;
}

/**
 * Result of weighted score calculation with additional metadata
 */
export interface WeightedScoreResult {
  /** The calculated weighted score (0-100 scale) */
  score: number;

  /** Number of criteria that were scored */
  scoredCount: number;

  /** Total number of criteria available */
  totalCriteria: number;

  /** Whether all criteria have been scored */
  isComplete: boolean;

  /** Breakdown of score contribution by criterion */
  breakdown?: CriterionBreakdown[];
}

/**
 * Individual criterion contribution to the weighted score
 */
export interface CriterionBreakdown {
  criterionId: string;
  criterionName: string;
  rawScore: number;
  normalizedScore: number;
  weight: number;
  contribution: number;
}

// =============================================================================
// Core Calculation Function
// =============================================================================

/**
 * Calculate weighted score from criteria scores and criterion definitions.
 *
 * The algorithm:
 * 1. For each scored criterion, normalize the score to 0-1 range
 * 2. Multiply by the criterion's weight
 * 3. Sum all weighted scores
 * 4. Divide by total weight to get weighted average
 * 5. Scale to 0-100 and round as configured
 *
 * @param scores - Array of criterion scores
 * @param criteria - Array of criterion definitions
 * @param options - Calculation options
 * @returns Weighted score on 0-100 scale
 *
 * @example
 * ```ts
 * const score = calculateWeightedScore(
 *   [{ criterionId: 'c1', score: 8 }, { criterionId: 'c2', score: 6 }],
 *   [
 *     { id: 'c1', weight: 60, minScore: 1, maxScore: 10, name: 'Quality', description: '' },
 *     { id: 'c2', weight: 40, minScore: 1, maxScore: 10, name: 'Value', description: '' }
 *   ]
 * );
 * // Returns: 71.11 (weighted average scaled to 0-100)
 * ```
 */
export function calculateWeightedScore(
  scores: CriterionScore[],
  criteria: Criterion[],
  options: CalculateWeightedScoreOptions = {}
): number {
  // Handle edge cases
  if (!scores || scores.length === 0) return 0;
  if (!criteria || criteria.length === 0) return 0;

  const {
    normalization = 'linear',
    roundResult = DEFAULT_SCORE_OPTIONS.roundResult,
    decimalPlaces = DEFAULT_SCORE_OPTIONS.decimalPlaces,
    skipZeroWeight = true,
  } = options;

  // Build criterion lookup for O(1) access
  const criteriaMap = new Map<string, Criterion>();
  for (const c of criteria) {
    if (skipZeroWeight && c.weight === 0) continue;
    criteriaMap.set(c.id, c);
  }

  // Calculate total weight of criteria that have weights
  let totalWeight = 0;
  criteriaMap.forEach((c) => {
    totalWeight += c.weight;
  });

  if (totalWeight === 0) return 0;

  // Calculate weighted sum
  let weightedSum = 0;

  for (const score of scores) {
    const criterion = criteriaMap.get(score.criterionId);
    if (!criterion) continue;

    // Calculate normalized score based on normalization method
    let normalizedScore: number;

    if (normalization === 'linear') {
      const range = criterion.maxScore - criterion.minScore;
      if (range === 0) continue; // Skip if min equals max

      normalizedScore = (score.score - criterion.minScore) / range;
      // Clamp to 0-1 in case score is outside valid range
      normalizedScore = Math.max(0, Math.min(1, normalizedScore));
    } else {
      // Percentile normalization would require score distribution data
      // For now, fall back to linear
      const range = criterion.maxScore - criterion.minScore;
      if (range === 0) continue;
      normalizedScore = (score.score - criterion.minScore) / range;
      normalizedScore = Math.max(0, Math.min(1, normalizedScore));
    }

    // Apply weight
    weightedSum += normalizedScore * criterion.weight;
  }

  // Calculate final score on 0-100 scale
  let result = (weightedSum / totalWeight) * 100;

  // Apply rounding
  if (roundResult) {
    const factor = Math.pow(10, decimalPlaces);
    result = Math.round(result * factor) / factor;
  }

  return result;
}

// =============================================================================
// Extended Calculation Function (with breakdown)
// =============================================================================

/**
 * Calculate weighted score with detailed breakdown of contributions.
 *
 * @param scores - Array of criterion scores
 * @param criteria - Array of criterion definitions
 * @param options - Calculation options
 * @returns Detailed result including score breakdown
 */
export function calculateWeightedScoreDetailed(
  scores: CriterionScore[],
  criteria: Criterion[],
  options: CalculateWeightedScoreOptions = {}
): WeightedScoreResult {
  // Handle edge cases
  if (!criteria || criteria.length === 0) {
    return {
      score: 0,
      scoredCount: 0,
      totalCriteria: 0,
      isComplete: true,
      breakdown: [],
    };
  }

  if (!scores || scores.length === 0) {
    return {
      score: 0,
      scoredCount: 0,
      totalCriteria: criteria.length,
      isComplete: false,
      breakdown: [],
    };
  }

  const {
    normalization = 'linear',
    roundResult = DEFAULT_SCORE_OPTIONS.roundResult,
    decimalPlaces = DEFAULT_SCORE_OPTIONS.decimalPlaces,
    skipZeroWeight = true,
  } = options;

  // Build criterion lookup
  const criteriaMap = new Map<string, Criterion>();
  for (const c of criteria) {
    criteriaMap.set(c.id, c);
  }

  // Calculate total weight
  let totalWeight = 0;
  for (const c of criteria) {
    if (skipZeroWeight && c.weight === 0) continue;
    totalWeight += c.weight;
  }

  const breakdown: CriterionBreakdown[] = [];
  let weightedSum = 0;
  let scoredCount = 0;

  for (const score of scores) {
    const criterion = criteriaMap.get(score.criterionId);
    if (!criterion) continue;
    if (skipZeroWeight && criterion.weight === 0) continue;

    scoredCount++;

    const range = criterion.maxScore - criterion.minScore;
    if (range === 0) continue;

    let normalizedScore = (score.score - criterion.minScore) / range;
    normalizedScore = Math.max(0, Math.min(1, normalizedScore));

    const contribution =
      totalWeight > 0 ? (normalizedScore * criterion.weight) / totalWeight : 0;
    weightedSum += normalizedScore * criterion.weight;

    breakdown.push({
      criterionId: criterion.id,
      criterionName: criterion.name,
      rawScore: score.score,
      normalizedScore,
      weight: criterion.weight,
      contribution: contribution * 100, // As percentage
    });
  }

  let finalScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;

  if (roundResult) {
    const factor = Math.pow(10, decimalPlaces);
    finalScore = Math.round(finalScore * factor) / factor;
  }

  // Count total criteria (excluding zero-weight if configured)
  const effectiveCriteriaCount = skipZeroWeight
    ? criteria.filter((c) => c.weight > 0).length
    : criteria.length;

  return {
    score: finalScore,
    scoredCount,
    totalCriteria: effectiveCriteriaCount,
    isComplete: scoredCount >= effectiveCriteriaCount,
    breakdown,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate the completion percentage of criteria scoring.
 *
 * @param scores - Array of criterion scores
 * @param criteria - Array of criterion definitions
 * @returns Percentage (0-100) of criteria that have been scored
 */
export function calculateScoringCompletion(
  scores: CriterionScore[],
  criteria: Criterion[]
): number {
  if (!criteria || criteria.length === 0) return 100;
  if (!scores || scores.length === 0) return 0;

  const criteriaIds = new Set(criteria.map((c) => c.id));
  const scoredIds = new Set(
    scores.filter((s) => criteriaIds.has(s.criterionId)).map((s) => s.criterionId)
  );

  return Math.round((scoredIds.size / criteria.length) * 100);
}

/**
 * Validate that all criterion scores are within their valid ranges.
 *
 * @param scores - Array of criterion scores
 * @param criteria - Array of criterion definitions
 * @returns Array of validation errors (empty if all valid)
 */
export function validateCriterionScores(
  scores: CriterionScore[],
  criteria: Criterion[]
): string[] {
  const errors: string[] = [];

  if (!scores || !criteria) return errors;

  const criteriaMap = new Map<string, Criterion>();
  for (const c of criteria) {
    criteriaMap.set(c.id, c);
  }

  for (const score of scores) {
    const criterion = criteriaMap.get(score.criterionId);

    if (!criterion) {
      errors.push(`Unknown criterion ID: ${score.criterionId}`);
      continue;
    }

    if (score.score < criterion.minScore) {
      errors.push(
        `Score ${score.score} for "${criterion.name}" is below minimum ${criterion.minScore}`
      );
    }

    if (score.score > criterion.maxScore) {
      errors.push(
        `Score ${score.score} for "${criterion.name}" is above maximum ${criterion.maxScore}`
      );
    }
  }

  return errors;
}

/**
 * Clamp a score value to the criterion's valid range.
 *
 * @param score - Raw score value
 * @param criterion - Criterion definition
 * @returns Clamped score within min/max range
 */
export function clampScore(score: number, criterion: Criterion): number {
  return Math.max(criterion.minScore, Math.min(criterion.maxScore, score));
}

/**
 * Get the weight-adjusted importance of a criterion as a percentage.
 *
 * @param criterion - Criterion to check
 * @param allCriteria - All criteria for comparison
 * @returns Percentage importance (0-100)
 */
export function getCriterionImportance(
  criterion: Criterion,
  allCriteria: Criterion[]
): number {
  const totalWeight = allCriteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;
  return Math.round((criterion.weight / totalWeight) * 100);
}
