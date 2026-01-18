/**
 * Consensus Heatmap Types
 * Type definitions for the real-time community consensus system
 */

/**
 * Consensus level categories
 */
export type ConsensusLevel =
  | 'unanimous'    // Everyone agrees (90%+ same tier)
  | 'strong'       // Strong agreement (70-89%)
  | 'moderate'     // Some agreement (50-69%)
  | 'mixed'        // Mixed opinions (30-49%)
  | 'controversial' // Highly debated (<30%)
  | 'unknown';     // Not enough data

/**
 * Item consensus data
 */
export interface ItemConsensus {
  itemId: string;
  itemName?: string;

  // Position statistics
  averagePosition: number;
  medianPosition: number;
  modePosition: number;
  positionStandardDeviation: number;
  positionVariance: number;

  // Rank distribution
  rankDistribution: Map<number, number>; // position -> count
  percentileDistribution: number[]; // 0-100 for each percentile

  // Consensus metrics
  consensusLevel: ConsensusLevel;
  consensusScore: number; // 0-100, higher = more agreement
  controversyScore: number; // 0-100, higher = more controversial

  // User comparison
  userPosition?: number;
  userVsCommunityDiff?: number;

  // Metadata
  sampleSize: number;
  lastUpdated: number;
}

/**
 * Heatmap intensity configuration
 */
export interface HeatIntensity {
  min: number;
  max: number;
  value: number;
  normalized: number; // 0-1
}

/**
 * Heatmap color configuration
 */
export interface HeatmapColors {
  unanimous: string;
  strong: string;
  moderate: string;
  mixed: string;
  controversial: string;
  unknown: string;
  gradient: string[];
}

/**
 * Heatmap view mode
 */
export type HeatmapViewMode =
  | 'consensus'      // Show agreement levels
  | 'controversy'    // Highlight controversial items
  | 'yourPick'       // Compare user vs community
  | 'trending'       // Show items gaining consensus
  | 'variance'       // Show position spread
  | 'off';           // Heatmap disabled

/**
 * Community ranking aggregate
 */
export interface CommunityRanking {
  listId: string;
  categoryId: string;
  totalRankings: number;
  items: ItemConsensus[];
  overallConsensus: number; // 0-100
  mostControversial: ItemConsensus[];
  mostAgreed: ItemConsensus[];
  lastUpdated: number;
}

/**
 * Real-time update message
 */
export interface ConsensusUpdate {
  type: 'item_update' | 'full_refresh' | 'trend_update';
  listId: string;
  timestamp: number;
  data: Partial<ItemConsensus> | ItemConsensus[];
}

/**
 * Trend data for an item
 */
export interface ConsensusTrend {
  itemId: string;

  // Historical data
  history: Array<{
    timestamp: number;
    averagePosition: number;
    consensusScore: number;
    sampleSize: number;
  }>;

  // Trend metrics
  trendDirection: 'rising' | 'falling' | 'stable';
  trendStrength: number; // 0-100
  velocityPerHour: number; // Position change per hour

  // Predictions (optional)
  predictedPosition?: number;
  confidence?: number;
}

/**
 * Heatmap overlay configuration
 */
export interface HeatmapConfig {
  enabled: boolean;
  mode: HeatmapViewMode;
  opacity: number; // 0-1
  showLabels: boolean;
  showBadges: boolean;
  animateTransitions: boolean;
  updateInterval: number; // ms
  colorScheme: 'default' | 'colorblind' | 'monochrome';
}

/**
 * WebGL renderer options
 */
export interface RendererOptions {
  useWebGL: boolean;
  maxItems: number;
  targetFPS: number;
  blurRadius: number;
  gradientSteps: number;
}

/**
 * Heatmap cell data for rendering
 */
export interface HeatmapCell {
  position: number;
  itemId?: string;
  intensity: HeatIntensity;
  color: string;
  consensusLevel: ConsensusLevel;
  badge?: ConsensusBadge;
}

/**
 * Consensus badge types
 */
export type ConsensusBadgeType =
  | 'consensus-king'    // Highest agreement
  | 'hot-debate'        // Most controversial
  | 'hidden-gem'        // High rating, low awareness
  | 'rising-star'       // Rapidly gaining consensus
  | 'your-pick'         // Matches user's ranking
  | 'outlier';          // User disagrees with community

/**
 * Consensus badge
 */
export interface ConsensusBadge {
  type: ConsensusBadgeType;
  label: string;
  color: string;
  icon?: string;
  tooltip: string;
}

/**
 * Comparison result
 */
export interface UserVsCommunityComparison {
  userId: string;
  listId: string;

  // Agreement metrics
  agreementScore: number; // 0-100
  matchingPositions: number;
  totalItems: number;

  // Differences
  differences: Array<{
    itemId: string;
    userPosition: number;
    communityPosition: number;
    positionDiff: number;
    consensusLevel: ConsensusLevel;
  }>;

  // Categories
  agreements: string[]; // Item IDs user agrees with community on
  outliers: string[]; // Items where user significantly differs
  controversial: string[]; // User's picks on controversial items
}

/**
 * Heatmap store state
 */
export interface HeatmapState {
  config: HeatmapConfig;
  communityData: CommunityRanking | null;
  cells: HeatmapCell[];
  trends: Map<string, ConsensusTrend>;
  userComparison: UserVsCommunityComparison | null;
  isLoading: boolean;
  isConnected: boolean;
  lastSync: number | null;
  error: string | null;
}

/**
 * Heatmap store actions
 */
export interface HeatmapActions {
  // Configuration
  setEnabled: (enabled: boolean) => void;
  setMode: (mode: HeatmapViewMode) => void;
  setOpacity: (opacity: number) => void;
  toggleLabels: () => void;
  toggleBadges: () => void;
  setColorScheme: (scheme: 'default' | 'colorblind' | 'monochrome') => void;

  // Data
  loadCommunityData: (listId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  updateItem: (itemId: string, data: Partial<ItemConsensus>) => void;

  // Real-time
  connect: (listId: string) => void;
  disconnect: () => void;
  handleUpdate: (update: ConsensusUpdate) => void;

  // Comparison
  setUserRanking: (positions: Map<string, number>) => void;
  calculateComparison: () => void;

  // Reset
  reset: () => void;
}

/**
 * Storage keys
 */
export const CONSENSUS_STORAGE_KEYS = {
  CONFIG: 'goat_consensus_config',
  CACHE: 'goat_consensus_cache',
  USER_PREFS: 'goat_consensus_prefs',
} as const;

/**
 * Default heatmap colors (accessibility-friendly)
 */
export const DEFAULT_HEATMAP_COLORS: HeatmapColors = {
  unanimous: '#22c55e',    // Green
  strong: '#84cc16',       // Lime
  moderate: '#eab308',     // Yellow
  mixed: '#f97316',        // Orange
  controversial: '#ef4444', // Red
  unknown: '#64748b',      // Slate
  gradient: [
    '#22c55e', // High consensus
    '#84cc16',
    '#eab308',
    '#f97316',
    '#ef4444', // Low consensus
  ],
};

/**
 * Colorblind-friendly palette
 */
export const COLORBLIND_HEATMAP_COLORS: HeatmapColors = {
  unanimous: '#0077bb',    // Blue
  strong: '#33bbee',       // Cyan
  moderate: '#ee7733',     // Orange
  mixed: '#cc3311',        // Red-orange
  controversial: '#ee3377', // Magenta
  unknown: '#bbbbbb',      // Gray
  gradient: [
    '#0077bb',
    '#33bbee',
    '#ee7733',
    '#cc3311',
    '#ee3377',
  ],
};

/**
 * Consensus level thresholds
 */
export const CONSENSUS_THRESHOLDS = {
  unanimous: 90,
  strong: 70,
  moderate: 50,
  mixed: 30,
  controversial: 0,
} as const;

/**
 * Default configuration
 */
export const DEFAULT_HEATMAP_CONFIG: HeatmapConfig = {
  enabled: false,
  mode: 'consensus',
  opacity: 0.7,
  showLabels: true,
  showBadges: true,
  animateTransitions: true,
  updateInterval: 5000,
  colorScheme: 'default',
};
