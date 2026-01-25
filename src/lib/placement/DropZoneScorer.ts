/**
 * DropZoneScorer - Visual Confidence Scoring for Grid Positions
 *
 * Calculates and provides visual indicators for drop zone confidence:
 * - Color intensity based on confidence level
 * - Real-time scoring during drag operations
 * - Efficient caching for performance
 */

import { GridItemType } from '@/types/match';
import { BacklogItem } from '@/types/backlog-groups';
import {
  PlacementPredictor,
  PositionPrediction,
  getPlacementPredictor,
} from './PlacementPredictor';

/**
 * Visual indicator for a drop zone
 */
export interface DropZoneIndicator {
  position: number;
  confidence: number;
  color: DropZoneColor;
  intensity: number; // 0-1 for opacity/glow
  label: string;
  shortReason?: string;
  isTopSuggestion: boolean;
}

/**
 * Color categories for drop zones
 */
export type DropZoneColor = 'green' | 'yellow' | 'orange' | 'gray' | 'blue';

/**
 * Scorer configuration
 */
export interface DropZoneScorerConfig {
  highConfidenceThreshold: number; // >= this = green
  mediumConfidenceThreshold: number; // >= this = yellow
  lowConfidenceThreshold: number; // >= this = orange, below = gray
  showAllPositions: boolean; // Show indicators for all positions or just suggested
  maxIndicators: number; // Maximum number of indicators to show
  cacheEnabled: boolean;
  cacheTTL: number; // Cache TTL in milliseconds
}

const DEFAULT_CONFIG: DropZoneScorerConfig = {
  highConfidenceThreshold: 0.7,
  mediumConfidenceThreshold: 0.5,
  lowConfidenceThreshold: 0.3,
  showAllPositions: false,
  maxIndicators: 10,
  cacheEnabled: true,
  cacheTTL: 1000, // 1 second cache
};

/**
 * Cache entry for scored positions
 */
interface CacheEntry {
  itemId: string;
  gridHash: string;
  indicators: DropZoneIndicator[];
  timestamp: number;
}

/**
 * DropZoneScorer class
 */
export class DropZoneScorer {
  private config: DropZoneScorerConfig;
  private predictor: PlacementPredictor;
  private cache: CacheEntry | null = null;

  constructor(config: Partial<DropZoneScorerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.predictor = getPlacementPredictor();
  }

  /**
   * Score all drop zones for a dragged item
   */
  scoreDropZones(
    item: BacklogItem,
    gridItems: GridItemType[]
  ): DropZoneIndicator[] {
    // Check cache
    if (this.config.cacheEnabled) {
      const cached = this.getCached(item.id, gridItems);
      if (cached) return cached;
    }

    // Get predictions from predictor
    const prediction = this.predictor.predict(item, gridItems, {
      excludeOccupied: true,
    });

    // Convert predictions to visual indicators
    const indicators = this.predictionsToIndicators(prediction.predictions);

    // Cache results
    if (this.config.cacheEnabled) {
      this.setCache(item.id, gridItems, indicators);
    }

    return indicators;
  }

  /**
   * Get indicator for a specific position
   */
  getPositionIndicator(
    item: BacklogItem,
    position: number,
    gridItems: GridItemType[]
  ): DropZoneIndicator | null {
    const indicators = this.scoreDropZones(item, gridItems);
    return indicators.find(i => i.position === position) || null;
  }

  /**
   * Get top N suggestions
   */
  getTopSuggestions(
    item: BacklogItem,
    gridItems: GridItemType[],
    count: number = 3
  ): DropZoneIndicator[] {
    const indicators = this.scoreDropZones(item, gridItems);
    return indicators
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, count);
  }

  /**
   * Convert predictions to visual indicators
   */
  private predictionsToIndicators(
    predictions: PositionPrediction[]
  ): DropZoneIndicator[] {
    const indicators: DropZoneIndicator[] = [];
    const topPosition = predictions[0]?.position;

    for (let i = 0; i < Math.min(predictions.length, this.config.maxIndicators); i++) {
      const prediction = predictions[i];
      const color = this.getColor(prediction.confidence);
      const intensity = this.calculateIntensity(prediction.confidence);

      indicators.push({
        position: prediction.position,
        confidence: prediction.confidence,
        color,
        intensity,
        label: this.getLabel(prediction),
        shortReason: prediction.reasons[0]?.description,
        isTopSuggestion: prediction.position === topPosition,
      });
    }

    return indicators;
  }

  /**
   * Get color based on confidence level
   */
  private getColor(confidence: number): DropZoneColor {
    if (confidence >= this.config.highConfidenceThreshold) {
      return 'green';
    } else if (confidence >= this.config.mediumConfidenceThreshold) {
      return 'yellow';
    } else if (confidence >= this.config.lowConfidenceThreshold) {
      return 'orange';
    }
    return 'gray';
  }

  /**
   * Calculate intensity for visual effect
   */
  private calculateIntensity(confidence: number): number {
    // Map confidence to a more visible range (0.3 to 1.0)
    return 0.3 + confidence * 0.7;
  }

  /**
   * Get human-readable label for position
   */
  private getLabel(prediction: PositionPrediction): string {
    const position = prediction.position + 1; // 1-based display
    const confidencePercent = Math.round(prediction.confidence * 100);

    if (prediction.confidence >= this.config.highConfidenceThreshold) {
      return `#${position} (${confidencePercent}% match)`;
    } else if (prediction.confidence >= this.config.mediumConfidenceThreshold) {
      return `#${position} (Good fit)`;
    } else {
      return `#${position}`;
    }
  }

  /**
   * Get cached results if valid
   */
  private getCached(itemId: string, gridItems: GridItemType[]): DropZoneIndicator[] | null {
    if (!this.cache) return null;

    const gridHash = this.hashGrid(gridItems);
    const now = Date.now();

    if (
      this.cache.itemId === itemId &&
      this.cache.gridHash === gridHash &&
      now - this.cache.timestamp < this.config.cacheTTL
    ) {
      return this.cache.indicators;
    }

    return null;
  }

  /**
   * Set cache
   */
  private setCache(
    itemId: string,
    gridItems: GridItemType[],
    indicators: DropZoneIndicator[]
  ): void {
    this.cache = {
      itemId,
      gridHash: this.hashGrid(gridItems),
      indicators,
      timestamp: Date.now(),
    };
  }

  /**
   * Create a simple hash of grid state for cache invalidation
   */
  private hashGrid(gridItems: GridItemType[]): string {
    // Simple hash based on occupied positions
    return gridItems
      .map((item, idx) => (item.matched ? idx : ''))
      .filter(Boolean)
      .join(',');
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DropZoneScorerConfig>): void {
    this.config = { ...this.config, ...config };
    this.clearCache();
  }
}

/**
 * Get CSS color values for drop zone colors
 */
export function getDropZoneColorCSS(color: DropZoneColor, intensity: number): {
  backgroundColor: string;
  borderColor: string;
  glowColor: string;
} {
  const alpha = Math.round(intensity * 0.3 * 255).toString(16).padStart(2, '0');
  const glowAlpha = Math.round(intensity * 0.5 * 255).toString(16).padStart(2, '0');

  switch (color) {
    case 'green':
      return {
        backgroundColor: `#22c55e${alpha}`,
        borderColor: `#22c55e`,
        glowColor: `rgba(34, 197, 94, ${intensity * 0.5})`,
      };
    case 'yellow':
      return {
        backgroundColor: `#eab308${alpha}`,
        borderColor: `#eab308`,
        glowColor: `rgba(234, 179, 8, ${intensity * 0.4})`,
      };
    case 'orange':
      return {
        backgroundColor: `#f97316${alpha}`,
        borderColor: `#f97316`,
        glowColor: `rgba(249, 115, 22, ${intensity * 0.3})`,
      };
    case 'blue':
      return {
        backgroundColor: `#3b82f6${alpha}`,
        borderColor: `#3b82f6`,
        glowColor: `rgba(59, 130, 246, ${intensity * 0.4})`,
      };
    case 'gray':
    default:
      return {
        backgroundColor: `#6b7280${alpha}`,
        borderColor: `#6b7280`,
        glowColor: `rgba(107, 114, 128, ${intensity * 0.2})`,
      };
  }
}

/**
 * Get Tailwind classes for drop zone colors
 */
export function getDropZoneTailwindClasses(
  color: DropZoneColor,
  isTopSuggestion: boolean
): string {
  const baseClasses = isTopSuggestion ? 'ring-2 ring-offset-1' : '';

  switch (color) {
    case 'green':
      return `${baseClasses} border-green-500 bg-green-500/20 ${isTopSuggestion ? 'ring-green-400' : ''}`;
    case 'yellow':
      return `${baseClasses} border-yellow-500 bg-yellow-500/15 ${isTopSuggestion ? 'ring-yellow-400' : ''}`;
    case 'orange':
      return `${baseClasses} border-orange-500 bg-orange-500/10 ${isTopSuggestion ? 'ring-orange-400' : ''}`;
    case 'blue':
      return `${baseClasses} border-blue-500 bg-blue-500/15 ${isTopSuggestion ? 'ring-blue-400' : ''}`;
    case 'gray':
    default:
      return `border-gray-600 bg-gray-600/10`;
  }
}

// Singleton instance
let scorerInstance: DropZoneScorer | null = null;

/**
 * Get or create the scorer instance
 */
export function getDropZoneScorer(config?: Partial<DropZoneScorerConfig>): DropZoneScorer {
  if (!scorerInstance) {
    scorerInstance = new DropZoneScorer(config);
  }
  return scorerInstance;
}

/**
 * Reset the scorer instance
 */
export function resetDropZoneScorer(): void {
  scorerInstance = null;
}
