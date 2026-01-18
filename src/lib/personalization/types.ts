/**
 * Personalization System Types
 * Types for the adaptive showcase personalization engine
 */

/**
 * Categories that can be tracked for user interests
 */
export type InterestCategory =
  | 'Sports'
  | 'Games'
  | 'Music'
  | 'Stories'
  | 'Movies'
  | 'Food'
  | 'Travel'
  | 'Technology'
  | 'Fashion'
  | 'Art';

/**
 * User interest score for a category
 */
export interface CategoryInterest {
  category: InterestCategory;
  score: number; // 0-100 affinity score
  interactions: number; // Total interactions
  lastInteraction: number; // Timestamp
  subcategories: Record<string, number>; // Subcategory scores
}

/**
 * User behavior event types
 */
export type BehaviorEventType =
  | 'view' // Viewed a list/card
  | 'click' // Clicked on content
  | 'create' // Created a list
  | 'complete' // Completed a ranking
  | 'share' // Shared content
  | 'save' // Saved/bookmarked
  | 'hover' // Hovered for extended time
  | 'scroll' // Scrolled through content;

/**
 * Behavior event for tracking
 */
export interface BehaviorEvent {
  type: BehaviorEventType;
  category: string;
  subcategory?: string;
  itemId?: string;
  timestamp: number;
  duration?: number; // For view/hover events
  metadata?: Record<string, unknown>;
}

/**
 * User profile for personalization
 */
export interface UserProfile {
  /** Unique identifier (anonymous or authenticated) */
  id: string;
  /** Whether this is an authenticated user */
  isAuthenticated: boolean;
  /** Whether this is a new user (first visit) */
  isNewUser: boolean;
  /** First visit timestamp */
  firstVisit: number;
  /** Last visit timestamp */
  lastVisit: number;
  /** Total visit count */
  visitCount: number;
  /** Category interests with scores */
  interests: CategoryInterest[];
  /** Recent behavior events (last 100) */
  recentEvents: BehaviorEvent[];
  /** Preferred time periods */
  preferredTimePeriods: ('all-time' | 'decade' | 'year')[];
  /** A/B test assignments */
  experiments: Record<string, string>;
  /** User preferences */
  preferences: UserPreferences;
}

/**
 * User preferences
 */
export interface UserPreferences {
  /** Preferred content freshness: new vs classic */
  contentFreshness: 'new' | 'classic' | 'mixed';
  /** Preferred showcase density */
  showcaseDensity: 'minimal' | 'balanced' | 'rich';
  /** Animation preference */
  reducedMotion: boolean;
  /** Theme preference */
  theme: 'light' | 'dark' | 'system';
}

/**
 * Context information for personalization
 */
export interface PersonalizationContext {
  /** Current time of day */
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  /** Day of week */
  dayOfWeek: number; // 0-6, Sunday = 0
  /** Is weekend */
  isWeekend: boolean;
  /** Season */
  season: 'spring' | 'summer' | 'fall' | 'winter';
  /** Geographic region (if available) */
  region?: string;
  /** Timezone */
  timezone: string;
  /** Device type */
  deviceType: 'mobile' | 'tablet' | 'desktop';
  /** Referrer source */
  referrer?: string;
  /** Current page/section */
  currentSection?: string;
}

/**
 * Showcase item with personalization score
 */
export interface PersonalizedShowcaseItem<T = unknown> {
  /** Original item data */
  item: T;
  /** Personalization relevance score (0-100) */
  relevanceScore: number;
  /** Why this item was selected */
  selectionReason: SelectionReason;
  /** Boost factors applied */
  boostFactors: BoostFactor[];
  /** Position override (if any) */
  positionOverride?: { x: number; y: number };
}

/**
 * Reason for content selection
 */
export type SelectionReason =
  | 'interest_match' // Matches user interests
  | 'trending' // Currently trending
  | 'new_content' // Fresh content
  | 'popular' // Generally popular
  | 'contextual' // Time/location relevant
  | 'exploration' // Diversity/discovery
  | 'returning_user' // Based on past behavior
  | 'default'; // Fallback selection

/**
 * Boost factor applied to scoring
 */
export interface BoostFactor {
  type: string;
  value: number; // Multiplier or additive
  reason: string;
}

/**
 * A/B Test configuration
 */
export interface ABTest {
  id: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  /** Traffic allocation (0-100) */
  trafficPercentage: number;
  /** Start date */
  startDate: number;
  /** End date (optional) */
  endDate?: number;
  /** Whether test is active */
  isActive: boolean;
}

/**
 * A/B Test variant
 */
export interface ABTestVariant {
  id: string;
  name: string;
  /** Weight for random assignment (sum of all = 100) */
  weight: number;
  /** Configuration overrides */
  config: Record<string, unknown>;
}

/**
 * Personalization engine configuration
 */
export interface PersonalizationConfig {
  /** Enable personalization */
  enabled: boolean;
  /** Minimum visits before personalization kicks in */
  minVisitsForPersonalization: number;
  /** Weight for interest-based scoring */
  interestWeight: number;
  /** Weight for contextual scoring */
  contextWeight: number;
  /** Weight for popularity scoring */
  popularityWeight: number;
  /** Exploration rate (0-1) for diversity */
  explorationRate: number;
  /** Maximum items to personalize */
  maxPersonalizedItems: number;
  /** Enable A/B testing */
  enableABTesting: boolean;
  /** Privacy mode (no tracking) */
  privacyMode: boolean;
}

/**
 * Default personalization configuration
 */
export const DEFAULT_PERSONALIZATION_CONFIG: PersonalizationConfig = {
  enabled: true,
  minVisitsForPersonalization: 2,
  interestWeight: 0.4,
  contextWeight: 0.2,
  popularityWeight: 0.3,
  explorationRate: 0.1,
  maxPersonalizedItems: 10,
  enableABTesting: true,
  privacyMode: false,
};

/**
 * Default user preferences
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  contentFreshness: 'mixed',
  showcaseDensity: 'balanced',
  reducedMotion: false,
  theme: 'system',
};

/**
 * Storage keys for IndexedDB
 */
export const STORAGE_KEYS = {
  USER_PROFILE: 'goat_user_profile',
  BEHAVIOR_EVENTS: 'goat_behavior_events',
  EXPERIMENTS: 'goat_experiments',
  PREFERENCES: 'goat_preferences',
} as const;

/**
 * Interest decay configuration
 * Interests decay over time to keep recommendations fresh
 */
export const INTEREST_DECAY = {
  /** Half-life in days (interest halves after this many days) */
  halfLifeDays: 14,
  /** Minimum score before interest is removed */
  minScore: 5,
  /** Maximum score cap */
  maxScore: 100,
} as const;

/**
 * Event scoring weights
 */
export const EVENT_WEIGHTS: Record<BehaviorEventType, number> = {
  view: 1,
  click: 3,
  hover: 0.5,
  scroll: 0.2,
  create: 10,
  complete: 15,
  share: 8,
  save: 5,
};
