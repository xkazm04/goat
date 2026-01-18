/**
 * Consensus Heatmap System
 * Module exports for real-time community consensus visualization
 */

// Types
export type {
  ConsensusLevel,
  ItemConsensus,
  HeatIntensity,
  HeatmapColors,
  HeatmapViewMode,
  CommunityRanking,
  ConsensusUpdate,
  ConsensusTrend,
  HeatmapConfig,
  RendererOptions,
  HeatmapCell,
  ConsensusBadgeType,
  ConsensusBadge,
  UserVsCommunityComparison,
  HeatmapState,
  HeatmapActions,
} from './types';

export {
  CONSENSUS_STORAGE_KEYS,
  DEFAULT_HEATMAP_COLORS,
  COLORBLIND_HEATMAP_COLORS,
  CONSENSUS_THRESHOLDS,
  DEFAULT_HEATMAP_CONFIG,
} from './types';

// Data Service
export {
  ConsensusDataService,
  getConsensusLevel,
  calculateConsensusScore,
  calculateControversyScore,
  calculateItemStatistics,
  aggregateRankings,
  createCommunityRanking,
  calculateHeatIntensity,
  getHeatmapColor,
  determineBadge,
  generateHeatmapCells,
  compareUserToCommunity,
} from './ConsensusDataService';

// Controversy Calculator
export {
  ControversyCalculator,
  calculateControversyFromDistribution,
  calculatePolarization,
  calculateBimodalScore,
  countOutliers,
  calculateControversyMetrics,
  rankByControversy,
  getControversyHotspots,
  detectControversyShifts,
} from './ControversyCalculator';

export type { ControversyMetrics } from './ControversyCalculator';

// Trend Analyzer
export {
  TrendAnalyzer,
  analyzeItemTrend,
  analyzeCommunityTrends,
  findSignificantTrends,
  detectConsensusShifts,
  calculateOverallTrend,
} from './TrendAnalyzer';

export type { TrendResult } from './TrendAnalyzer';

// Renderer
export {
  HeatmapRenderer,
  HeatmapLegend,
  HeatmapTooltip,
} from './HeatmapRenderer';

// Overlay Components
export {
  HeatmapToggle,
  ModeSelector,
  OpacitySlider,
  CommunityStatsCard,
  UserComparisonCard,
  ControversialList,
  ConsensusWinnersList,
  ConsensusOverlayPanel,
} from './components/ConsensusOverlay';
