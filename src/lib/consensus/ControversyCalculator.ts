/**
 * ControversyCalculator
 * Analyzes ranking variance and identifies controversial items
 */

import {
  ItemConsensus,
  ConsensusLevel,
  CommunityRanking,
  ConsensusTrend,
} from './types';

/**
 * Controversy metrics for an item
 */
export interface ControversyMetrics {
  itemId: string;
  controversyScore: number;
  varianceScore: number;
  polarizationScore: number;
  outlierCount: number;
  bimodalScore: number;
  consensusLevel: ConsensusLevel;
  reasoning: string[];
}

/**
 * Calculate controversy score from position distribution
 * Higher score = more controversial (more disagreement)
 */
export function calculateControversyFromDistribution(
  distribution: Map<number, number>,
  listSize: number
): number {
  if (distribution.size === 0) return 0;

  const values = Array.from(distribution.values());
  const total = values.reduce((a, b) => a + b, 0);

  if (total === 0) return 0;

  // Calculate entropy (higher entropy = more spread out = more controversial)
  let entropy = 0;
  values.forEach((count) => {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  });

  // Normalize by max possible entropy
  const maxEntropy = Math.log2(listSize);
  const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

  return Math.round(normalizedEntropy * 100);
}

/**
 * Calculate polarization score
 * High polarization = item splits opinions into distinct camps
 */
export function calculatePolarization(
  distribution: Map<number, number>,
  listSize: number
): number {
  if (distribution.size < 2) return 0;

  const positions = Array.from(distribution.keys()).sort((a, b) => a - b);
  const counts = positions.map((p) => distribution.get(p) || 0);
  const total = counts.reduce((a, b) => a + b, 0);

  if (total < 3) return 0;

  // Find peaks in distribution
  const peaks: number[] = [];
  for (let i = 1; i < counts.length - 1; i++) {
    if (counts[i] > counts[i - 1] && counts[i] > counts[i + 1]) {
      peaks.push(positions[i]);
    }
  }

  // Check edges
  if (counts[0] > counts[1]) peaks.unshift(positions[0]);
  if (counts[counts.length - 1] > counts[counts.length - 2]) {
    peaks.push(positions[positions.length - 1]);
  }

  // Polarization is higher when there are multiple distinct peaks
  if (peaks.length < 2) return 0;

  // Calculate gap between peaks
  const maxGap = peaks.reduce((maxGap, peak, i) => {
    if (i === 0) return maxGap;
    return Math.max(maxGap, peaks[i] - peaks[i - 1]);
  }, 0);

  // Normalize gap by list size
  const normalizedGap = maxGap / listSize;

  // Weight by number of peaks
  const peakFactor = Math.min(peaks.length - 1, 3) / 3;

  return Math.round(normalizedGap * peakFactor * 100);
}

/**
 * Detect bimodal distribution (two distinct opinion groups)
 */
export function calculateBimodalScore(
  distribution: Map<number, number>
): number {
  if (distribution.size < 4) return 0;

  const positions = Array.from(distribution.keys()).sort((a, b) => a - b);
  const counts = positions.map((p) => distribution.get(p) || 0);
  const total = counts.reduce((a, b) => a + b, 0);

  if (total < 5) return 0;

  // Split distribution in half and compare
  const midIndex = Math.floor(positions.length / 2);
  const lowerHalf = counts.slice(0, midIndex);
  const upperHalf = counts.slice(midIndex);

  const lowerSum = lowerHalf.reduce((a, b) => a + b, 0);
  const upperSum = upperHalf.reduce((a, b) => a + b, 0);

  // Check for a "valley" in the middle
  const middleCounts = counts.slice(
    Math.floor(midIndex * 0.8),
    Math.ceil(midIndex * 1.2)
  );
  const middleSum = middleCounts.reduce((a, b) => a + b, 0);
  const edgeSum = lowerSum + upperSum - middleSum;

  // Bimodal if middle is significantly lower than edges
  if (middleSum === 0) return 0;
  const ratio = edgeSum / middleSum;

  // Score based on how much the edges dominate
  const bimodalScore = Math.min(ratio / 3, 1) * 100;

  return Math.round(bimodalScore);
}

/**
 * Count statistical outliers using IQR method
 */
export function countOutliers(positions: number[]): number {
  if (positions.length < 4) return 0;

  const sorted = [...positions].sort((a, b) => a - b);
  const n = sorted.length;

  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);

  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return positions.filter((p) => p < lowerBound || p > upperBound).length;
}

/**
 * Generate reasoning for controversy
 */
function generateControversyReasoning(
  metrics: Omit<ControversyMetrics, 'reasoning'>
): string[] {
  const reasons: string[] = [];

  if (metrics.controversyScore >= 80) {
    reasons.push('Extremely divisive - opinions vary wildly');
  } else if (metrics.controversyScore >= 60) {
    reasons.push('Highly controversial - significant disagreement');
  } else if (metrics.controversyScore >= 40) {
    reasons.push('Moderately debated - some variation in opinions');
  }

  if (metrics.polarizationScore >= 60) {
    reasons.push('Community is split into distinct camps');
  }

  if (metrics.bimodalScore >= 50) {
    reasons.push('Two competing opinions dominate');
  }

  if (metrics.outlierCount > 3) {
    reasons.push(`${metrics.outlierCount} users ranked this very differently`);
  }

  if (reasons.length === 0) {
    reasons.push('General agreement with minor variations');
  }

  return reasons;
}

/**
 * Calculate full controversy metrics for an item
 */
export function calculateControversyMetrics(
  item: ItemConsensus,
  listSize: number
): ControversyMetrics {
  // Get positions from distribution
  const positions: number[] = [];
  item.rankDistribution.forEach((count, position) => {
    for (let i = 0; i < count; i++) {
      positions.push(position);
    }
  });

  const controversyScore = 100 - item.consensusScore;
  const varianceScore = Math.min(
    Math.round((item.positionVariance / (listSize * listSize / 12)) * 100),
    100
  );
  const polarizationScore = calculatePolarization(item.rankDistribution, listSize);
  const bimodalScore = calculateBimodalScore(item.rankDistribution);
  const outlierCount = countOutliers(positions);

  const baseMetrics = {
    itemId: item.itemId,
    controversyScore,
    varianceScore,
    polarizationScore,
    outlierCount,
    bimodalScore,
    consensusLevel: item.consensusLevel,
  };

  return {
    ...baseMetrics,
    reasoning: generateControversyReasoning(baseMetrics),
  };
}

/**
 * Rank items by controversy
 */
export function rankByControversy(
  items: ItemConsensus[],
  listSize: number
): ControversyMetrics[] {
  return items
    .map((item) => calculateControversyMetrics(item, listSize))
    .sort((a, b) => b.controversyScore - a.controversyScore);
}

/**
 * Get controversy hotspots (position ranges with high controversy)
 */
export function getControversyHotspots(
  items: ItemConsensus[],
  listSize: number,
  bucketSize = 5
): Array<{ start: number; end: number; avgControversy: number; items: string[] }> {
  const buckets = new Map<
    number,
    { totalControversy: number; count: number; items: string[] }
  >();

  // Initialize buckets
  for (let i = 0; i < listSize; i += bucketSize) {
    buckets.set(i, { totalControversy: 0, count: 0, items: [] });
  }

  // Assign items to buckets
  for (const item of items) {
    const bucketStart = Math.floor(item.averagePosition / bucketSize) * bucketSize;
    const bucket = buckets.get(bucketStart);
    if (bucket) {
      bucket.totalControversy += item.controversyScore;
      bucket.count++;
      bucket.items.push(item.itemId);
    }
  }

  // Calculate averages and format
  return Array.from(buckets.entries())
    .map(([start, data]) => ({
      start,
      end: start + bucketSize,
      avgControversy: data.count > 0 ? data.totalControversy / data.count : 0,
      items: data.items,
    }))
    .filter((h) => h.items.length > 0)
    .sort((a, b) => b.avgControversy - a.avgControversy);
}

/**
 * Find items that changed controversy level significantly
 */
export function detectControversyShifts(
  currentItems: ItemConsensus[],
  previousItems: ItemConsensus[],
  threshold = 15
): Array<{
  itemId: string;
  previousScore: number;
  currentScore: number;
  change: number;
  direction: 'more_controversial' | 'less_controversial';
}> {
  const shifts: Array<{
    itemId: string;
    previousScore: number;
    currentScore: number;
    change: number;
    direction: 'more_controversial' | 'less_controversial';
  }> = [];

  const previousMap = new Map(previousItems.map((i) => [i.itemId, i]));

  for (const current of currentItems) {
    const previous = previousMap.get(current.itemId);
    if (!previous) continue;

    const change = current.controversyScore - previous.controversyScore;
    if (Math.abs(change) >= threshold) {
      shifts.push({
        itemId: current.itemId,
        previousScore: previous.controversyScore,
        currentScore: current.controversyScore,
        change,
        direction: change > 0 ? 'more_controversial' : 'less_controversial',
      });
    }
  }

  return shifts.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

/**
 * Singleton calculator instance
 */
export const ControversyCalculator = {
  calculateFromDistribution: calculateControversyFromDistribution,
  calculatePolarization,
  calculateBimodalScore,
  countOutliers,
  calculateMetrics: calculateControversyMetrics,
  rankByControversy,
  getHotspots: getControversyHotspots,
  detectShifts: detectControversyShifts,
};

export default ControversyCalculator;
