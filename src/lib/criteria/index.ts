/**
 * Criteria Module
 * Customizable comparison criteria system
 */

// Types
export type {
  Criterion,
  CriteriaProfile,
  CriterionScore,
  ItemCriteriaScores,
  ConsensusData,
  RankingSuggestion,
  ScoreInputMode,
  CriteriaProfileSummary,
  CriteriaScoringSession,
  CriteriaProfileExport,
  WeightedScoreOptions,
  CategoryCriteriaSuggestions,
  CriteriaState,
  CriteriaActions,
  CriteriaStore,
  TemplateCategory,
  ListCriteriaConfig,
  ListItemCriteriaScores,
} from './types';

export {
  DEFAULT_SCORE_OPTIONS,
  DEFAULT_CRITERION,
  TEMPLATE_CATEGORIES,
} from './types';

// Weighted Score Calculation
export {
  calculateWeightedScore,
  calculateWeightedScoreDetailed,
  calculateScoringCompletion,
  validateCriterionScores,
  clampScore,
  getCriterionImportance,
  type CalculateWeightedScoreOptions,
  type WeightedScoreResult,
  type CriterionBreakdown,
} from './calculateWeightedScore';

// Manager
export {
  CriteriaManager,
  createCriteriaManager,
  defaultCriteriaManager,
} from './CriteriaManager';

// Templates
export {
  UNIVERSAL_TEMPLATE,
  SPORTS_TEMPLATE,
  MOVIES_TEMPLATE,
  MUSIC_TEMPLATE,
  FOOD_TEMPLATE,
  GAMES_TEMPLATE,
  BOOKS_TEMPLATE,
  TV_SHOWS_TEMPLATE,
  ALL_TEMPLATES,
  getTemplateById,
  getTemplatesForCategory,
  getSuggestedTemplate,
  CATEGORY_MAPPING,
  mapCategoryToTemplate,
} from './templates';
