/**
 * List Intent - Semantic Layer for List Creation
 *
 * This module defines the ListIntent type, a first-class architectural concept that represents
 * what the user wants to create before it becomes an actual list. It serves as the single source
 * of truth from user selection through API submission.
 *
 * The ListIntent flows through the entire creation pipeline:
 * 1. Preset/Showcase card click → populates ListIntent
 * 2. Template/Blueprint selection → transforms to ListIntent
 * 3. User modifications in modal → updates ListIntent
 * 4. API submission → transforms ListIntent to CreateListRequest
 *
 * This design enables:
 * - Elimination of sync bugs between stores
 * - Undo/redo for list creation
 * - Saving draft intents
 * - Sharing list templates
 * - A/B testing different preset configurations
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Color scheme for visual theming of lists
 */
export interface ListIntentColor {
  primary: string;
  secondary: string;
  accent: string;
}

/**
 * Time period specification for list filtering
 */
export type ListIntentTimePeriod = 'all-time' | 'decade' | 'year';

/**
 * Valid hierarchy sizes for lists
 */
export type ListIntentSize = 10 | 25 | 50 | 100;

/**
 * Sources from which a ListIntent can be created
 */
export type ListIntentSource =
  | 'create'       // Fresh creation
  | 'preset'       // From showcase card
  | 'template'     // From template gallery
  | 'clone'        // From existing list
  | 'blueprint';   // From shareable blueprint

/**
 * ListIntent - The core semantic type representing the user's list creation intent
 *
 * This immutable specification captures all the information needed to create a list,
 * from the moment the user expresses their intent until API submission.
 */
export interface ListIntent {
  // ---- Core Configuration ----
  /** Primary category (e.g., "Sports", "Music", "Games", "Stories") */
  category: string;

  /** Optional subcategory (e.g., "Basketball" for Sports) */
  subcategory?: string;

  /** Time period filter for items */
  timePeriod: ListIntentTimePeriod;

  /** Number of items in the ranking */
  size: number;

  // ---- Time Period Details ----
  /** Selected decade when timePeriod is 'decade' (e.g., "2020") */
  selectedDecade?: string;

  /** Selected year when timePeriod is 'year' (e.g., "2024") */
  selectedYear?: string;

  // ---- Display & Identity ----
  /** Custom title for the list (optional, will be auto-generated if not provided) */
  title?: string;

  /** Description of the list */
  description?: string;

  /** Color scheme for visual theming */
  color: ListIntentColor;

  // ---- Metadata ----
  /** Whether this is a predefined (quick create) configuration */
  isPredefined: boolean;

  /** Source of this intent */
  source: ListIntentSource;

  /** Reference to source entity ID (template, blueprint, or list being cloned) */
  sourceId?: string;

  // ---- Timestamps (for drafts/history) ----
  /** When this intent was created */
  createdAt?: string;

  /** When this intent was last modified */
  modifiedAt?: string;
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default color scheme
 */
export const DEFAULT_LIST_INTENT_COLOR: ListIntentColor = {
  primary: '#f59e0b',
  secondary: '#d97706',
  accent: '#fbbf24',
} as const;

/**
 * Default ListIntent for fresh creation
 */
export const DEFAULT_LIST_INTENT: ListIntent = {
  category: 'Sports',
  subcategory: 'Basketball',
  timePeriod: 'all-time',
  size: 50,
  selectedDecade: '2020',
  selectedYear: '2024',
  color: DEFAULT_LIST_INTENT_COLOR,
  isPredefined: true,
  source: 'create',
} as const;

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new ListIntent with optional partial overrides
 */
export function createListIntent(partial?: Partial<ListIntent>): ListIntent {
  return {
    ...DEFAULT_LIST_INTENT,
    ...partial,
    color: {
      ...DEFAULT_LIST_INTENT_COLOR,
      ...partial?.color,
    },
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
  };
}

/**
 * Create a ListIntent from a preset (showcase card)
 */
export interface PresetConfig {
  category?: string;
  subcategory?: string;
  timePeriod?: ListIntentTimePeriod;
  hierarchy?: string; // e.g., "Top 50"
  title?: string;
  color?: ListIntentColor;
}

export function createListIntentFromPreset(preset: PresetConfig): ListIntent {
  const size = preset.hierarchy
    ? parseInt(preset.hierarchy.replace('Top ', ''), 10)
    : DEFAULT_LIST_INTENT.size;

  return createListIntent({
    category: preset.category ?? DEFAULT_LIST_INTENT.category,
    subcategory: preset.subcategory,
    timePeriod: preset.timePeriod ?? DEFAULT_LIST_INTENT.timePeriod,
    size,
    title: preset.title,
    color: preset.color,
    isPredefined: true,
    source: 'preset',
  });
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validation result for ListIntent
 */
export interface ListIntentValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate a ListIntent for API submission
 */
export function validateListIntent(intent: ListIntent): ListIntentValidation {
  const errors: string[] = [];

  if (!intent.category || intent.category.trim() === '') {
    errors.push('Category is required');
  }

  if (!intent.timePeriod) {
    errors.push('Time period is required');
  }

  if (intent.size < 1 || intent.size > 100) {
    errors.push('Size must be between 1 and 100');
  }

  if (intent.timePeriod === 'decade' && !intent.selectedDecade) {
    errors.push('Decade is required when time period is "decade"');
  }

  if (intent.timePeriod === 'year' && !intent.selectedYear) {
    errors.push('Year is required when time period is "year"');
  }

  if (!intent.color?.primary || !intent.color?.secondary || !intent.color?.accent) {
    errors.push('Complete color scheme is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Update Helpers
// ============================================================================

/**
 * Update a ListIntent immutably
 */
export function updateListIntent(
  intent: ListIntent,
  updates: Partial<ListIntent>
): ListIntent {
  return {
    ...intent,
    ...updates,
    color: updates.color
      ? { ...intent.color, ...updates.color }
      : intent.color,
    isPredefined: false, // Any user modification marks it as not predefined
    modifiedAt: new Date().toISOString(),
  };
}

/**
 * Update category and reset subcategory if needed
 */
export function updateListIntentCategory(
  intent: ListIntent,
  category: string,
  defaultSubcategory?: string
): ListIntent {
  return updateListIntent(intent, {
    category,
    subcategory: defaultSubcategory,
  });
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if an object is a valid ListIntent
 */
export function isListIntent(obj: unknown): obj is ListIntent {
  if (!obj || typeof obj !== 'object') return false;

  const intent = obj as Record<string, unknown>;

  return (
    typeof intent.category === 'string' &&
    typeof intent.timePeriod === 'string' &&
    ['all-time', 'decade', 'year'].includes(intent.timePeriod as string) &&
    typeof intent.size === 'number' &&
    typeof intent.color === 'object' &&
    intent.color !== null &&
    typeof (intent.color as Record<string, unknown>).primary === 'string' &&
    typeof (intent.color as Record<string, unknown>).secondary === 'string' &&
    typeof (intent.color as Record<string, unknown>).accent === 'string' &&
    typeof intent.isPredefined === 'boolean' &&
    typeof intent.source === 'string'
  );
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serialize a ListIntent for storage or transmission
 */
export function serializeListIntent(intent: ListIntent): string {
  return JSON.stringify(intent);
}

/**
 * Deserialize a ListIntent from storage
 */
export function deserializeListIntent(data: string): ListIntent | null {
  try {
    const parsed = JSON.parse(data);
    if (isListIntent(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
