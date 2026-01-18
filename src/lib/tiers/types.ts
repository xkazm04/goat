/**
 * Smart Tier Classification Types
 * Type definitions for the tier auto-classification system
 */

/**
 * Standard tier labels
 */
export type TierLabel = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Extended tier labels for larger lists
 */
export type ExtendedTierLabel = TierLabel | 'S+' | 'A+' | 'A-' | 'B+' | 'B-' | 'C+' | 'C-' | 'D+' | 'D-';

/**
 * Tier definition with boundaries and styling
 */
export interface TierDefinition {
  id: string;
  label: TierLabel | ExtendedTierLabel;
  displayName: string;
  description: string;
  startPosition: number; // inclusive, 0-based
  endPosition: number;   // exclusive, 0-based
  color: {
    primary: string;
    secondary: string;
    accent: string;
    gradient: string;
    glow: string;
    text: string;
    border: string;
  };
  icon?: string;
}

/**
 * Tier preset configuration
 */
export interface TierPreset {
  id: string;
  name: string;
  description: string;
  tierCount: number;
  tiers: TierDefinition[];
  listSizeRange: {
    min: number;
    max: number;
  };
  isDefault?: boolean;
}

/**
 * Tier boundary marker
 */
export interface TierBoundary {
  position: number;
  tierAbove: TierDefinition;
  tierBelow: TierDefinition;
  isCustomized: boolean;
}

/**
 * Tier configuration state
 */
export interface TierConfiguration {
  enabled: boolean;
  preset: TierPreset;
  customThresholds: number[];
  showBands: boolean;
  showLabels: boolean;
  showSeparators: boolean;
  autoAdjust: boolean;
}

/**
 * Item with tier assignment
 */
export interface TieredItem {
  itemId: string;
  position: number;
  tier: TierDefinition;
  percentile: number;
  tierRank: number; // Position within the tier (1, 2, 3...)
}

/**
 * Tier statistics for a single tier
 */
export interface TierStats {
  tier: TierDefinition;
  itemCount: number;
  filledCount: number;
  emptyCount: number;
  percentage: number;
  averagePosition: number;
}

/**
 * Overall tier summary
 */
export interface TierSummary {
  totalItems: number;
  tieredItems: number;
  tierStats: TierStats[];
  distribution: Map<string, number>;
  dominantTier: TierDefinition | null;
  balanceScore: number; // 0-100, how evenly distributed
}

/**
 * Tier calculation algorithm type
 */
export type TierAlgorithm =
  | 'equal'        // Equal division of positions
  | 'pyramid'      // Fewer items in top tiers
  | 'bell'         // Bell curve distribution
  | 'kmeans'       // K-means clustering
  | 'percentile'   // Percentile-based
  | 'custom';      // User-defined

/**
 * Algorithm configuration
 */
export interface AlgorithmConfig {
  type: TierAlgorithm;
  params: Record<string, number>;
}

/**
 * ML tier suggestion
 */
export interface TierSuggestion {
  boundaries: number[];
  confidence: number;
  reasoning: string;
  algorithm: TierAlgorithm;
}

/**
 * Tier export configuration
 */
export interface TierExportConfig {
  format: 'png' | 'jpg' | 'svg';
  width: number;
  height: number;
  showTierLabels: boolean;
  showRankNumbers: boolean;
  showItemImages: boolean;
  showItemTitles: boolean;
  backgroundColor: string;
  watermark?: string;
  quality: number;
}

/**
 * Tier comparison between users
 */
export interface TierComparison {
  userId1: string;
  userId2: string;
  listId: string;
  agreements: TieredItem[];
  disagreements: Array<{
    item: TieredItem;
    tier1: TierDefinition;
    tier2: TierDefinition;
    positionDiff: number;
  }>;
  overlapScore: number; // 0-100
}

/**
 * Tier store state
 */
export interface TierState {
  configuration: TierConfiguration;
  currentTiers: TierDefinition[];
  boundaries: TierBoundary[];
  tieredItems: TieredItem[];
  summary: TierSummary | null;
  suggestions: TierSuggestion[];
  isCalculating: boolean;
  lastCalculated: number | null;
}

/**
 * Tier store actions
 */
export interface TierActions {
  // Configuration
  setEnabled: (enabled: boolean) => void;
  setPreset: (preset: TierPreset) => void;
  setCustomThresholds: (thresholds: number[]) => void;
  toggleBands: () => void;
  toggleLabels: () => void;
  toggleSeparators: () => void;

  // Calculation
  calculateTiers: (listSize: number, filledPositions: number[]) => void;
  recalculate: () => void;
  applyAlgorithm: (algorithm: TierAlgorithm, params?: Record<string, number>) => void;

  // Boundaries
  adjustBoundary: (boundaryIndex: number, newPosition: number) => void;
  resetBoundaries: () => void;

  // Suggestions
  getSuggestions: () => void;
  applySuggestion: (suggestion: TierSuggestion) => void;

  // Export
  exportTierList: (config: TierExportConfig) => Promise<Blob>;

  // Reset
  reset: () => void;
}

/**
 * Storage keys for tier persistence
 */
export const TIER_STORAGE_KEYS = {
  CONFIGURATION: 'goat_tier_configuration',
  CUSTOM_PRESETS: 'goat_tier_custom_presets',
  PREFERENCES: 'goat_tier_preferences',
} as const;
