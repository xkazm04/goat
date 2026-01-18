/**
 * Size Visualizer
 * Interactive list size selection with visual previews
 */

// Main component
export { SizeVisualizer, default } from './SizeVisualizer';

// Sub-components
export { GridPreview, MiniGridPreview } from './GridPreview';
export { MorphAnimator, useMorphAnimation } from './MorphAnimator';
export { TimeEstimator, TimeBadge } from './TimeEstimator';
export { SizeRecommender, RecommendationBadge } from './SizeRecommender';
export { CustomSizeSlider, SizeNumberInput } from './CustomSizeSlider';
export { FormatSwitcher, FormatBadge } from './FormatSwitcher';

// Types
export type {
  ListSize,
  RankingFormat,
  SizeOption,
  TimeEstimate,
  TimeEstimateFactor,
  SizeRecommendation,
  GridSlot,
  PreviewState,
  MorphState,
  CustomSizeConfig,
  VisualizerColor,
  SizeVisualizerProps,
} from './types';

// Constants and utilities
export {
  SIZE_OPTIONS,
  CATEGORY_TIME_MULTIPLIERS,
  CATEGORY_EXAMPLE_ITEMS,
  FORMAT_CONFIGS,
  getSizeOption,
  getNearestSize,
  calculateComparisons,
  getExampleItems,
} from './types';
