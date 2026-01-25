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
  TierComparison as TierComparisonData,
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

// Advanced Threshold Editor
export {
  ThresholdSlider as AdvancedThresholdSlider,
  ThresholdSliderCompact,
} from './components/ThresholdSlider';

export {
  ThresholdEditor,
  ThresholdEditorInline,
} from './components/ThresholdEditor';

// Threshold Recommender
export {
  ThresholdRecommender,
  createThresholdRecommender,
  getQuickRecommendation,
} from './ThresholdRecommender';

export type {
  ListCharacteristics,
  ThresholdRecommendation,
  RecommendationComparison,
} from './ThresholdRecommender';

// Algorithm Presets
export {
  ALGORITHM_PRESETS,
  ALGORITHM_EQUAL,
  ALGORITHM_PYRAMID,
  ALGORITHM_BELL,
  ALGORITHM_PERCENTILE,
  ALGORITHM_ELITE,
  ALGORITHM_BALANCED,
  getAlgorithmPreset,
  getPresetByAlgorithm,
  calculateBoundariesFromAlgorithm,
} from './constants';

export type { AlgorithmPresetDefinition } from './constants';

// Dynamic threshold utilities
export {
  calculateTiersWithCustomBoundaries,
  normalizeBoundaries,
  calculateDistributionStats,
  boundariesFromPercentages,
  boundariesToPercentages,
} from './TierCalculator';

// Interactive Tier Charts
export {
  TierChart,
  TierChartMini,
  TierChartStacked,
} from './components/TierChart';

export type {
  TierChartData,
  TierChartConfig,
} from './components/TierChart';

export {
  TierPieChart,
  TierDonutMini,
  TierGaugeChart,
} from './components/TierPieChart';

export type {
  TierPieChartConfig,
} from './components/TierPieChart';

export {
  TierComparison,
} from './components/TierComparison';

export type {
  ComparisonDataSet,
} from './components/TierComparison';

export {
  TierDrilldown,
} from './components/TierDrilldown';

export type {
  DrilldownItem,
  TierDrilldownData,
} from './components/TierDrilldown';

// Chart Exporter
export {
  ChartExporter,
  createChartExporter,
  exportChartAsImage,
} from './ChartExporter';

export type {
  ChartExportOptions,
} from './ChartExporter';

// Tier Converter (for tier ranking mode)
export {
  TierConverter,
  createTierConverter,
  convertTiersToPositions,
  convertPositionsToTiers,
} from './TierConverter';

export type {
  TierItem,
  TierAssignment,
  TierToPositionResult,
  PositionToTierResult,
  ConversionStrategy,
  ConversionConfig,
} from './TierConverter';

// TierRow for tier ranking mode
export {
  TierRow,
  TierRowCompact,
  createTierRowDropData,
  createTierItemDragData,
  isTierRowDropData,
  isTierItemDragData,
} from './TierRow';

export type {
  TierRowDropData,
  TierItemDragData,
} from './TierRow';
