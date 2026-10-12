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
  | 'blueprint'    // From shareable blueprint
  | 'fork';        // From forking a shared ranking

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

  /** Optional criteria profile ID for multi-dimensional scoring */
  criteriaProfileId?: string;

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
 * Default color scheme — canonical value lives in category-config
 */
import { DEFAULT_LIST_COLOR } from '@/lib/config/category-config';
import { GRID_LIMITS } from '@/lib/grid/constants';

export const DEFAULT_LIST_INTENT_COLOR: ListIntentColor = DEFAULT_LIST_COLOR;

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
 * Parse a list size out of a free-text hierarchy label ("Top 50", "50",
 * "Top-50"). THE one implementation of this rule for src/types.
 *
 * `parseInt(label.replace('Top ', ''), 10)` — the shape this replaced — returns
 * NaN for every label that is not exactly `Top <digits>`, and a NaN size then
 * passes both client validators (`<` and `>` are false for NaN) and is rejected
 * by the server's assertIntRange with a 400. This never returns NaN: a label
 * carrying no digits yields the caller's fallback.
 */
export function parseHierarchySize(
  hierarchy: string | undefined | null,
  fallback: number = DEFAULT_LIST_INTENT.size
): number {
  const digits = hierarchy?.match(/\d+/);
  if (!digits) return fallback;
  const size = parseInt(digits[0], 10);
  return Number.isInteger(size) ? size : fallback;
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

  // Integrality is checked FIRST and separately, because the two comparisons
  // below are both false for NaN and for a fraction — so a size the server's
  // assertIntRange (src/lib/errors/api-error-handler.ts, `!Number.isInteger`)
  // rejects with a 400 would otherwise pass client validation. One rule, two
  // implementations: keep the range message byte-identical to the sibling rule
  // in src/lib/validation/list-intent-validator.ts so the merged error set in
  // validateListIntentComplete still deduplicates to one line.
  if (!Number.isInteger(intent.size)) {
    errors.push('Size must be a whole number');
  } else if (intent.size < GRID_LIMITS.MIN_SIZE || intent.size > GRID_LIMITS.MAX_SIZE) {
    errors.push(`Size must be between ${GRID_LIMITS.MIN_SIZE} and ${GRID_LIMITS.MAX_SIZE}`);
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
