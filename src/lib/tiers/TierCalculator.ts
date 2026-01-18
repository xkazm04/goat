/**
 * TierCalculator
 * Algorithms for automatic tier boundary detection and classification
 */

import {
  TierDefinition,
  TierPreset,
  TieredItem,
  TierBoundary,
  TierSummary,
  TierStats,
  TierAlgorithm,
  TierSuggestion,
  AlgorithmConfig,
} from './types';
import { TIER_COLORS, TIER_DESCRIPTIONS, getBestPresetForSize, TIER_PRESETS } from './constants';

/**
 * Calculate tier boundaries using specified algorithm
 */
export function calculateTierBoundaries(
  listSize: number,
  tierCount: number,
  algorithm: TierAlgorithm = 'equal',
  params: Record<string, number> = {}
): number[] {
  switch (algorithm) {
    case 'equal':
      return calculateEqualBoundaries(listSize, tierCount);
    case 'pyramid':
      return calculatePyramidBoundaries(listSize, tierCount);
    case 'bell':
      return calculateBellBoundaries(listSize, tierCount);
    case 'kmeans':
      return calculateKMeansBoundaries(listSize, tierCount, params.iterations || 10);
    case 'percentile':
      return calculatePercentileBoundaries(listSize, tierCount, params);
    case 'custom':
      return params.boundaries ? (params.boundaries as unknown as number[]) : calculateEqualBoundaries(listSize, tierCount);
    default:
      return calculateEqualBoundaries(listSize, tierCount);
  }
}

/**
 * Equal division of positions
 */
function calculateEqualBoundaries(listSize: number, tierCount: number): number[] {
  const boundaries: number[] = [0];
  const tierSize = Math.ceil(listSize / tierCount);

  for (let i = 1; i < tierCount; i++) {
    boundaries.push(Math.min(i * tierSize, listSize));
  }
  boundaries.push(listSize);

  return boundaries;
}

/**
 * Pyramid distribution (fewer items at top)
 * Follows exponential growth: each tier is ~1.5-2x larger than the previous
 */
function calculatePyramidBoundaries(listSize: number, tierCount: number): number[] {
  const boundaries: number[] = [0];
  const ratio = 1.6; // Growth ratio between tiers

  // Calculate total weight
  let totalWeight = 0;
  for (let i = 0; i < tierCount; i++) {
    totalWeight += Math.pow(ratio, i);
  }

  // Calculate boundaries based on weights
  let accumulated = 0;
  for (let i = 0; i < tierCount - 1; i++) {
    const weight = Math.pow(ratio, i);
    accumulated += weight;
    const boundary = Math.round((accumulated / totalWeight) * listSize);
    boundaries.push(Math.min(boundary, listSize));
  }
  boundaries.push(listSize);

  return boundaries;
}

/**
 * Bell curve distribution (most items in middle tiers)
 */
function calculateBellBoundaries(listSize: number, tierCount: number): number[] {
  const boundaries: number[] = [0];
  const midPoint = tierCount / 2;

  // Calculate weights using normal distribution approximation
  const weights: number[] = [];
  for (let i = 0; i < tierCount; i++) {
    const distance = Math.abs(i - midPoint);
    const weight = Math.exp(-0.5 * Math.pow(distance / (tierCount / 3), 2));
    weights.push(weight);
  }

  // Normalize weights
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const normalizedWeights = weights.map(w => w / totalWeight);

  // Calculate boundaries
  let accumulated = 0;
  for (let i = 0; i < tierCount - 1; i++) {
    accumulated += normalizedWeights[i];
    const boundary = Math.round(accumulated * listSize);
    boundaries.push(Math.min(boundary, listSize));
  }
  boundaries.push(listSize);

  return boundaries;
}

/**
 * K-means inspired clustering for natural boundaries
 * Simulates finding "natural" breaks in the ranking
 */
function calculateKMeansBoundaries(
  listSize: number,
  tierCount: number,
  iterations: number = 10
): number[] {
  // Initialize centroids evenly
  let centroids: number[] = [];
  for (let i = 0; i < tierCount; i++) {
    centroids.push(((i + 0.5) / tierCount) * listSize);
  }

  // Simulate K-means iterations
  for (let iter = 0; iter < iterations; iter++) {
    // Calculate new centroids based on cluster assignments
    const clusters: number[][] = Array(tierCount).fill(null).map(() => []);

    // Assign each position to nearest centroid
    for (let pos = 0; pos < listSize; pos++) {
      let nearestIdx = 0;
      let nearestDist = Math.abs(pos - centroids[0]);

      for (let c = 1; c < centroids.length; c++) {
        const dist = Math.abs(pos - centroids[c]);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = c;
        }
      }
      clusters[nearestIdx].push(pos);
    }

    // Update centroids
    for (let c = 0; c < tierCount; c++) {
      if (clusters[c].length > 0) {
        centroids[c] = clusters[c].reduce((a, b) => a + b, 0) / clusters[c].length;
      }
    }
  }

  // Convert centroids to boundaries (midpoints between centroids)
  centroids.sort((a, b) => a - b);
  const boundaries: number[] = [0];

  for (let i = 0; i < centroids.length - 1; i++) {
    const boundary = Math.round((centroids[i] + centroids[i + 1]) / 2);
    boundaries.push(Math.min(boundary, listSize));
  }
  boundaries.push(listSize);

  return boundaries;
}

/**
 * Percentile-based boundaries
 * Allows custom percentile splits
 */
function calculatePercentileBoundaries(
  listSize: number,
  tierCount: number,
  params: Record<string, number> = {}
): number[] {
  // Default percentiles for different tier counts
  const defaultPercentiles: Record<number, number[]> = {
    3: [10, 40],
    4: [10, 30, 60],
    5: [5, 15, 35, 65],
    6: [5, 12, 25, 45, 70],
    9: [3, 8, 15, 25, 40, 55, 70, 85],
  };

  const percentiles = defaultPercentiles[tierCount] || calculateEqualBoundaries(100, tierCount).slice(1, -1);

  const boundaries: number[] = [0];
  for (const percentile of percentiles) {
    const boundary = Math.round((percentile / 100) * listSize);
    boundaries.push(Math.min(boundary, listSize));
  }
  boundaries.push(listSize);

  return boundaries;
}

/**
 * Create tier definitions from boundaries
 */
export function createTiersFromBoundaries(
  boundaries: number[],
  preset: TierPreset
): TierDefinition[] {
  const tiers: TierDefinition[] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    if (i < preset.tiers.length) {
      tiers.push({
        ...preset.tiers[i],
        startPosition: boundaries[i],
        endPosition: boundaries[i + 1],
      });
    }
  }

  return tiers;
}

/**
 * Adjust preset tiers to fit a specific list size
 */
export function adjustPresetToSize(preset: TierPreset, listSize: number): TierPreset {
  const scaleFactor = listSize / preset.listSizeRange.max;

  const adjustedTiers = preset.tiers.map((tier, index) => {
    const isLast = index === preset.tiers.length - 1;
    return {
      ...tier,
      startPosition: Math.round(tier.startPosition * scaleFactor),
      endPosition: isLast ? listSize : Math.round(tier.endPosition * scaleFactor),
    };
  });

  return {
    ...preset,
    tiers: adjustedTiers,
    listSizeRange: { min: listSize, max: listSize },
  };
}

/**
 * Get tier for a specific position
 */
export function getTierForPosition(position: number, tiers: TierDefinition[]): TierDefinition | null {
  for (const tier of tiers) {
    if (position >= tier.startPosition && position < tier.endPosition) {
      return tier;
    }
  }
  return tiers[tiers.length - 1] || null;
}

/**
 * Calculate tier boundaries from tier definitions
 */
export function extractBoundaries(tiers: TierDefinition[]): TierBoundary[] {
  const boundaries: TierBoundary[] = [];

  for (let i = 0; i < tiers.length - 1; i++) {
    boundaries.push({
      position: tiers[i].endPosition,
      tierAbove: tiers[i],
      tierBelow: tiers[i + 1],
      isCustomized: false,
    });
  }

  return boundaries;
}

/**
 * Assign tiers to items
 */
export function assignTiersToItems(
  filledPositions: Array<{ itemId: string; position: number }>,
  tiers: TierDefinition[]
): TieredItem[] {
  const tieredItems: TieredItem[] = [];
  const tierCounts = new Map<string, number>();

  // Initialize tier counts
  for (const tier of tiers) {
    tierCounts.set(tier.id, 0);
  }

  // Sort by position
  const sorted = [...filledPositions].sort((a, b) => a.position - b.position);
  const total = sorted.length;

  for (const item of sorted) {
    const tier = getTierForPosition(item.position, tiers);
    if (tier) {
      const currentCount = tierCounts.get(tier.id) || 0;
      tierCounts.set(tier.id, currentCount + 1);

      tieredItems.push({
        itemId: item.itemId,
        position: item.position,
        tier,
        percentile: total > 0 ? Math.round(((total - item.position - 1) / total) * 100) : 0,
        tierRank: currentCount + 1,
      });
    }
  }

  return tieredItems;
}

/**
 * Calculate tier statistics
 */
export function calculateTierStats(
  tiers: TierDefinition[],
  tieredItems: TieredItem[]
): TierStats[] {
  return tiers.map(tier => {
    const items = tieredItems.filter(item => item.tier.id === tier.id);
    const tierSize = tier.endPosition - tier.startPosition;

    return {
      tier,
      itemCount: tierSize,
      filledCount: items.length,
      emptyCount: tierSize - items.length,
      percentage: tierSize > 0 ? Math.round((items.length / tierSize) * 100) : 0,
      averagePosition: items.length > 0
        ? items.reduce((sum, item) => sum + item.position, 0) / items.length
        : (tier.startPosition + tier.endPosition) / 2,
    };
  });
}

/**
 * Calculate overall tier summary
 */
export function calculateTierSummary(
  tiers: TierDefinition[],
  tieredItems: TieredItem[],
  listSize: number
): TierSummary {
  const tierStats = calculateTierStats(tiers, tieredItems);

  // Calculate distribution
  const distribution = new Map<string, number>();
  for (const item of tieredItems) {
    const current = distribution.get(item.tier.id) || 0;
    distribution.set(item.tier.id, current + 1);
  }

  // Find dominant tier
  let dominantTier: TierDefinition | null = null;
  let maxCount = 0;
  for (const stat of tierStats) {
    if (stat.filledCount > maxCount) {
      maxCount = stat.filledCount;
      dominantTier = stat.tier;
    }
  }

  // Calculate balance score (entropy-based)
  const counts = tierStats.map(s => s.filledCount);
  const total = counts.reduce((a, b) => a + b, 0);
  let entropy = 0;
  if (total > 0) {
    for (const count of counts) {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
    }
    // Normalize to 0-100
    const maxEntropy = Math.log2(tiers.length);
    entropy = maxEntropy > 0 ? (entropy / maxEntropy) * 100 : 0;
  }

  return {
    totalItems: listSize,
    tieredItems: tieredItems.length,
    tierStats,
    distribution,
    dominantTier,
    balanceScore: Math.round(entropy),
  };
}

/**
 * Generate tier suggestions using different algorithms
 */
export function generateTierSuggestions(
  listSize: number,
  filledPositions: number[],
  tierCount: number = 5
): TierSuggestion[] {
  const suggestions: TierSuggestion[] = [];

  // Algorithm 1: Equal distribution
  const equalBoundaries = calculateTierBoundaries(listSize, tierCount, 'equal');
  suggestions.push({
    boundaries: equalBoundaries,
    confidence: 70,
    reasoning: 'Equal distribution ensures balanced tier sizes',
    algorithm: 'equal',
  });

  // Algorithm 2: Pyramid (fewer at top)
  const pyramidBoundaries = calculateTierBoundaries(listSize, tierCount, 'pyramid');
  suggestions.push({
    boundaries: pyramidBoundaries,
    confidence: 85,
    reasoning: 'Pyramid structure reflects natural ranking distributions where elite items are rare',
    algorithm: 'pyramid',
  });

  // Algorithm 3: K-means clustering
  if (filledPositions.length >= tierCount) {
    const kmeansBoundaries = calculateTierBoundaries(listSize, tierCount, 'kmeans', { iterations: 15 });
    suggestions.push({
      boundaries: kmeansBoundaries,
      confidence: 80,
      reasoning: 'K-means finds natural groupings based on position clusters',
      algorithm: 'kmeans',
    });
  }

  // Algorithm 4: Percentile-based
  const percentileBoundaries = calculateTierBoundaries(listSize, tierCount, 'percentile');
  suggestions.push({
    boundaries: percentileBoundaries,
    confidence: 75,
    reasoning: 'Percentile-based ensures top percentages in top tiers',
    algorithm: 'percentile',
  });

  // Sort by confidence
  suggestions.sort((a, b) => b.confidence - a.confidence);

  return suggestions;
}

/**
 * Smart tier calculator that chooses the best approach
 */
export function smartCalculateTiers(
  listSize: number,
  filledPositions: Array<{ itemId: string; position: number }>
): {
  preset: TierPreset;
  tiers: TierDefinition[];
  tieredItems: TieredItem[];
  summary: TierSummary;
  suggestions: TierSuggestion[];
} {
  // Get best preset for size
  const basePreset = getBestPresetForSize(listSize);

  // Adjust to actual list size
  const adjustedPreset = adjustPresetToSize(basePreset, listSize);

  // Get suggestions
  const suggestions = generateTierSuggestions(
    listSize,
    filledPositions.map(p => p.position),
    adjustedPreset.tierCount
  );

  // Use the best suggestion (highest confidence)
  const bestSuggestion = suggestions[0];
  const tiers = createTiersFromBoundaries(bestSuggestion.boundaries, adjustedPreset);

  // Assign items to tiers
  const tieredItems = assignTiersToItems(filledPositions, tiers);

  // Calculate summary
  const summary = calculateTierSummary(tiers, tieredItems, listSize);

  return {
    preset: adjustedPreset,
    tiers,
    tieredItems,
    summary,
    suggestions,
  };
}

/**
 * Singleton instance
 */
let calculatorInstance: typeof TierCalculator | null = null;

export const TierCalculator = {
  calculateBoundaries: calculateTierBoundaries,
  createTiers: createTiersFromBoundaries,
  adjustPreset: adjustPresetToSize,
  getTierForPosition,
  extractBoundaries,
  assignTiersToItems,
  calculateStats: calculateTierStats,
  calculateSummary: calculateTierSummary,
  generateSuggestions: generateTierSuggestions,
  smartCalculate: smartCalculateTiers,
};

export function getTierCalculator() {
  if (!calculatorInstance) {
    calculatorInstance = TierCalculator;
  }
  return calculatorInstance;
}

export default TierCalculator;
