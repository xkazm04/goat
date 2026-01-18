/**
 * Personalization System
 * Adaptive showcase personalization engine
 */

// Types
export type {
  InterestCategory,
  CategoryInterest,
  BehaviorEventType,
  BehaviorEvent,
  UserProfile,
  UserPreferences,
  PersonalizationContext,
  PersonalizedShowcaseItem,
  SelectionReason,
  BoostFactor,
  ABTest,
  ABTestVariant,
  PersonalizationConfig,
} from './types';

export {
  DEFAULT_PERSONALIZATION_CONFIG,
  DEFAULT_USER_PREFERENCES,
  STORAGE_KEYS,
  INTEREST_DECAY,
  EVENT_WEIGHTS,
} from './types';

// Interest Tracker
export { InterestTracker, getInterestTracker } from './InterestTracker';

// Personalization Engine
export type { ContentItem } from './PersonalizationEngine';
export { PersonalizationEngine, getPersonalizationEngine } from './PersonalizationEngine';

// Context Analyzer
export { ContextAnalyzer, getContextAnalyzer } from './ContextAnalyzer';

// Showcase Selector
export type {
  SelectionStrategy,
  ShowcasePosition,
  SelectedShowcaseItem,
  ShowcaseLayoutConfig,
} from './ShowcaseSelector';
export { ShowcaseSelector, createShowcaseSelector } from './ShowcaseSelector';

// A/B Testing
export {
  EXPERIMENTS,
  useABTest,
  useShowcaseStrategyExperiment,
  useCarouselAutoplayExperiment,
  useHeroLayoutExperiment,
  usePersonalizationWeightExperiment,
  useTrackExperimentImpression,
  useTrackExperimentConversion,
  useActiveExperiments,
  useExperimentOverride,
} from './useABTesting';

// React Hooks
export {
  usePersonalization,
  useTrackShowcaseView,
  usePersonalizedWelcome,
  usePreferredCategories,
} from './usePersonalization';
