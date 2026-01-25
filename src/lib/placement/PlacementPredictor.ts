/**
 * PlacementPredictor - Core ML/Heuristic Prediction Engine
 *
 * Predicts optimal grid positions for items based on:
 * - Item metadata (year, popularity, tags)
 * - Surrounding items in the grid
 * - User patterns (category preferences, recency bias)
 * - Community ranking data (when available)
 */

import { GridItemType } from '@/types/match';
import { BacklogItem } from '@/types/backlog-groups';

/**
 * Prediction result for a single position
 */
export interface PositionPrediction {
  position: number;
  confidence: number; // 0-1 scale
  reasons: PredictionReason[];
  score: number; // Raw score before normalization
}

/**
 * Reason for a prediction
 */
export interface PredictionReason {
  type: 'metadata' | 'pattern' | 'community' | 'neighbor' | 'category' | 'recency' | 'popularity';
  description: string;
  weight: number;
}

/**
 * Full prediction result for an item
 */
export interface PlacementPrediction {
  itemId: string;
  predictions: PositionPrediction[];
  topSuggestion: PositionPrediction | null;
  processingTimeMs: number;
}

/**
 * User pattern data for learning
 */
export interface UserPatterns {
  categoryPreferences: Map<string, number[]>; // category -> preferred positions
  recentPlacements: Array<{
    itemId: string;
    position: number;
    timestamp: number;
    category?: string;
    year?: number;
  }>;
  placementSpeed: Map<number, number>; // position -> avg time to fill
}

/**
 * Configuration for the predictor
 */
export interface PredictorConfig {
  enableMetadataScoring: boolean;
  enablePatternLearning: boolean;
  enableCommunityData: boolean;
  maxSuggestions: number;
  confidenceThreshold: number; // Minimum confidence to show suggestion
  weights: {
    metadata: number;
    pattern: number;
    community: number;
    neighbor: number;
  };
}

const DEFAULT_CONFIG: PredictorConfig = {
  enableMetadataScoring: true,
  enablePatternLearning: true,
  enableCommunityData: false, // Future feature
  maxSuggestions: 5,
  confidenceThreshold: 0.3,
  weights: {
    metadata: 0.3,
    pattern: 0.25,
    community: 0.25,
    neighbor: 0.2,
  },
};

/**
 * PlacementPredictor class - singleton for prediction engine
 */
export class PlacementPredictor {
  private config: PredictorConfig;
  private userPatterns: UserPatterns;
  private communityData: Map<string, number[]> = new Map(); // itemId -> common positions

  constructor(config: Partial<PredictorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.userPatterns = {
      categoryPreferences: new Map(),
      recentPlacements: [],
      placementSpeed: new Map(),
    };
  }

  /**
   * Predict optimal positions for an item
   */
  predict(
    item: BacklogItem,
    gridItems: GridItemType[],
    options: { excludeOccupied?: boolean } = {}
  ): PlacementPrediction {
    const startTime = performance.now();
    const predictions: PositionPrediction[] = [];

    // Get available positions
    const availablePositions = gridItems
      .map((g, idx) => ({ item: g, position: idx }))
      .filter(({ item }) => !options.excludeOccupied || !item.matched)
      .map(({ position }) => position);

    // Score each position
    for (const position of availablePositions) {
      const prediction = this.scorePosition(item, position, gridItems);
      if (prediction.confidence >= this.config.confidenceThreshold) {
        predictions.push(prediction);
      }
    }

    // Sort by confidence descending
    predictions.sort((a, b) => b.confidence - a.confidence);

    // Limit to maxSuggestions
    const topPredictions = predictions.slice(0, this.config.maxSuggestions);

    return {
      itemId: item.id,
      predictions: topPredictions,
      topSuggestion: topPredictions[0] || null,
      processingTimeMs: performance.now() - startTime,
    };
  }

  /**
   * Score a specific position for an item
   */
  private scorePosition(
    item: BacklogItem,
    position: number,
    gridItems: GridItemType[]
  ): PositionPrediction {
    const reasons: PredictionReason[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // 1. Metadata-based scoring
    if (this.config.enableMetadataScoring) {
      const metadataScore = this.calculateMetadataScore(item, position, gridItems);
      totalScore += metadataScore.score * this.config.weights.metadata;
      totalWeight += this.config.weights.metadata;
      reasons.push(...metadataScore.reasons);
    }

    // 2. Pattern-based scoring
    if (this.config.enablePatternLearning) {
      const patternScore = this.calculatePatternScore(item, position);
      totalScore += patternScore.score * this.config.weights.pattern;
      totalWeight += this.config.weights.pattern;
      reasons.push(...patternScore.reasons);
    }

    // 3. Neighbor-based scoring
    const neighborScore = this.calculateNeighborScore(item, position, gridItems);
    totalScore += neighborScore.score * this.config.weights.neighbor;
    totalWeight += this.config.weights.neighbor;
    reasons.push(...neighborScore.reasons);

    // 4. Community-based scoring (if enabled)
    if (this.config.enableCommunityData) {
      const communityScore = this.calculateCommunityScore(item, position);
      totalScore += communityScore.score * this.config.weights.community;
      totalWeight += this.config.weights.community;
      reasons.push(...communityScore.reasons);
    }

    // Normalize confidence to 0-1
    const confidence = totalWeight > 0 ? totalScore / totalWeight : 0;

    return {
      position,
      confidence: Math.max(0, Math.min(1, confidence)),
      reasons,
      score: totalScore,
    };
  }

  /**
   * Calculate score based on item metadata
   */
  private calculateMetadataScore(
    item: BacklogItem,
    position: number,
    gridItems: GridItemType[]
  ): { score: number; reasons: PredictionReason[] } {
    const reasons: PredictionReason[] = [];
    let score = 0;

    // Year-based ranking heuristic
    // Newer items or classic items (year-based) tend to rank higher
    if (item.item_year) {
      const currentYear = new Date().getFullYear();
      const age = currentYear - item.item_year;

      // Recent items (last 3 years) get bonus for top positions
      if (age <= 3 && position < 5) {
        const recentBonus = 0.3 * (1 - position / 5);
        score += recentBonus;
        reasons.push({
          type: 'recency',
          description: `Recent release (${item.item_year}) suits top positions`,
          weight: recentBonus,
        });
      }

      // Classic items (10+ years) might fit mid-tier "nostalgia" positions
      if (age >= 10 && age <= 30 && position >= 3 && position < 15) {
        const classicBonus = 0.2;
        score += classicBonus;
        reasons.push({
          type: 'metadata',
          description: `Classic item (${item.item_year}) fits nostalgia tier`,
          weight: classicBonus,
        });
      }
    }

    // Tag-based scoring - similar tags to neighbors
    if (item.tags && item.tags.length > 0) {
      const neighborTags = this.getNeighborTags(position, gridItems);
      const matchingTags = item.tags.filter(tag => neighborTags.has(tag));

      if (matchingTags.length > 0) {
        const tagBonus = 0.15 * Math.min(matchingTags.length / 3, 1);
        score += tagBonus;
        reasons.push({
          type: 'metadata',
          description: `Shares tags with neighbors: ${matchingTags.slice(0, 2).join(', ')}`,
          weight: tagBonus,
        });
      }
    }

    // Category coherence
    if (item.category) {
      const sameCategory = this.countSameCategoryNeighbors(item.category, position, gridItems);
      if (sameCategory > 0) {
        const categoryBonus = 0.1 * Math.min(sameCategory / 2, 1);
        score += categoryBonus;
        reasons.push({
          type: 'category',
          description: `Groups with ${sameCategory} similar items nearby`,
          weight: categoryBonus,
        });
      }
    }

    return { score, reasons };
  }

  /**
   * Calculate score based on user patterns
   */
  private calculatePatternScore(
    item: BacklogItem,
    position: number
  ): { score: number; reasons: PredictionReason[] } {
    const reasons: PredictionReason[] = [];
    let score = 0;

    // Check category preferences
    if (item.category && this.userPatterns.categoryPreferences.has(item.category)) {
      const preferredPositions = this.userPatterns.categoryPreferences.get(item.category)!;
      const avgPosition = preferredPositions.reduce((a, b) => a + b, 0) / preferredPositions.length;

      // Score based on proximity to average preferred position
      const distance = Math.abs(position - avgPosition);
      const maxDistance = 20;
      const proximityScore = Math.max(0, 1 - distance / maxDistance) * 0.4;

      if (proximityScore > 0.1) {
        score += proximityScore;
        reasons.push({
          type: 'pattern',
          description: `You typically place ${item.category} items around position ${Math.round(avgPosition)}`,
          weight: proximityScore,
        });
      }
    }

    // Recency bias - user tends to place recent picks in certain positions
    const recentSameCategory = this.userPatterns.recentPlacements
      .filter(p => p.category === item.category)
      .slice(-5);

    if (recentSameCategory.length >= 2) {
      const avgRecentPosition = recentSameCategory.reduce((a, b) => a + b.position, 0) / recentSameCategory.length;
      const distance = Math.abs(position - avgRecentPosition);

      if (distance <= 3) {
        const recencyBonus = 0.2 * (1 - distance / 3);
        score += recencyBonus;
        reasons.push({
          type: 'pattern',
          description: `Recent pattern suggests positions ${Math.round(avgRecentPosition - 2)}-${Math.round(avgRecentPosition + 2)}`,
          weight: recencyBonus,
        });
      }
    }

    return { score, reasons };
  }

  /**
   * Calculate score based on neighbor items
   */
  private calculateNeighborScore(
    item: BacklogItem,
    position: number,
    gridItems: GridItemType[]
  ): { score: number; reasons: PredictionReason[] } {
    const reasons: PredictionReason[] = [];
    let score = 0;

    // Get neighboring positions
    const neighbors = this.getNeighbors(position, gridItems.length);
    const filledNeighbors = neighbors
      .map(pos => gridItems[pos])
      .filter(g => g && g.matched);

    // Empty neighbors = more flexibility
    if (filledNeighbors.length === 0) {
      // First position in a section - slightly prefer
      score += 0.1;
      reasons.push({
        type: 'neighbor',
        description: 'Open section with flexibility',
        weight: 0.1,
      });
    } else {
      // Check for year proximity with neighbors
      // Note: GridItemType doesn't store year metadata, so this is a placeholder
      // for future enhancement when item metadata is available

      // Check tag overlap with neighbors
      if (item.tags && item.tags.length > 0) {
        const neighborTagSets = filledNeighbors
          .filter(n => n.tags && n.tags.length > 0)
          .map(n => new Set(n.tags));

        if (neighborTagSets.length > 0) {
          const totalOverlap = neighborTagSets.reduce((sum, tags) => {
            const overlap = item.tags!.filter(t => tags.has(t)).length;
            return sum + overlap;
          }, 0);

          const avgOverlap = totalOverlap / neighborTagSets.length;
          if (avgOverlap > 0) {
            const neighborBonus = 0.15 * Math.min(avgOverlap / 2, 1);
            score += neighborBonus;
            reasons.push({
              type: 'neighbor',
              description: `Tag affinity with ${filledNeighbors.length} neighbor(s)`,
              weight: neighborBonus,
            });
          }
        }
      }
    }

    // Position tier preference
    // Top 3 positions get special treatment
    if (position < 3) {
      // Only suggest top positions with high confidence
      score *= 0.8; // Reduce score slightly - top positions need stronger evidence
      reasons.push({
        type: 'neighbor',
        description: 'Top 3 position - requires strong match',
        weight: -0.1,
      });
    }

    return { score, reasons };
  }

  /**
   * Calculate score based on community data
   */
  private calculateCommunityScore(
    item: BacklogItem,
    position: number
  ): { score: number; reasons: PredictionReason[] } {
    const reasons: PredictionReason[] = [];
    let score = 0;

    const communityPositions = this.communityData.get(item.id);
    if (communityPositions && communityPositions.length > 0) {
      // Calculate how common this position is in community rankings
      const positionCount = communityPositions.filter(p => p === position).length;
      const frequency = positionCount / communityPositions.length;

      if (frequency > 0.1) {
        const communityBonus = 0.4 * frequency;
        score += communityBonus;
        reasons.push({
          type: 'community',
          description: `${Math.round(frequency * 100)}% of users place this at #${position + 1}`,
          weight: communityBonus,
        });
      }

      // Also check proximity to average community position
      const avgPosition = communityPositions.reduce((a, b) => a + b, 0) / communityPositions.length;
      const distance = Math.abs(position - avgPosition);

      if (distance <= 3) {
        const proximityBonus = 0.2 * (1 - distance / 3);
        score += proximityBonus;
        reasons.push({
          type: 'community',
          description: `Community average: #${Math.round(avgPosition) + 1}`,
          weight: proximityBonus,
        });
      }
    }

    return { score, reasons };
  }

  /**
   * Get neighboring positions
   */
  private getNeighbors(position: number, gridSize: number): number[] {
    const neighbors: number[] = [];

    // Direct neighbors
    if (position > 0) neighbors.push(position - 1);
    if (position < gridSize - 1) neighbors.push(position + 1);

    // For grid layouts, could include row neighbors
    // Simplified for now

    return neighbors;
  }

  /**
   * Get tags from neighboring items
   */
  private getNeighborTags(position: number, gridItems: GridItemType[]): Set<string> {
    const tags = new Set<string>();
    const neighbors = this.getNeighbors(position, gridItems.length);

    for (const neighborPos of neighbors) {
      const neighbor = gridItems[neighborPos];
      if (neighbor?.matched && neighbor.tags) {
        neighbor.tags.forEach(tag => tags.add(tag));
      }
    }

    return tags;
  }

  /**
   * Count neighbors with same category
   */
  private countSameCategoryNeighbors(
    category: string,
    position: number,
    gridItems: GridItemType[]
  ): number {
    const neighbors = this.getNeighbors(position, gridItems.length);
    // Note: GridItemType doesn't have category, would need to track this
    // This is a simplified implementation
    return 0;
  }

  /**
   * Record a placement for pattern learning
   */
  recordPlacement(item: BacklogItem, position: number): void {
    // Add to recent placements
    this.userPatterns.recentPlacements.push({
      itemId: item.id,
      position,
      timestamp: Date.now(),
      category: item.category,
      year: item.item_year,
    });

    // Keep only last 100 placements
    if (this.userPatterns.recentPlacements.length > 100) {
      this.userPatterns.recentPlacements = this.userPatterns.recentPlacements.slice(-100);
    }

    // Update category preferences
    if (item.category) {
      const positions = this.userPatterns.categoryPreferences.get(item.category) || [];
      positions.push(position);

      // Keep only last 20 positions per category
      if (positions.length > 20) {
        positions.shift();
      }

      this.userPatterns.categoryPreferences.set(item.category, positions);
    }
  }

  /**
   * Load community data (for future integration)
   */
  loadCommunityData(data: Map<string, number[]>): void {
    this.communityData = data;
  }

  /**
   * Export user patterns for persistence
   */
  exportPatterns(): UserPatterns {
    return this.userPatterns;
  }

  /**
   * Import user patterns
   */
  importPatterns(patterns: UserPatterns): void {
    this.userPatterns = patterns;
  }

  /**
   * Get quick suggestions for an item (fast path)
   */
  getQuickSuggestions(
    item: BacklogItem,
    gridItems: GridItemType[],
    limit: number = 3
  ): number[] {
    const prediction = this.predict(item, gridItems, { excludeOccupied: true });
    return prediction.predictions.slice(0, limit).map(p => p.position);
  }

  /**
   * Get the best available position for quick-place
   */
  getBestPosition(item: BacklogItem, gridItems: GridItemType[]): number | null {
    const prediction = this.predict(item, gridItems, { excludeOccupied: true });
    return prediction.topSuggestion?.position ?? null;
  }
}

// Singleton instance
let predictorInstance: PlacementPredictor | null = null;

/**
 * Get or create the predictor instance
 */
export function getPlacementPredictor(config?: Partial<PredictorConfig>): PlacementPredictor {
  if (!predictorInstance) {
    predictorInstance = new PlacementPredictor(config);
  }
  return predictorInstance;
}

/**
 * Reset the predictor instance (for testing)
 */
export function resetPlacementPredictor(): void {
  predictorInstance = null;
}
