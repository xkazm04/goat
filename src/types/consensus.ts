/**
 * Consensus Ranking Types
 *
 * This module defines types for the "Items Rank Users" paradigm where
 * items themselves become the primary data source, showing their global
 * ranking distributions, consensus overlays, and confidence scores.
 */

/**
 * Consensus data for a single item across all users
 */
export interface ItemConsensus {
  /** The item ID */
  itemId: string;

  /** Median rank across all users who ranked this item */
  medianRank: number;

  /** Average rank across all users */
  averageRank: number;

  /** Standard deviation - higher means more contested/volatile */
  volatility: number;

  /** Number of users who have ranked this item */
  totalRankings: number;

  /** Confidence score (0-1) based on sample size and agreement */
  confidence: number;

  /** Distribution of rankings (position -> count) */
  distribution: Record<number, number>;

  /** Most common rank position (mode) */
  modeRank: number;

  /** Percentile rankings */
  percentiles: {
    p25: number;
    p50: number; // median
    p75: number;
  };
}

/**
 * Peer cluster - group of users with similar ranking patterns
 */
export interface PeerCluster {
  /** Unique cluster ID */
  clusterId: string;

  /** Cluster name/label (e.g., "Critics' Choice", "Fan Favorites") */
  label: string;

  /** Number of users in this cluster */
  userCount: number;

  /** This cluster's median rank for an item */
  clusterMedianRank: number;

  /** Color theme for visualization */
  color: string;

  /** Similarity score to current user (0-1, if authenticated) */
  similarityScore?: number;
}

/**
 * Full consensus data for an item including peer clusters
 */
export interface ItemConsensusWithClusters extends ItemConsensus {
  /** Peer clusters that have ranked this item */
  peerClusters: PeerCluster[];
}

/**
 * Consensus mode view state
 */
export type ConsensusViewMode =
  | 'off'           // Traditional ranking view
  | 'median'        // Show median ranks
  | 'volatility'    // Highlight contested items
  | 'peers'         // Show peer cluster overlays
  | 'discovery';    // Full discovery mode with all overlays

/**
 * Volatility level classification
 */
export type VolatilityLevel =
  | 'stable'      // Low volatility - strong consensus
  | 'moderate'    // Some disagreement
  | 'contested'   // High disagreement
  | 'polarizing'; // Very high disagreement

/**
 * Get volatility level from standard deviation
 */
export function getVolatilityLevel(volatility: number): VolatilityLevel {
  if (volatility < 2) return 'stable';
  if (volatility < 4) return 'moderate';
  if (volatility < 6) return 'contested';
  return 'polarizing';
}

/**
 * Get color for volatility level (Tailwind classes)
 */
export function getVolatilityColor(level: VolatilityLevel): string {
  switch (level) {
    case 'stable':
      return 'text-emerald-400';
    case 'moderate':
      return 'text-cyan-400';
    case 'contested':
      return 'text-amber-400';
    case 'polarizing':
      return 'text-rose-400';
  }
}

/**
 * Get background color for volatility level (Tailwind classes)
 */
export function getVolatilityBgColor(level: VolatilityLevel): string {
  switch (level) {
    case 'stable':
      return 'bg-emerald-500/20';
    case 'moderate':
      return 'bg-cyan-500/20';
    case 'contested':
      return 'bg-amber-500/20';
    case 'polarizing':
      return 'bg-rose-500/20';
  }
}

/**
 * Consensus badge type for visual display
 */
export interface ConsensusBadge {
  /** Badge label */
  label: string;

  /** Icon name (from lucide-react) */
  icon: 'trophy' | 'flame' | 'zap' | 'users' | 'target' | 'sparkles';

  /** Color class */
  color: string;

  /** Description tooltip */
  description: string;
}

/**
 * Get badges for an item based on its consensus data
 */
export function getConsensusBadges(consensus: ItemConsensus): ConsensusBadge[] {
  const badges: ConsensusBadge[] = [];

  // Top consensus pick
  if (consensus.medianRank <= 3 && consensus.confidence >= 0.7) {
    badges.push({
      label: '#1 Consensus',
      icon: 'trophy',
      color: 'text-yellow-400',
      description: 'Strong agreement for top placement'
    });
  }

  // Highly contested
  if (getVolatilityLevel(consensus.volatility) === 'polarizing') {
    badges.push({
      label: 'Hot Debate',
      icon: 'flame',
      color: 'text-rose-400',
      description: 'Users strongly disagree on this item\'s ranking'
    });
  }

  // Rising consensus
  if (consensus.confidence >= 0.8 && consensus.totalRankings >= 50) {
    badges.push({
      label: 'Clear Winner',
      icon: 'target',
      color: 'text-emerald-400',
      description: 'High agreement among many users'
    });
  }

  // Popular but volatile
  if (consensus.totalRankings >= 100 && consensus.volatility >= 4) {
    badges.push({
      label: 'Popular Pick',
      icon: 'users',
      color: 'text-purple-400',
      description: 'Widely ranked but opinions vary'
    });
  }

  return badges;
}

/**
 * API response for consensus data
 */
export interface ConsensusAPIResponse {
  items: Record<string, ItemConsensusWithClusters>;
  category: string;
  lastUpdated: string;
  totalUsers: number;
}

/**
 * Sort configuration for inventory view (inline definition to avoid circular imports)
 * @deprecated Use SortConfig from '@/lib/sorting' instead.
 */
export interface InventorySortConfig {
  sortBy: 'default' | 'consensus' | 'average' | 'volatility' | 'confidence' | 'alphabetical' | 'recent';
  sortOrder: 'asc' | 'desc';
}

/**
 * Consensus store state
 */
export interface ConsensusState {
  /** Current view mode */
  viewMode: ConsensusViewMode;

  /** Consensus data by item ID */
  consensusData: Record<string, ItemConsensusWithClusters>;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: Error | null;

  /** Last fetch timestamp */
  lastFetched: number | null;

  /** Current category filter */
  currentCategory: string | null;

  /** Sort configuration for inventory view */
  sortConfig: InventorySortConfig;
}
