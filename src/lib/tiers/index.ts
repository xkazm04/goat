/**
 * Smart Tier Classification System
 * Module exports for the tier auto-classification feature
 */

// Types
export type {
  TierLabel,
  ExtendedTierLabel,
  TierDefinition,
  TierPreset,
  TierBoundary,
  TierConfiguration,
  TieredItem,
  TierStats,
  TierSummary,
  TierAlgorithm,
  AlgorithmConfig,
  TierSuggestion,
  TierExportConfig,
  TierComparison,
  TierState,
  TierActions,
} from './types';

export { TIER_STORAGE_KEYS } from './types';

// Constants
export {
  TIER_COLORS,
  TIER_DESCRIPTIONS,
  TIER_PRESETS,
  PRESET_4_TIER,
  PRESET_5_TIER,
  PRESET_6_TIER,
  PRESET_9_TIER,
  PRESET_PYRAMID,
  PRESET_TOP_10,
  PRESET_TOP_25,
  PRESET_TOP_50,
  getBestPresetForSize,
  TIER_ANIMATIONS,
  DEFAULT_TIER_CONFIGURATION,
} from './constants';

// Calculator
export {
  TierCalculator,
  getTierCalculator,
  calculateTierBoundaries,
  createTiersFromBoundaries,
  adjustPresetToSize,
  getTierForPosition,
  extractBoundaries,
  assignTiersToItems,
  calculateTierStats,
  calculateTierSummary,
  generateTierSuggestions,
  smartCalculateTiers,
} from './TierCalculator';

// Components
export {
  TierBand,
  TierSeparator,
  TierLabelBadge,
  TierProgressBar,
  TierDistributionChart,
  InlineTierIndicator,
  TierOverviewCard,
} from './components/TierVisualizer';

export {
  TierCustomizer,
  PresetSelector,
  ThresholdSlider,
  AlgorithmPicker,
  SuggestionCard,
  DisplayOptions,
} from './components/TierCustomizer';

export {
  TierSummaryPanel,
  CompactTierSummary,
} from './components/TierSummary';

export {
  TierExporter,
} from './components/TierExporter';
