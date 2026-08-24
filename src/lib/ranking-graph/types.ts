/**
 * Universal Ranking Graph Types
 *
 * Cross-list intelligence network that connects items across all lists,
 * computing Universal ELO Ratings, cross-list insights, ranking trajectories,
 * and anomaly detection.
 */

import type { TierLabel, ExtendedTierLabel } from '@/lib/tiers/types';

// =============================================================================
// Core Universal Rating
// =============================================================================

/**
 * Universal ELO rating for an item computed across all lists where it appears
 */
export interface UniversalRating {
  /** The item being rated */
  itemId: string;
  itemName: string;

  /** Universal ELO score (1000 = average, higher = better) */
  eloScore: number;

  /** Equivalent tier label based on universal ELO */
  universalTier: TierLabel | ExtendedTierLabel;

  /** Number of lists this item appears in */
  listAppearances: number;

  /** Total number of individual rankings across all lists */
  totalRankings: number;

  /** Confidence in the rating (0-1), based on sample size and consistency */
  confidence: number;

  /** Average normalized position across all lists (0 = top, 1 = bottom) */
  averageNormalizedPosition: number;

  /** Standard deviation of normalized positions */
  positionVariance: number;

  /** Per-context breakdown */
  contextBreakdown: ContextRating[];

  /** Timestamp of last computation */
  lastComputed: number;
}

/**
 * Rating within a specific list context
 */
export interface ContextRating {
  listId: string;
  listTitle: string;
  category: string;
  position: number;
  listSize: number;
  normalizedPosition: number; // 0-1
  tierInList: TierLabel | ExtendedTierLabel;
  rankingCount: number; // how many users ranked in this list
}

// =============================================================================
// Cross-List Insights
// =============================================================================

/**
 * Cross-list insight about an item's performance across contexts
 */
export interface CrossListInsight {
  type: 'tier_consistency' | 'context_drop' | 'context_spike' | 'niche_favorite' | 'universal_top';
  title: string;
  description: string;
  /** Relevant data for the insight */
  data: {
    averageTier?: string;
    totalLists?: number;
    dropContext?: string;
    dropTier?: string;
    spikeContext?: string;
    spikeTier?: string;
    nicheCategory?: string;
  };
  /** Strength of insight signal (0-1) */
  strength: number;
}

// =============================================================================
// Ranking Trajectories
// =============================================================================

/**
 * How an item's universal rating changes over time
 */
export interface RankingTrajectory {
  itemId: string;
  /** Data points over time */
  dataPoints: TrajectoryPoint[];
  /** Overall trend direction */
  trend: 'rising' | 'falling' | 'stable' | 'volatile';
  /** Rate of change (ELO points per day) */
  velocity: number;
  /** Predicted ELO in 30 days */
  predictedElo: number;
}

export interface TrajectoryPoint {
  timestamp: number;
  eloScore: number;
  listAppearances: number;
  universalTier: TierLabel | ExtendedTierLabel;
}

// =============================================================================
// Anomaly Detection
// =============================================================================

/**
 * Anomaly in a user's ranking compared to cross-list consensus
 */
export interface RankingAnomaly {
  itemId: string;
  itemName: string;
  /** User's position in their list */
  userPosition: number;
  userListSize: number;
  /** Consensus normalized position (0-1) */
  consensusNormalizedPosition: number;
  /** User's normalized position (0-1) */
  userNormalizedPosition: number;
  /** How extreme the deviation is (0-1, higher = more anomalous) */
  anomalyScore: number;
  /** Percentile of user's ranking (e.g., "bottom 3%") */
  percentile: number;
  /** Direction of anomaly */
  direction: 'ranked_higher' | 'ranked_lower';
  /** Explanation */
  reasoning: string;
}

// =============================================================================
// Placement Suggestions
// =============================================================================

/**
 * Suggested placement based on cross-list consensus
 */
export interface PlacementSuggestion {
  itemId: string;
  itemName: string;
  /** Suggested position (0-based) */
  suggestedPosition: number;
  /** Confidence in suggestion (0-1) */
  confidence: number;
  /** Data backing the suggestion */
  dataPoints: number;
  /** Reasoning for the suggestion */
  reasoning: string;
  /** The universal tier this item typically lands in */
  expectedTier: TierLabel | ExtendedTierLabel;
}

// =============================================================================
// Ranking Graph Node/Edge (Knowledge Graph)
// =============================================================================

/**
 * Node in the ranking graph (represents an item)
 */
export interface GraphNode {
  itemId: string;
  itemName: string;
  universalRating: UniversalRating;
  /** Categories this item appears in */
  categories: string[];
  /** Number of edges (connections to other items) */
  edgeCount: number;
}

/**
 * Edge in the ranking graph (connection between items)
 */
export interface GraphEdge {
  /** Items that co-appear in the same lists */
  itemA: string;
  itemB: string;
  /** Number of lists both items appear in */
  coAppearances: number;
  /** Average position difference (positive = A ranked higher) */
  averagePositionDiff: number;
  /** How consistent the relative ordering is (0-1) */
  orderingConsistency: number;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface UniversalRatingResponse {
  rating: UniversalRating;
  insights: CrossListInsight[];
  trajectory: RankingTrajectory;
  relatedItems: Array<{
    itemId: string;
    itemName: string;
    eloScore: number;
    coAppearances: number;
  }>;
}

export interface CrossListSuggestionsResponse {
  suggestions: PlacementSuggestion[];
  anomalies: RankingAnomaly[];
  listId: string;
  category: string;
}

export interface RankingGraphOverviewResponse {
  topItems: UniversalRating[];
  risingItems: Array<UniversalRating & { velocity: number }>;
  controversialItems: Array<UniversalRating & { varianceRank: number }>;
  totalItemsTracked: number;
  totalListsAnalyzed: number;
  totalRankingsProcessed: number;
  lastUpdated: number;
}

// =============================================================================
// Store Types
// =============================================================================

export interface RankingGraphState {
  /** Cached universal ratings by item ID */
  ratings: Record<string, UniversalRating>;
  /** Cached insights by item ID */
  insights: Record<string, CrossListInsight[]>;
  /** Cached trajectories by item ID */
  trajectories: Record<string, RankingTrajectory>;
  /** Anomalies for current list */
  currentAnomalies: RankingAnomaly[];
  /** Suggestions for current list */
  currentSuggestions: PlacementSuggestion[];
  /** Loading states */
  isLoading: boolean;
  isLoadingItem: string | null;
  /** Error state */
  error: string | null;
  /** Last global refresh */
  lastRefreshed: number | null;
}

export interface RankingGraphActions {
  /** Fetch universal rating for an item */
  fetchItemRating: (itemId: string) => Promise<UniversalRating | null>;
  /** Fetch suggestions/anomalies for a list */
  fetchListSuggestions: (listId: string, category: string, userPositions: Record<string, number>, listSize: number) => Promise<void>;
  /** Fetch overview data */
  fetchOverview: (category?: string) => Promise<RankingGraphOverviewResponse | null>;
  /** Clear cache for an item */
  invalidateItem: (itemId: string) => void;
  /** Reset store */
  reset: () => void;
}
