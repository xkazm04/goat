/**
 * User Preferences Types
 *
 * Types for user display and feature preferences across all three directions:
 * - Direction 1: Community Wisdom
 * - Direction 2: Smart Seeding
 * - Direction 3: AI Results
 */

import type { AIStylePreset } from '@/app/features/Match/lib/ai/types';

/**
 * Seeding strategy options for bracket generation
 */
export type SeedingStrategy =
  | 'random'
  | 'alphabetical'
  | 'year'
  | 'consensus'
  | 'reverse-alphabetical';

/**
 * Auto-arrange modes for grid organization
 */
export type ArrangeMode =
  | 'auto'
  | 'shuffle'
  | 'compress'
  | 'spread'
  | 'reverse'
  | 'tier-sort';

/**
 * View modes for the match grid
 */
export type ViewMode =
  | 'podium'
  | 'goat'
  | 'rushmore'
  | 'bracket'
  | 'tierlist';

/**
 * User preferences database record
 */
export interface UserPreferences {
  user_id: string;

  // Direction 1: Community Wisdom preferences
  show_consensus_badges: boolean;
  consensus_overlay_enabled: boolean;
  consensus_overlay_opacity: number;

  // Direction 2: Smart Seeding preferences
  default_seeding_strategy: SeedingStrategy;
  default_arrange_mode: ArrangeMode;
  preserve_podium: boolean;

  // Direction 3: AI Results preferences
  default_ai_style: string;
  ai_history_enabled: boolean;
  preferred_ai_provider: 'leonardo' | 'replicate' | 'openai' | 'mock';

  // General UI preferences
  default_view_mode: ViewMode;
  show_tutorial_hints: boolean;
  items_per_page: number;
  theme: 'dark' | 'light' | 'system';

  // Feature flags
  feature_flags: Record<string, boolean>;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * User preferences for client-side state (camelCase)
 */
export interface UserPreferencesClient {
  userId: string;

  // Direction 1
  showConsensusBadges: boolean;
  consensusOverlayEnabled: boolean;
  consensusOverlayOpacity: number;

  // Direction 2
  defaultSeedingStrategy: SeedingStrategy;
  defaultArrangeMode: ArrangeMode;
  preservePodium: boolean;

  // Direction 3
  defaultAIStyle: AIStylePreset | string;
  aiHistoryEnabled: boolean;
  preferredAIProvider: 'leonardo' | 'replicate' | 'openai' | 'mock';

  // General
  defaultViewMode: ViewMode;
  showTutorialHints: boolean;
  itemsPerPage: number;
  theme: 'dark' | 'light' | 'system';

  // Feature flags
  featureFlags: Record<string, boolean>;
}

/**
 * Default user preferences
 */
export const DEFAULT_USER_PREFERENCES: UserPreferencesClient = {
  userId: '',

  // Direction 1
  showConsensusBadges: true,
  consensusOverlayEnabled: false,
  consensusOverlayOpacity: 0.7,

  // Direction 2
  defaultSeedingStrategy: 'random',
  defaultArrangeMode: 'auto',
  preservePodium: true,

  // Direction 3
  defaultAIStyle: 'Dynamic',
  aiHistoryEnabled: true,
  preferredAIProvider: 'leonardo',

  // General
  defaultViewMode: 'podium',
  showTutorialHints: true,
  itemsPerPage: 50,
  theme: 'dark',

  // Feature flags
  featureFlags: {},
};

/**
 * Convert database record to client format
 */
export function toClientPreferences(db: UserPreferences): UserPreferencesClient {
  return {
    userId: db.user_id,
    showConsensusBadges: db.show_consensus_badges,
    consensusOverlayEnabled: db.consensus_overlay_enabled,
    consensusOverlayOpacity: db.consensus_overlay_opacity,
    defaultSeedingStrategy: db.default_seeding_strategy,
    defaultArrangeMode: db.default_arrange_mode,
    preservePodium: db.preserve_podium,
    defaultAIStyle: db.default_ai_style,
    aiHistoryEnabled: db.ai_history_enabled,
    preferredAIProvider: db.preferred_ai_provider,
    defaultViewMode: db.default_view_mode,
    showTutorialHints: db.show_tutorial_hints,
    itemsPerPage: db.items_per_page,
    theme: db.theme,
    featureFlags: db.feature_flags,
  };
}

/**
 * Convert client format to database record
 */
export function toDatabasePreferences(client: UserPreferencesClient): Partial<UserPreferences> {
  return {
    user_id: client.userId,
    show_consensus_badges: client.showConsensusBadges,
    consensus_overlay_enabled: client.consensusOverlayEnabled,
    consensus_overlay_opacity: client.consensusOverlayOpacity,
    default_seeding_strategy: client.defaultSeedingStrategy,
    default_arrange_mode: client.defaultArrangeMode,
    preserve_podium: client.preservePodium,
    default_ai_style: client.defaultAIStyle as string,
    ai_history_enabled: client.aiHistoryEnabled,
    preferred_ai_provider: client.preferredAIProvider,
    default_view_mode: client.defaultViewMode,
    show_tutorial_hints: client.showTutorialHints,
    items_per_page: client.itemsPerPage,
    theme: client.theme,
    feature_flags: client.featureFlags,
  };
}
