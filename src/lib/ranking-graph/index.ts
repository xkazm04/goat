/**
 * Universal Ranking Graph
 *
 * Cross-list intelligence network that connects items across all lists,
 * computing Universal ELO Ratings, insights, trajectories, and anomaly detection.
 */

// Types
export type {
  UniversalRating,
  ContextRating,
  CrossListInsight,
  RankingTrajectory,
  TrajectoryPoint,
  RankingAnomaly,
  PlacementSuggestion,
  GraphNode,
  GraphEdge,
  UniversalRatingResponse,
  CrossListSuggestionsResponse,
  RankingGraphOverviewResponse,
  RankingGraphState,
  RankingGraphActions,
} from './types';

// Engine
export {
  computeUniversalRating,
  computeTrajectory,
  batchComputeRatings,
  eloToTier,
} from './UniversalRatingEngine';
export type { RawListAppearance } from './UniversalRatingEngine';

// Analyzer
export {
  generateCrossListInsights,
  detectAnomalies,
  generatePlacementSuggestions,
} from './CrossListAnalyzer';

// Service
export {
  getItemRating,
  getListSuggestions,
  getGraphOverview,
  invalidateItemCache,
  clearAllCaches,
} from './RankingGraphService';
