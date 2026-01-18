/**
 * ConsensusDataService
 * Aggregates and manages community ranking data for consensus heatmap
 */

import {
  ItemConsensus,
  CommunityRanking,
  ConsensusLevel,
  ConsensusTrend,
  UserVsCommunityComparison,
  HeatmapCell,
  HeatIntensity,
  ConsensusBadge,
  ConsensusBadgeType,
  CONSENSUS_THRESHOLDS,
  DEFAULT_HEATMAP_COLORS,
} from './types';

/**
 * Raw ranking data from API
 */
interface RawRankingData {
  userId: string;
  itemId: string;
  position: number;
  timestamp: number;
}

/**
 * Calculate consensus level from score
 */
export function getConsensusLevel(score: number): ConsensusLevel {
  if (score >= CONSENSUS_THRESHOLDS.unanimous) return 'unanimous';
  if (score >= CONSENSUS_THRESHOLDS.strong) return 'strong';
  if (score >= CONSENSUS_THRESHOLDS.moderate) return 'moderate';
  if (score >= CONSENSUS_THRESHOLDS.mixed) return 'mixed';
  return 'controversial';
}

/**
 * Calculate consensus score from variance
 * Lower variance = higher consensus
 */
export function calculateConsensusScore(
  variance: number,
  listSize: number
): number {
  // Normalize variance to a 0-100 scale
  // Max theoretical variance for uniform distribution
  const maxVariance = Math.pow(listSize, 2) / 12;
  const normalizedVariance = Math.min(variance / maxVariance, 1);

  // Invert so higher score = more consensus
  return Math.round((1 - normalizedVariance) * 100);
}

/**
 * Calculate controversy score (inverse of consensus)
 */
export function calculateControversyScore(consensusScore: number): number {
  return 100 - consensusScore;
}

/**
 * Calculate statistics for an item's positions
 */
export function calculateItemStatistics(
  positions: number[]
): {
  average: number;
  median: number;
  mode: number;
  stdDev: number;
  variance: number;
} {
  if (positions.length === 0) {
    return { average: 0, median: 0, mode: 0, stdDev: 0, variance: 0 };
  }

  const sorted = [...positions].sort((a, b) => a - b);
  const n = positions.length;

  // Average
  const average = positions.reduce((a, b) => a + b, 0) / n;

  // Median
  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

  // Mode (most common position)
  const counts = new Map<number, number>();
  positions.forEach((p) => counts.set(p, (counts.get(p) || 0) + 1));
  let mode = positions[0];
  let maxCount = 0;
  counts.forEach((count, pos) => {
    if (count > maxCount) {
      maxCount = count;
      mode = pos;
    }
  });

  // Variance and standard deviation
  const squaredDiffs = positions.map((p) => Math.pow(p - average, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / n;
  const stdDev = Math.sqrt(variance);

  return { average, median, mode, stdDev, variance };
}

/**
 * Aggregate raw rankings into item consensus data
 */
export function aggregateRankings(
  rankings: RawRankingData[],
  listSize: number
): ItemConsensus[] {
  // Group by item
  const itemRankings = new Map<string, number[]>();

  for (const ranking of rankings) {
    if (!itemRankings.has(ranking.itemId)) {
      itemRankings.set(ranking.itemId, []);
    }
    itemRankings.get(ranking.itemId)!.push(ranking.position);
  }

  // Calculate consensus for each item
  const items: ItemConsensus[] = [];

  itemRankings.forEach((positions, itemId) => {
    const stats = calculateItemStatistics(positions);

    // Build rank distribution
    const rankDistribution = new Map<number, number>();
    positions.forEach((p) => {
      rankDistribution.set(p, (rankDistribution.get(p) || 0) + 1);
    });

    // Build percentile distribution
    const percentileDistribution: number[] = [];
    for (let i = 0; i <= 100; i++) {
      const percentileIndex = Math.floor((i / 100) * (positions.length - 1));
      percentileDistribution.push([...positions].sort((a, b) => a - b)[percentileIndex] || 0);
    }

    const consensusScore = calculateConsensusScore(stats.variance, listSize);
    const controversyScore = calculateControversyScore(consensusScore);

    items.push({
      itemId,
      averagePosition: stats.average,
      medianPosition: stats.median,
      modePosition: stats.mode,
      positionStandardDeviation: stats.stdDev,
      positionVariance: stats.variance,
      rankDistribution,
      percentileDistribution,
      consensusLevel: getConsensusLevel(consensusScore),
      consensusScore,
      controversyScore,
      sampleSize: positions.length,
      lastUpdated: Date.now(),
    });
  });

  return items;
}

/**
 * Create community ranking aggregate
 */
export function createCommunityRanking(
  listId: string,
  categoryId: string,
  items: ItemConsensus[]
): CommunityRanking {
  // Calculate overall consensus (average of all items)
  const overallConsensus =
    items.length > 0
      ? Math.round(
          items.reduce((sum, item) => sum + item.consensusScore, 0) / items.length
        )
      : 0;

  // Find most controversial (lowest consensus)
  const mostControversial = [...items]
    .sort((a, b) => b.controversyScore - a.controversyScore)
    .slice(0, 5);

  // Find most agreed upon (highest consensus)
  const mostAgreed = [...items]
    .sort((a, b) => b.consensusScore - a.consensusScore)
    .slice(0, 5);

  return {
    listId,
    categoryId,
    totalRankings: items.reduce((sum, item) => sum + item.sampleSize, 0) / items.length,
    items,
    overallConsensus,
    mostControversial,
    mostAgreed,
    lastUpdated: Date.now(),
  };
}

/**
 * Calculate heat intensity for an item
 */
export function calculateHeatIntensity(
  consensusScore: number,
  mode: 'consensus' | 'controversy' | 'variance'
): HeatIntensity {
  let value: number;

  switch (mode) {
    case 'controversy':
      value = 100 - consensusScore; // Higher = more controversial
      break;
    case 'variance':
      value = 100 - consensusScore; // Higher = more variance
      break;
    case 'consensus':
    default:
      value = consensusScore; // Higher = more consensus
  }

  return {
    min: 0,
    max: 100,
    value,
    normalized: value / 100,
  };
}

/**
 * Get heatmap color for intensity
 */
export function getHeatmapColor(
  intensity: number,
  colors: string[] = DEFAULT_HEATMAP_COLORS.gradient
): string {
  // Clamp intensity to 0-1
  const t = Math.max(0, Math.min(1, intensity));

  // Find position in gradient
  const index = t * (colors.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return colors[lowerIndex];
  }

  // Interpolate between colors
  const fraction = index - lowerIndex;
  const lowerColor = hexToRgb(colors[lowerIndex]);
  const upperColor = hexToRgb(colors[upperIndex]);

  const r = Math.round(lowerColor.r + (upperColor.r - lowerColor.r) * fraction);
  const g = Math.round(lowerColor.g + (upperColor.g - lowerColor.g) * fraction);
  const b = Math.round(lowerColor.b + (upperColor.b - lowerColor.b) * fraction);

  return rgbToHex(r, g, b);
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Determine badge for an item
 */
export function determineBadge(
  item: ItemConsensus,
  allItems: ItemConsensus[],
  userPosition?: number
): ConsensusBadge | undefined {
  // Check for consensus king (highest consensus in top 10%)
  const sortedByConsensus = [...allItems].sort(
    (a, b) => b.consensusScore - a.consensusScore
  );
  const topConsensus = sortedByConsensus.slice(
    0,
    Math.ceil(allItems.length * 0.1)
  );

  if (topConsensus.some((i) => i.itemId === item.itemId) && item.averagePosition < 5) {
    return {
      type: 'consensus-king',
      label: 'Consensus King',
      color: '#22c55e',
      icon: '👑',
      tooltip: 'Community overwhelmingly agrees on this ranking',
    };
  }

  // Check for hot debate (most controversial)
  const sortedByControversy = [...allItems].sort(
    (a, b) => b.controversyScore - a.controversyScore
  );
  const topControversial = sortedByControversy.slice(
    0,
    Math.ceil(allItems.length * 0.1)
  );

  if (topControversial.some((i) => i.itemId === item.itemId)) {
    return {
      type: 'hot-debate',
      label: 'Hot Debate',
      color: '#ef4444',
      icon: '🔥',
      tooltip: 'Community is divided on this ranking',
    };
  }

  // Check for user comparison badges
  if (userPosition !== undefined) {
    const diff = Math.abs(userPosition - item.averagePosition);

    // Your pick matches community
    if (diff < 2) {
      return {
        type: 'your-pick',
        label: 'Your Pick',
        color: '#8b5cf6',
        icon: '✓',
        tooltip: 'Your ranking matches the community',
      };
    }

    // Outlier - user significantly differs
    if (diff > 10) {
      return {
        type: 'outlier',
        label: 'Outlier',
        color: '#f59e0b',
        icon: '⚡',
        tooltip: `You ranked this ${diff > 0 ? 'higher' : 'lower'} than most`,
      };
    }
  }

  // Hidden gem - low awareness but high rating when picked
  if (item.sampleSize < allItems.length * 0.3 && item.averagePosition < 10) {
    return {
      type: 'hidden-gem',
      label: 'Hidden Gem',
      color: '#06b6d4',
      icon: '💎',
      tooltip: 'Underrated by the community',
    };
  }

  return undefined;
}

/**
 * Generate heatmap cells from community data
 */
export function generateHeatmapCells(
  community: CommunityRanking,
  mode: 'consensus' | 'controversy' | 'variance' | 'yourPick',
  userPositions?: Map<string, number>,
  colorGradient: string[] = DEFAULT_HEATMAP_COLORS.gradient
): HeatmapCell[] {
  const cells: HeatmapCell[] = [];

  for (const item of community.items) {
    const userPos = userPositions?.get(item.itemId);
    let intensityValue: number;

    switch (mode) {
      case 'controversy':
        intensityValue = item.controversyScore / 100;
        break;
      case 'yourPick':
        if (userPos !== undefined) {
          const diff = Math.abs(userPos - item.averagePosition);
          intensityValue = Math.min(diff / 20, 1); // Normalize diff
        } else {
          intensityValue = 0.5;
        }
        break;
      case 'variance':
        intensityValue = 1 - item.consensusScore / 100;
        break;
      case 'consensus':
      default:
        intensityValue = item.consensusScore / 100;
    }

    const intensity: HeatIntensity = {
      min: 0,
      max: 100,
      value: intensityValue * 100,
      normalized: intensityValue,
    };

    // Invert for consensus mode (high consensus = green at start of gradient)
    const colorIntensity =
      mode === 'consensus' ? 1 - intensityValue : intensityValue;

    cells.push({
      position: Math.round(item.averagePosition),
      itemId: item.itemId,
      intensity,
      color: getHeatmapColor(colorIntensity, colorGradient),
      consensusLevel: item.consensusLevel,
      badge: determineBadge(item, community.items, userPos),
    });
  }

  return cells;
}

/**
 * Compare user ranking to community
 */
export function compareUserToCommunity(
  userId: string,
  listId: string,
  userPositions: Map<string, number>,
  community: CommunityRanking
): UserVsCommunityComparison {
  const differences: UserVsCommunityComparison['differences'] = [];
  const agreements: string[] = [];
  const outliers: string[] = [];
  const controversial: string[] = [];

  let matchingPositions = 0;
  let totalDiff = 0;

  for (const item of community.items) {
    const userPos = userPositions.get(item.itemId);
    if (userPos === undefined) continue;

    const positionDiff = userPos - item.averagePosition;
    const absDiff = Math.abs(positionDiff);

    differences.push({
      itemId: item.itemId,
      userPosition: userPos,
      communityPosition: item.averagePosition,
      positionDiff,
      consensusLevel: item.consensusLevel,
    });

    totalDiff += absDiff;

    // Categorize
    if (absDiff < 2) {
      matchingPositions++;
      agreements.push(item.itemId);
    }

    if (absDiff > 10) {
      outliers.push(item.itemId);
    }

    if (item.consensusLevel === 'controversial' || item.consensusLevel === 'mixed') {
      controversial.push(item.itemId);
    }
  }

  // Calculate agreement score (100 = perfect match)
  const maxPossibleDiff = community.items.length * 50; // Max average diff
  const agreementScore = Math.round(
    Math.max(0, 100 - (totalDiff / maxPossibleDiff) * 100)
  );

  return {
    userId,
    listId,
    agreementScore,
    matchingPositions,
    totalItems: differences.length,
    differences: differences.sort((a, b) => Math.abs(b.positionDiff) - Math.abs(a.positionDiff)),
    agreements,
    outliers,
    controversial,
  };
}

/**
 * Singleton service instance
 */
class ConsensusDataServiceImpl {
  private cache: Map<string, CommunityRanking> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute

  /**
   * Get community ranking for a list
   */
  async getCommunityRanking(
    listId: string,
    categoryId: string,
    forceRefresh = false
  ): Promise<CommunityRanking | null> {
    const cacheKey = `${listId}-${categoryId}`;

    // Check cache
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      const expiry = this.cacheExpiry.get(cacheKey);
      if (cached && expiry && Date.now() < expiry) {
        return cached;
      }
    }

    try {
      // Fetch from API
      const response = await fetch(`/api/consensus/${listId}?category=${categoryId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch consensus data');
      }

      const data = await response.json();

      // Cache result
      this.cache.set(cacheKey, data);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);

      return data;
    } catch (error) {
      console.error('Failed to get community ranking:', error);
      return null;
    }
  }

  /**
   * Submit user ranking to community aggregate
   */
  async submitRanking(
    listId: string,
    userId: string,
    positions: Map<string, number>
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/consensus/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId,
          userId,
          rankings: Array.from(positions.entries()).map(([itemId, position]) => ({
            itemId,
            position,
          })),
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to submit ranking:', error);
      return false;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

// Export singleton
export const ConsensusDataService = new ConsensusDataServiceImpl();
export default ConsensusDataService;
