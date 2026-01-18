/**
 * Unified Ranking Engine Types
 *
 * Provides a single abstraction for position-assignment that underlies:
 * - Grid-based ranking (direct position assignment)
 * - Tier-based ranking (grouped position ranges)
 * - Tournament bracket ranking (pairwise comparison)
 *
 * All three represent the same fundamental concept: mapping items to ordered positions.
 */

/**
 * Core item that can be ranked
 */
export interface RankableItem {
  id: string;
  title: string;
  description?: string;
  image_url?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * A ranked item with its position
 */
export interface RankedItem<T extends RankableItem = RankableItem> {
  item: T;
  position: number; // 0-based position (0 = highest rank)
  score?: number; // Optional numerical score
  confidence?: number; // 0-1, how certain the ranking is
}

/**
 * Position assignment - the core unit of ranking
 */
export interface PositionAssignment {
  itemId: string;
  position: number;
  timestamp: number;
  source: 'direct' | 'bracket' | 'tier' | 'auto';
}

/**
 * A ranking is an ordered collection of position assignments
 */
export interface Ranking {
  id: string;
  listId: string;
  size: number; // Total positions available
  assignments: PositionAssignment[];
  createdAt: number;
  updatedAt: number;
}

// =============================================================================
// Visualization Strategies
// =============================================================================

/**
 * How rankings can be visualized
 */
export type VisualizationStrategy = 'grid' | 'tiers' | 'bracket' | 'list';

/**
 * Grid visualization config
 */
export interface GridVisualization {
  type: 'grid';
  columns: number;
  showPositionNumbers: boolean;
  showEmptySlots: boolean;
  highlightPodium: boolean;
}

/**
 * Tier visualization config
 */
export interface TierVisualization {
  type: 'tiers';
  tierCount: number;
  tierLabels: string[];
  tierColors: string[];
  showBoundaries: boolean;
  algorithm: 'equal' | 'pyramid' | 'bell' | 'custom';
}

/**
 * Bracket visualization config
 */
export interface BracketVisualization {
  type: 'bracket';
  bracketSize: 8 | 16 | 32 | 64;
  showSeeds: boolean;
  showRoundNames: boolean;
}

/**
 * Simple list visualization config
 */
export interface ListVisualization {
  type: 'list';
  showRankNumbers: boolean;
  compact: boolean;
}

export type VisualizationConfig =
  | GridVisualization
  | TierVisualization
  | BracketVisualization
  | ListVisualization;

// =============================================================================
// Input Strategies (how rankings are created)
// =============================================================================

/**
 * How rankings can be input/modified
 */
export type InputStrategy = 'drag-drop' | 'bracket-tournament' | 'tier-assignment' | 'auto-sort';

/**
 * Drag-drop input strategy
 */
export interface DragDropInput {
  type: 'drag-drop';
  allowReorder: boolean;
  allowSwap: boolean;
  allowRemove: boolean;
}

/**
 * Bracket tournament input strategy
 */
export interface BracketTournamentInput {
  type: 'bracket-tournament';
  bracketSize: 8 | 16 | 32 | 64;
  seedingStrategy: 'random' | 'seeded' | 'custom';
}

/**
 * Tier assignment input strategy
 */
export interface TierAssignmentInput {
  type: 'tier-assignment';
  tierCount: number;
  allowDragBetweenTiers: boolean;
}

/**
 * Auto-sort input strategy
 */
export interface AutoSortInput {
  type: 'auto-sort';
  sortBy: 'score' | 'alphabetical' | 'date' | 'custom';
  direction: 'asc' | 'desc';
}

export type InputConfig =
  | DragDropInput
  | BracketTournamentInput
  | TierAssignmentInput
  | AutoSortInput;

// =============================================================================
// Ranking Operations
// =============================================================================

/**
 * Operations that can be performed on a ranking
 */
export type RankingOperation =
  | { type: 'assign'; itemId: string; position: number }
  | { type: 'move'; fromPosition: number; toPosition: number }
  | { type: 'swap'; positionA: number; positionB: number }
  | { type: 'remove'; position: number }
  | { type: 'clear' }
  | { type: 'batch'; operations: RankingOperation[] };

/**
 * Result of a ranking operation
 */
export interface OperationResult {
  success: boolean;
  operation: RankingOperation;
  previousState?: PositionAssignment[];
  newState: PositionAssignment[];
  error?: string;
}

// =============================================================================
// Tier Mapping (for tier visualization)
// =============================================================================

/**
 * Maps positions to tier groups
 */
export interface TierMapping {
  tierId: string;
  label: string;
  startPosition: number; // inclusive
  endPosition: number; // exclusive
  color: string;
}

/**
 * Converts a ranking to tier groups
 */
export interface TieredRanking {
  ranking: Ranking;
  tiers: TierMapping[];
  itemsByTier: Map<string, RankedItem[]>;
}

// =============================================================================
// Bracket Mapping (for bracket visualization)
// =============================================================================

/**
 * Bracket matchup result
 */
export interface MatchupResult {
  matchupId: string;
  winnerId: string;
  loserId: string;
  round: number;
}

/**
 * Converts bracket results to a ranking
 */
export interface BracketRanking {
  ranking: Ranking;
  matchups: MatchupResult[];
  champion: string | null;
}

// =============================================================================
// Ranking Engine Interface
// =============================================================================

/**
 * The unified RankingEngine interface
 */
export interface RankingEngine {
  // Core state
  getRanking(): Ranking;
  getItems(): RankedItem[];
  getItemAtPosition(position: number): RankedItem | null;
  getPositionForItem(itemId: string): number | null;

  // Operations
  assign(itemId: string, position: number): OperationResult;
  move(fromPosition: number, toPosition: number): OperationResult;
  swap(positionA: number, positionB: number): OperationResult;
  remove(position: number): OperationResult;
  clear(): OperationResult;
  batch(operations: RankingOperation[]): OperationResult;

  // Undo/Redo
  canUndo(): boolean;
  canRedo(): boolean;
  undo(): OperationResult | null;
  redo(): OperationResult | null;

  // Visualization adapters
  toGrid(config?: Partial<GridVisualization>): GridRankingView;
  toTiers(config?: Partial<TierVisualization>): TieredRankingView;
  toBracket(config?: Partial<BracketVisualization>): BracketRankingView;
  toList(config?: Partial<ListVisualization>): ListRankingView;

  // Import from different sources
  fromGrid(gridItems: { position: number; itemId: string }[]): void;
  fromTiers(tieredItems: { tierId: string; itemId: string; tierRank: number }[]): void;
  fromBracket(bracketResults: MatchupResult[]): void;

  // Persistence
  serialize(): string;
  deserialize(data: string): void;
}

// =============================================================================
// View Types (what visualization adapters return)
// =============================================================================

/**
 * Grid view of a ranking
 */
export interface GridRankingView {
  type: 'grid';
  config: GridVisualization;
  slots: Array<{
    position: number;
    item: RankedItem | null;
    isOccupied: boolean;
    isPodium: boolean;
  }>;
  statistics: {
    filled: number;
    empty: number;
    total: number;
    percentage: number;
  };
}

/**
 * Tier view of a ranking
 */
export interface TieredRankingView {
  type: 'tiers';
  config: TierVisualization;
  tiers: Array<{
    id: string;
    label: string;
    color: string;
    items: RankedItem[];
    startPosition: number;
    endPosition: number;
  }>;
  statistics: {
    tierCounts: Record<string, number>;
    distribution: number[];
    balanceScore: number;
  };
}

/**
 * Bracket view of a ranking
 */
export interface BracketRankingView {
  type: 'bracket';
  config: BracketVisualization;
  rounds: Array<{
    name: string;
    matchups: Array<{
      id: string;
      participant1: RankedItem | null;
      participant2: RankedItem | null;
      winner: RankedItem | null;
      isComplete: boolean;
    }>;
  }>;
  champion: RankedItem | null;
  statistics: {
    totalMatchups: number;
    completedMatchups: number;
    progressPercentage: number;
  };
}

/**
 * Simple list view of a ranking
 */
export interface ListRankingView {
  type: 'list';
  config: ListVisualization;
  items: RankedItem[];
  statistics: {
    count: number;
    hasGaps: boolean;
  };
}

export type RankingView =
  | GridRankingView
  | TieredRankingView
  | BracketRankingView
  | ListRankingView;
