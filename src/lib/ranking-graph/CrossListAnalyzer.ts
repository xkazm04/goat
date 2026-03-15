/**
 * CrossListAnalyzer
 *
 * Generates cross-list insights, detects anomalies in user rankings,
 * and produces placement suggestions based on universal consensus.
 */

import type {
  UniversalRating,
  CrossListInsight,
  RankingAnomaly,
  PlacementSuggestion,
} from './types';
import { eloToTier } from './UniversalRatingEngine';

// =============================================================================
// Cross-List Insights
// =============================================================================

/**
 * Generate insights for an item based on its cross-list performance
 */
export function generateCrossListInsights(rating: UniversalRating): CrossListInsight[] {
  const insights: CrossListInsight[] = [];

  if (rating.listAppearances < 2) return insights;

  // Insight: Tier consistency
  const tierConsistency = analyzeTierConsistency(rating);
  if (tierConsistency) insights.push(tierConsistency);

  // Insight: Context drops/spikes
  const contextVariations = analyzeContextVariations(rating);
  insights.push(...contextVariations);

  // Insight: Niche favorite
  const nicheFavorite = analyzeNicheFavorite(rating);
  if (nicheFavorite) insights.push(nicheFavorite);

  // Insight: Universal top performer
  const universalTop = analyzeUniversalTop(rating);
  if (universalTop) insights.push(universalTop);

  // Sort by strength
  insights.sort((a, b) => b.strength - a.strength);

  return insights;
}

function analyzeTierConsistency(rating: UniversalRating): CrossListInsight | null {
  if (rating.contextBreakdown.length < 3) return null;

  const tiers = rating.contextBreakdown.map(c => c.tierInList);
  const uniqueTiers = new Set(tiers);

  if (uniqueTiers.size <= 2 && rating.listAppearances >= 5) {
    const tierStr = Array.from(uniqueTiers).join('/');
    return {
      type: 'tier_consistency',
      title: `Consistently ${tierStr}`,
      description: `${rating.itemName} averages Tier ${rating.universalTier} across ${rating.listAppearances} lists with remarkably low variance.`,
      data: {
        averageTier: String(rating.universalTier),
        totalLists: rating.listAppearances,
      },
      strength: 0.9 - rating.positionVariance,
    };
  }

  return null;
}

function analyzeContextVariations(rating: UniversalRating): CrossListInsight[] {
  const insights: CrossListInsight[] = [];
  const avgNorm = rating.averageNormalizedPosition;

  for (const context of rating.contextBreakdown) {
    const deviation = context.normalizedPosition - avgNorm;

    // Significant drop (ranked much lower than average)
    if (deviation > 0.3 && rating.listAppearances >= 3) {
      insights.push({
        type: 'context_drop',
        title: `Drops in "${context.listTitle}"`,
        description: `${rating.itemName} drops to Tier ${context.tierInList} in "${context.listTitle}" but averages Tier ${rating.universalTier} elsewhere.`,
        data: {
          dropContext: context.listTitle,
          dropTier: String(context.tierInList),
          averageTier: String(rating.universalTier),
        },
        strength: Math.min(1, deviation * 1.5),
      });
    }

    // Significant spike (ranked much higher than average)
    if (deviation < -0.3 && rating.listAppearances >= 3) {
      insights.push({
        type: 'context_spike',
        title: `Spikes in "${context.listTitle}"`,
        description: `${rating.itemName} jumps to Tier ${context.tierInList} in "${context.listTitle}" — significantly above its average of Tier ${rating.universalTier}.`,
        data: {
          spikeContext: context.listTitle,
          spikeTier: String(context.tierInList),
          averageTier: String(rating.universalTier),
        },
        strength: Math.min(1, Math.abs(deviation) * 1.5),
      });
    }
  }

  return insights;
}

function analyzeNicheFavorite(rating: UniversalRating): CrossListInsight | null {
  // Group by category
  const categoryPerformance = new Map<string, number[]>();
  for (const context of rating.contextBreakdown) {
    const positions = categoryPerformance.get(context.category) || [];
    positions.push(context.normalizedPosition);
    categoryPerformance.set(context.category, positions);
  }

  // Find category where item performs significantly better
  const categories = Array.from(categoryPerformance.keys());
  for (const category of categories) {
    const positions = categoryPerformance.get(category)!;
    const catAvg = positions.reduce((s: number, p: number) => s + p, 0) / positions.length;
    if (catAvg < rating.averageNormalizedPosition - 0.2 && positions.length >= 2) {
      return {
        type: 'niche_favorite',
        title: `Niche favorite in ${category}`,
        description: `${rating.itemName} ranks significantly higher in ${category} lists compared to other contexts.`,
        data: {
          nicheCategory: category,
          averageTier: String(rating.universalTier),
        },
        strength: Math.min(1, (rating.averageNormalizedPosition - catAvg) * 2),
      };
    }
  }

  return null;
}

function analyzeUniversalTop(rating: UniversalRating): CrossListInsight | null {
  if (
    rating.averageNormalizedPosition < 0.1 &&
    rating.listAppearances >= 5 &&
    rating.confidence > 0.7
  ) {
    return {
      type: 'universal_top',
      title: 'Universal Top Performer',
      description: `${rating.itemName} consistently ranks in the top 10% across ${rating.listAppearances} lists with high confidence.`,
      data: {
        averageTier: String(rating.universalTier),
        totalLists: rating.listAppearances,
      },
      strength: 0.95,
    };
  }

  return null;
}

// =============================================================================
// Anomaly Detection
// =============================================================================

/**
 * Detect anomalies between a user's rankings and universal consensus.
 *
 * @param userPositions - Map of itemId -> user's position (0-based)
 * @param listSize - Size of the user's list
 * @param universalRatings - Universal ratings for items in the list
 * @param anomalyThreshold - Minimum anomaly score to report (0-1, default 0.3)
 */
export function detectAnomalies(
  userPositions: Record<string, number>,
  listSize: number,
  universalRatings: Record<string, UniversalRating>,
  anomalyThreshold: number = 0.3
): RankingAnomaly[] {
  const anomalies: RankingAnomaly[] = [];

  for (const [itemId, userPosition] of Object.entries(userPositions)) {
    const rating = universalRatings[itemId];
    if (!rating || rating.listAppearances < 3) continue;

    const userNorm = listSize > 1 ? userPosition / (listSize - 1) : 0;
    const consensusNorm = rating.averageNormalizedPosition;
    const deviation = Math.abs(userNorm - consensusNorm);

    // Score anomaly based on deviation and confidence in the consensus
    const anomalyScore = deviation * rating.confidence;

    if (anomalyScore >= anomalyThreshold) {
      const direction = userNorm < consensusNorm ? 'ranked_higher' : 'ranked_lower';

      // Calculate percentile (how extreme this ranking is)
      // Using a simple normal approximation
      const stdDev = Math.sqrt(rating.positionVariance);
      const zScore = stdDev > 0 ? Math.abs(userNorm - consensusNorm) / stdDev : 0;
      const percentile = Math.max(1, Math.round((1 - erf(zScore / Math.sqrt(2))) * 50));

      const reasoning = generateAnomalyReasoning(
        rating.itemName,
        direction,
        percentile,
        rating.universalTier,
        rating.listAppearances
      );

      anomalies.push({
        itemId,
        itemName: rating.itemName,
        userPosition,
        userListSize: listSize,
        consensusNormalizedPosition: consensusNorm,
        userNormalizedPosition: userNorm,
        anomalyScore,
        percentile,
        direction,
        reasoning,
      });
    }
  }

  // Sort by anomaly score descending
  anomalies.sort((a, b) => b.anomalyScore - a.anomalyScore);

  return anomalies;
}

/**
 * Generate human-readable reasoning for an anomaly
 */
function generateAnomalyReasoning(
  itemName: string,
  direction: 'ranked_higher' | 'ranked_lower',
  percentile: number,
  universalTier: string,
  listCount: number
): string {
  if (direction === 'ranked_higher') {
    return `You ranked ${itemName} higher than ${100 - percentile}% of users. Across ${listCount} lists, it typically lands in Tier ${universalTier}. Your ranking suggests you value it more than the community consensus.`;
  }
  return `Your ranking of ${itemName} is in the bottom ${percentile}% compared to other users. Across ${listCount} lists, it averages Tier ${universalTier}. Most people rank it significantly higher.`;
}

// =============================================================================
// Placement Suggestions
// =============================================================================

/**
 * Generate placement suggestions for items in a list based on cross-list consensus.
 *
 * @param availableItems - Items that could be placed (with their universal ratings)
 * @param listSize - Size of the target list
 * @param alreadyPlaced - Items already placed (itemId -> position)
 */
export function generatePlacementSuggestions(
  availableItems: UniversalRating[],
  listSize: number,
  alreadyPlaced: Record<string, number> = {}
): PlacementSuggestion[] {
  const placedIds = new Set(Object.keys(alreadyPlaced));

  // Filter to unplaced items with sufficient data
  const candidates = availableItems
    .filter(r => !placedIds.has(r.itemId) && r.listAppearances >= 2 && r.confidence > 0.3)
    .sort((a, b) => a.averageNormalizedPosition - b.averageNormalizedPosition);

  // Find available positions
  const usedPositions = new Set(Object.values(alreadyPlaced));
  const availablePositions: number[] = [];
  for (let i = 0; i < listSize; i++) {
    if (!usedPositions.has(i)) {
      availablePositions.push(i);
    }
  }

  const suggestions: PlacementSuggestion[] = [];

  for (const candidate of candidates) {
    if (availablePositions.length === 0) break;

    // Find the best position based on normalized consensus position
    const targetPosition = Math.round(candidate.averageNormalizedPosition * (listSize - 1));
    const closestAvailable = findClosestPosition(targetPosition, availablePositions);

    if (closestAvailable !== null) {
      suggestions.push({
        itemId: candidate.itemId,
        itemName: candidate.itemName,
        suggestedPosition: closestAvailable,
        confidence: candidate.confidence,
        dataPoints: candidate.totalRankings,
        reasoning: `Based on ${candidate.listAppearances} list appearances and ${candidate.totalRankings} total rankings, ${candidate.itemName} typically ranks in Tier ${candidate.universalTier}.`,
        expectedTier: candidate.universalTier,
      });

      // Remove used position
      const idx = availablePositions.indexOf(closestAvailable);
      if (idx !== -1) availablePositions.splice(idx, 1);
    }
  }

  // Sort by confidence descending
  suggestions.sort((a, b) => b.confidence - a.confidence);

  return suggestions;
}

/**
 * Find the closest available position to a target
 */
function findClosestPosition(target: number, available: number[]): number | null {
  if (available.length === 0) return null;

  let closest = available[0];
  let minDist = Math.abs(target - closest);

  for (const pos of available) {
    const dist = Math.abs(target - pos);
    if (dist < minDist) {
      minDist = dist;
      closest = pos;
    }
  }

  return closest;
}

// =============================================================================
// Utility: Error Function approximation for percentile calculation
// =============================================================================

/**
 * Approximation of the error function (erf)
 * Used for converting z-scores to percentiles
 */
function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}
