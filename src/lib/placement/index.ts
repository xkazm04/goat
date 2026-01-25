/**
 * Smart Auto-Placement System
 *
 * Provides intelligent position suggestions during drag operations
 * based on item metadata, existing rankings, and user patterns.
 */

// Core prediction engine
export {
  PlacementPredictor,
  getPlacementPredictor,
  resetPlacementPredictor,
  type PositionPrediction,
  type PredictionReason,
  type PlacementPrediction,
  type UserPatterns,
  type PredictorConfig,
} from './PlacementPredictor';

// Drop zone scoring and visual indicators
export {
  DropZoneScorer,
  getDropZoneScorer,
  resetDropZoneScorer,
  getDropZoneColorCSS,
  getDropZoneTailwindClasses,
  type DropZoneIndicator,
  type DropZoneColor,
  type DropZoneScorerConfig,
} from './DropZoneScorer';
