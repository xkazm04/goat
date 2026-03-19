/**
 * UniversalRatingEngine
 *
 * Computes Universal ELO Ratings for items across all lists where they appear.
 * Uses normalized position data to create a global rating that is context-agnostic.
 */

import type {
  UniversalRating,
  ContextRating,
  RankingTrajectory,
  TrajectoryPoint,
} from './types';
import type { TierLabel, ExtendedTierLabel } from '@/lib/tiers/types';

// =============================================================================
// ELO Constants
// =============================================================================

const BASE_ELO = 1000;
const K_FACTOR = 32;
const MIN_ELO = 100;
const MAX_ELO = 2500;

// =============================================================================
// Raw Data Types (from aggregated DB/API data)
// =============================================================================

export interface RawListAppearance {
  listId: string;
  listTitle: string;
  category: string;
  position: number; // 0-based
  listSize: number;
  rankingCount: number; // how many users ranked in this list
  timestamp: number;
}

// =============================================================================
// Core Engine
// =============================================================================

/**
 * Compute the Universal ELO rating for an item from its list appearances
 */
export function computeUniversalRating(
  itemId: string,
  itemName: string,
  appearances: RawListAppearance[]
): UniversalRating {
  if (appearances.length === 0) {
    return createEmptyRating(itemId, itemName);
  }

  // Compute normalized positions (0 = top, 1 = bottom)
  const normalizedPositions = appearances.map(a => ({
    ...a,
    normalizedPosition: a.listSize > 1 ? a.position / (a.listSize - 1) : 0,
  }));

  // Compute ELO from pairwise comparisons across list contexts
  const eloScore = computeEloFromAppearances(normalizedPositions);

  // Compute average and variance
  const avgNormalized =
    normalizedPositions.reduce((sum, a) => sum + a.normalizedPosition, 0) /
    normalizedPositions.length;

  const variance =
    normalizedPositions.reduce(
      (sum, a) => sum + Math.pow(a.normalizedPosition - avgNormalized, 2),
      0
    ) / normalizedPositions.length;

  // Compute confidence based on sample size and consistency
  const sampleSizeConfidence = Math.min(1, appearances.length / 20);
  const consistencyConfidence = 1 - Math.min(1, Math.sqrt(variance) * 2);
  const totalRankings = appearances.reduce((sum, a) => sum + a.rankingCount, 0);
  const rankingVolumeConfidence = Math.min(1, totalRankings / 100);
  const confidence =
    sampleSizeConfidence * 0.3 + consistencyConfidence * 0.4 + rankingVolumeConfidence * 0.3;

  // Build context breakdown
  const contextBreakdown: ContextRating[] = normalizedPositions.map(a => ({
    listId: a.listId,
    listTitle: a.listTitle,
    category: a.category,
    position: a.position,
    listSize: a.listSize,
    normalizedPosition: a.normalizedPosition,
    tierInList: eloToTier(
      BASE_ELO + (1 - a.normalizedPosition) * (MAX_ELO - BASE_ELO) * 0.6
    ),
    rankingCount: a.rankingCount,
  }));

  return {
    itemId,
    itemName,
    eloScore,
    universalTier: eloToTier(eloScore),
    listAppearances: appearances.length,
    totalRankings,
    confidence,
    averageNormalizedPosition: avgNormalized,
    positionVariance: variance,
    contextBreakdown,
    lastComputed: Date.now(),
  };
}

/**
 * Compute ELO score from list appearances using virtual pairwise comparisons.
 * Each appearance contributes to the ELO based on how the item performed
 * relative to the expected performance for that list context.
 */
function computeEloFromAppearances(
  appearances: Array<RawListAppearance & { normalizedPosition: number }>
): number {
  let elo = BASE_ELO;

  // Sort by timestamp for chronological ELO evolution
  const sorted = [...appearances].sort((a, b) => a.timestamp - b.timestamp);

  for (const appearance of sorted) {
    // "Expected score" - based on current ELO, what position would we expect?
    const expectedNormalized = 1 - (elo - MIN_ELO) / (MAX_ELO - MIN_ELO);
    const expectedScore = Math.max(0, Math.min(1, 1 - expectedNormalized));

    // "Actual score" - how well did the item actually perform (inverted: lower position = higher score)
    const actualScore = 1 - appearance.normalizedPosition;

    // Weight by ranking count (more rankings = more reliable signal)
    const reliabilityWeight = Math.min(1, appearance.rankingCount / 50);
    const adjustedK = K_FACTOR * (0.5 + reliabilityWeight * 0.5);

    // ELO update
    elo += adjustedK * (actualScore - expectedScore);
    elo = Math.max(MIN_ELO, Math.min(MAX_ELO, elo));
  }

  return Math.round(elo);
}

/**
 * Convert ELO score to a tier label
 */
export function eloToTier(elo: number): TierLabel | ExtendedTierLabel {
  if (elo >= 2200) return 'S+';
  if (elo >= 2000) return 'S';
  if (elo >= 1850) return 'A+';
  if (elo >= 1700) return 'A';
  if (elo >= 1550) return 'A-';
  if (elo >= 1400) return 'B+';
  if (elo >= 1250) return 'B';
  if (elo >= 1100) return 'B-';
  if (elo >= 950) return 'C+';
  if (elo >= 800) return 'C';
  if (elo >= 650) return 'C-';
  if (elo >= 500) return 'D+';
  if (elo >= 350) return 'D';
  if (elo >= 200) return 'D-';
  return 'F';
}

/**
 * Compute a ranking trajectory from historical snapshots
 */
export function computeTrajectory(
  itemId: string,
  snapshots: Array<{ timestamp: number; eloScore: number; listAppearances: number }>
): RankingTrajectory {
  if (snapshots.length === 0) {
    return {
      itemId,
      dataPoints: [],
      trend: 'stable',
      velocity: 0,
      predictedElo: BASE_ELO,
    };
  }

  const sorted = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);

  const dataPoints: TrajectoryPoint[] = sorted.map(s => ({
    timestamp: s.timestamp,
    eloScore: s.eloScore,
    listAppearances: s.listAppearances,
    universalTier: eloToTier(s.eloScore),
  }));

  // Compute trend using linear regression
  const n = sorted.length;
  if (n < 2) {
    return {
      itemId,
      dataPoints,
      trend: 'stable',
      velocity: 0,
      predictedElo: sorted[0].eloScore,
    };
  }

  const xMean = sorted.reduce((s, p) => s + p.timestamp, 0) / n;
  const yMean = sorted.reduce((s, p) => s + p.eloScore, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (const point of sorted) {
    numerator += (point.timestamp - xMean) * (point.eloScore - yMean);
    denominator += Math.pow(point.timestamp - xMean, 2);
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  // Convert slope to ELO points per day
  const velocityPerDay = slope * 86400000;

  // Determine trend
  let trend: RankingTrajectory['trend'];
  if (Math.abs(velocityPerDay) < 2) {
    trend = 'stable';
  } else if (velocityPerDay > 5) {
    trend = 'rising';
  } else if (velocityPerDay < -5) {
    trend = 'falling';
  } else {
    // Check for volatility
    const recentVariance =
      sorted.slice(-5).reduce((s, p) => s + Math.pow(p.eloScore - yMean, 2), 0) /
      Math.min(5, sorted.length);
    trend = recentVariance > 10000 ? 'volatile' : velocityPerDay > 0 ? 'rising' : 'falling';
  }

  // Predict 30 days ahead
  const lastTimestamp = sorted[sorted.length - 1].timestamp;
  const predictedElo = Math.round(
    Math.max(
      MIN_ELO,
      Math.min(MAX_ELO, sorted[sorted.length - 1].eloScore + velocityPerDay * 30)
    )
  );

  return {
    itemId,
    dataPoints,
    trend,
    velocity: Math.round(velocityPerDay * 100) / 100,
    predictedElo,
  };
}

/**
 * Create an empty rating for items with no data
 */
function createEmptyRating(itemId: string, itemName: string): UniversalRating {
  return {
    itemId,
    itemName,
    eloScore: BASE_ELO,
    universalTier: 'C',
    listAppearances: 0,
    totalRankings: 0,
    confidence: 0,
    averageNormalizedPosition: 0.5,
    positionVariance: 0,
    contextBreakdown: [],
    lastComputed: Date.now(),
  };
}

/**
 * Batch compute universal ratings for multiple items
 */
export function batchComputeRatings(
  items: Array<{ itemId: string; itemName: string; appearances: RawListAppearance[] }>
): UniversalRating[] {
  return items.map(({ itemId, itemName, appearances }) =>
    computeUniversalRating(itemId, itemName, appearances)
  );
}
