/**
 * Customizable Comparison Criteria System - Types
 * Type definitions for criteria-based scoring and ranking
 */

/**
 * A single criterion definition
 */
export interface Criterion {
  id: string;
  name: string;
  description: string;
  /** Weight from 0-100, higher = more important */
  weight: number;
  /** Minimum score value */
  minScore: number;
  /** Maximum score value */
  maxScore: number;
  /** Optional icon identifier */
  icon?: string;
  /** Color for visualization */
  color?: string;
}

/**
 * A criteria profile (template or custom)
 */
export interface CriteriaProfile {
  id: string;
  name: string;
  description: string;
  /** Category this profile applies to (or 'universal' for all) */
  category: string;
  /** List of criteria in this profile */
  criteria: Criterion[];
  /** Whether this is a system template */
  isTemplate: boolean;
  /** User who created this profile (null for system templates) */
  createdBy: string | null;
  /** Profile creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Shareable link code */
  shareCode?: string;
  /** Number of users who have used this profile */
  usageCount?: number;
}

/**
 * Score for a single criterion on a single item
 */
export interface CriterionScore {
  criterionId: string;
  /** Score value (between criterion's minScore and maxScore) */
  score: number;
  /** Optional justification note */
  note?: string;
}

/**
 * All criteria scores for a single item
 */
export interface ItemCriteriaScores {
  itemId: string;
  profileId: string;
  scores: CriterionScore[];
  /** Calculated weighted score */
  weightedScore: number;
  /** Optional overall justification */
  justification?: string;
  /** Timestamp when scores were recorded */
  scoredAt: string;
}

/**
 * Consensus data when multiple users score same item with same criteria
 */
export interface ConsensusData {
  itemId: string;
  profileId: string;
  /** Number of users who scored this item */
  userCount: number;
  /** Average score per criterion */
  criterionAverages: Record<string, number>;
  /** Standard deviation per criterion (agreement measure) */
  criterionStdDevs: Record<string, number>;
  /** Overall average weighted score */
  averageWeightedScore: number;
  /** Agreement level: 'high' (stdDev < 1), 'medium' (1-2), 'low' (> 2) */
  agreementLevel: 'high' | 'medium' | 'low';
}

/**
 * Ranking suggestion based on criteria scores
 */
export interface RankingSuggestion {
  itemId: string;
  suggestedPosition: number;
  weightedScore: number;
  confidence: number;
  reasoning: string;
}

/**
 * Score input mode
 */
export type ScoreInputMode = 'slider' | 'stars' | 'numeric';

/**
 * Criteria profile summary (for listing)
 */
export interface CriteriaProfileSummary {
  id: string;
  name: string;
  description: string;
  category: string;
  criteriaCount: number;
  isTemplate: boolean;
  usageCount?: number;
}

/**
 * Criteria scoring session - tracks scores during comparison
 */
export interface CriteriaScoringSession {
  sessionId: string;
  profileId: string;
  listId: string;
  itemScores: Map<string, ItemCriteriaScores>;
  startedAt: string;
  lastUpdatedAt: string;
}

/**
 * Export format for sharing profiles
 */
export interface CriteriaProfileExport {
  version: string;
  profile: Omit<CriteriaProfile, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>;
  exportedAt: string;
}

/**
 * Criteria calculation options
 */
export interface WeightedScoreOptions {
  /** Normalization method: 'linear' | 'percentile' */
  normalization: 'linear' | 'percentile';
  /** Whether to round final score */
  roundResult: boolean;
  /** Decimal places for final score */
  decimalPlaces: number;
}

/**
 * Category-specific criteria suggestions
 */
export type CategoryCriteriaSuggestions = {
  [category: string]: {
    suggested: string[];
    popular: string[];
  };
};

/**
 * State for criteria store
 */
export interface CriteriaState {
  /** All criteria profiles (templates + custom) */
  profiles: CriteriaProfile[];
  /** Currently active profile ID */
  activeProfileId: string | null;
  /** Item scores for current session */
  itemScores: Record<string, ItemCriteriaScores>;
  /** Score input mode preference */
  scoreInputMode: ScoreInputMode;
  /** Whether criteria panel is visible */
  isPanelVisible: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
}

/**
 * Actions for criteria store
 */
export interface CriteriaActions {
  // Profile management
  createProfile: (profile: Omit<CriteriaProfile, 'id' | 'createdAt' | 'updatedAt'>) => CriteriaProfile;
  updateProfile: (id: string, updates: Partial<CriteriaProfile>) => void;
  deleteProfile: (id: string) => void;
  duplicateProfile: (id: string, newName: string) => CriteriaProfile;

  // Active profile
  setActiveProfile: (id: string | null) => void;
  getActiveProfile: () => CriteriaProfile | null;

  // Criterion management
  addCriterion: (profileId: string, criterion: Omit<Criterion, 'id'>) => void;
  updateCriterion: (profileId: string, criterionId: string, updates: Partial<Criterion>) => void;
  removeCriterion: (profileId: string, criterionId: string) => void;
  reorderCriteria: (profileId: string, fromIndex: number, toIndex: number) => void;

  // Scoring
  setItemScore: (itemId: string, criterionId: string, score: number, note?: string) => void;
  setItemJustification: (itemId: string, justification: string) => void;
  getItemScores: (itemId: string) => ItemCriteriaScores | null;
  calculateWeightedScore: (itemId: string) => number;
  clearItemScores: (itemId: string) => void;
  clearAllScores: () => void;

  // Ranking suggestions
  getRankingSuggestions: (itemIds: string[]) => RankingSuggestion[];

  // Sharing
  generateShareCode: (profileId: string) => string;
  importFromShareCode: (code: string) => CriteriaProfile | null;
  exportProfile: (profileId: string) => CriteriaProfileExport | null;
  importProfile: (data: CriteriaProfileExport) => CriteriaProfile | null;

  // UI state
  setScoreInputMode: (mode: ScoreInputMode) => void;
  togglePanelVisibility: () => void;
  setPanelVisibility: (visible: boolean) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
}

/**
 * Complete criteria store type
 */
export interface CriteriaStore extends CriteriaState, CriteriaActions {}

/**
 * Default score options
 */
export const DEFAULT_SCORE_OPTIONS: WeightedScoreOptions = {
  normalization: 'linear',
  roundResult: true,
  decimalPlaces: 2,
};

/**
 * Default criterion values
 */
export const DEFAULT_CRITERION: Omit<Criterion, 'id' | 'name' | 'description'> = {
  weight: 50,
  minScore: 1,
  maxScore: 10,
};

/**
 * Categories for predefined templates
 */
export const TEMPLATE_CATEGORIES = [
  'universal',
  'sports',
  'movies',
  'music',
  'food',
  'games',
  'books',
  'tv-shows',
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

// =============================================================================
// Database JSONB Types (for Supabase persistence)
// =============================================================================

/**
 * Criteria config stored in lists.criteria_config JSONB column
 * Represents the criteria profile configuration for a list
 */
export interface ListCriteriaConfig {
  profileId: string;
  profileName: string;
  criteria: Criterion[];  // Reuse existing Criterion interface
  createdAt: string;      // ISO timestamp
  updatedAt: string;      // ISO timestamp
}

/**
 * Item scores stored in list_items.criteria_scores JSONB column
 * Represents all criteria scores for a single item in a list
 */
export interface ListItemCriteriaScores {
  profileId: string;
  scores: CriterionScore[];  // Reuse existing CriterionScore interface
  weightedScore: number;
  justification?: string;
  scoredAt: string;          // ISO timestamp
}
