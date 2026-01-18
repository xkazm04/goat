/**
 * Unified Ranking Engine
 *
 * This module provides a single abstraction for position-assignment that
 * underlies all ranking systems in the application:
 *
 * - Grid-based ranking (direct position assignment via drag-drop)
 * - Tier-based ranking (grouped position ranges like S/A/B/C/D)
 * - Tournament bracket ranking (pairwise comparison tournaments)
 *
 * All three represent the same fundamental concept: mapping items to ordered positions.
 * The difference is in how positions are assigned and visualized.
 *
 * @example
 * ```ts
 * import { createRankingEngine } from '@/lib/ranking';
 *
 * // Create a ranking engine for a Top 10 list
 * const engine = createRankingEngine('my-list', 10);
 *
 * // Register items that can be ranked
 * engine.registerItems(backlogItems);
 *
 * // Assign items to positions
 * engine.assign('item-1', 0); // #1 position
 * engine.assign('item-2', 1); // #2 position
 *
 * // Get different visualizations of the same ranking
 * const gridView = engine.toGrid({ columns: 5 });
 * const tierView = engine.toTiers({ tierCount: 3 });
 * const listView = engine.toList();
 *
 * // Import from existing systems
 * engine.fromGrid(gridStoreItems);
 * engine.fromTiers(tierStoreItems);
 * engine.fromBracket(bracketResults);
 * ```
 */

// Core types
export type {
  RankableItem,
  RankedItem,
  PositionAssignment,
  Ranking,
  RankingOperation,
  OperationResult,
  RankingEngine,
  VisualizationStrategy,
  GridVisualization,
  TierVisualization,
  BracketVisualization,
  ListVisualization,
  VisualizationConfig,
  InputStrategy,
  DragDropInput,
  BracketTournamentInput,
  TierAssignmentInput,
  AutoSortInput,
  InputConfig,
  TierMapping,
  TieredRanking,
  MatchupResult,
  BracketRanking,
  GridRankingView,
  TieredRankingView,
  BracketRankingView,
  ListRankingView,
  RankingView,
} from './types';

// Core implementation
export { RankingEngineImpl, createRankingEngine } from './RankingEngine';
