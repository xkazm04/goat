/**
 * List Intent Transformers
 *
 * This module provides typed transformation pipelines for converting between
 * ListIntent and various other data formats used throughout the application.
 *
 * Pipeline stages:
 * 1. Source → ListIntent (from templates, blueprints, existing lists, presets)
 * 2. ListIntent → API Request (for list creation)
 * 3. ListIntent → UI Props (for component rendering)
 * 4. ListIntent → Metadata (for list store and session)
 */

import {
  ListIntent,
  ListIntentColor,
  ListIntentTimePeriod,
  createListIntent,
  DEFAULT_LIST_INTENT_COLOR,
  DEFAULT_LIST_INTENT,
} from './list-intent';
import { ListTemplate } from './templates';
import { TopList } from './top-lists';
import { Blueprint } from './blueprint';
import { getDefaultSubcategory, getInitialSubcategory } from '@/lib/config/category-config';

// ============================================================================
// API Request Types
// ============================================================================

/**
 * Request format for creating a list via API
 */
export interface CreateListRequest {
  title: string;
  category: string;
  subcategory?: string;
  size: number;
  time_period: string;
  description?: string;
  user: {
    email: string;
    name?: string;
  };
  metadata?: {
    selectedDecade?: string;
    selectedYear?: string;
    color: ListIntentColor;
  };
}

// ============================================================================
// Transform: ListIntent → API Request
// ============================================================================

/**
 * Generate a title from ListIntent if not provided
 */
export function generateListTitle(intent: ListIntent): string {
  if (intent.title) return intent.title;

  let title = `Top ${intent.size} ${intent.category}`;

  if (intent.subcategory) {
    title += ` - ${intent.subcategory}`;
  }

  if (intent.timePeriod === 'decade' && intent.selectedDecade) {
    title += ` (${intent.selectedDecade}s)`;
  } else if (intent.timePeriod === 'year' && intent.selectedYear) {
    title += ` (${intent.selectedYear})`;
  }

  return title;
}

/**
 * Generate a description from ListIntent if not provided
 */
export function generateListDescription(intent: ListIntent): string {
  if (intent.description) return intent.description;

  let description = `A curated list of the top ${intent.size} ${intent.category.toLowerCase()}`;

  if (intent.subcategory) {
    description += ` in ${intent.subcategory.toLowerCase()}`;
  }

  if (intent.timePeriod === 'decade' && intent.selectedDecade) {
    description += ` from the ${intent.selectedDecade}s`;
  } else if (intent.timePeriod === 'year' && intent.selectedYear) {
    description += ` from ${intent.selectedYear}`;
  }

  return description + '.';
}

/**
 * Transform ListIntent to CreateListRequest for API submission
 */
export function listIntentToCreateRequest(
  intent: ListIntent,
  tempUserId: string
): CreateListRequest {
  return {
    title: generateListTitle(intent),
    category: intent.category,
    subcategory: intent.subcategory,
    size: intent.size,
    time_period: intent.timePeriod,
    description: generateListDescription(intent),
    user: {
      email: `temp-${tempUserId}@goat.app`,
      name: `User ${tempUserId.slice(-6)}`,
    },
    metadata: {
      selectedDecade: intent.selectedDecade,
      selectedYear: intent.selectedYear,
      color: intent.color,
    },
  };
}

// ============================================================================
// Transform: Template → ListIntent
// ============================================================================

/**
 * Transform a ListTemplate to ListIntent
 */
export function listTemplateToIntent(template: ListTemplate): ListIntent {
  const timePeriod: ListIntentTimePeriod =
    template.time_period === 'decade' || template.time_period === 'year'
      ? template.time_period
      : 'all-time';

  return createListIntent({
    category: template.category,
    subcategory: template.subcategory || getDefaultSubcategory(template.category),
    timePeriod,
    size: template.size,
    title: template.title,
    description: template.description,
    color: template.color || DEFAULT_LIST_INTENT_COLOR,
    isPredefined: true,
    source: 'template',
    sourceId: template.id,
  });
}

// ============================================================================
// Transform: TopList → ListIntent (for cloning)
// ============================================================================

/**
 * Transform an existing TopList to ListIntent for cloning
 */
export function topListToIntent(list: TopList): ListIntent {
  const timePeriod: ListIntentTimePeriod =
    list.time_period === 'decade' || list.time_period === 'year'
      ? list.time_period
      : 'all-time';

  return createListIntent({
    category: list.category,
    subcategory: list.subcategory || getDefaultSubcategory(list.category),
    timePeriod,
    size: list.size,
    title: `My ${list.title}`,
    description: list.description,
    color: DEFAULT_LIST_INTENT_COLOR,
    isPredefined: true,
    source: 'clone',
    sourceId: list.id,
  });
}

// ============================================================================
// Transform: Blueprint → ListIntent
// ============================================================================

/**
 * Transform a Blueprint to ListIntent
 */
export function blueprintToIntent(blueprint: Blueprint): ListIntent {
  return createListIntent({
    category: blueprint.category,
    subcategory: blueprint.subcategory || getDefaultSubcategory(blueprint.category),
    timePeriod: blueprint.timePeriod,
    size: blueprint.size,
    title: blueprint.title,
    description: blueprint.description,
    color: blueprint.color || DEFAULT_LIST_INTENT_COLOR,
    isPredefined: true,
    source: 'blueprint',
    sourceId: blueprint.id,
  });
}

// ============================================================================
// Transform: Preset (Showcase Card) → ListIntent
// ============================================================================

/**
 * Preset configuration from showcase cards
 */
export interface ShowcasePreset {
  category?: string;
  subcategory?: string;
  timePeriod?: ListIntentTimePeriod;
  hierarchy?: string; // e.g., "Top 50"
  title?: string;
  color?: ListIntentColor;
}

/**
 * Transform a showcase preset to ListIntent
 */
export function showcasePresetToIntent(preset: ShowcasePreset): ListIntent {
  const category = preset.category || DEFAULT_LIST_INTENT.category;
  const subcategory = getInitialSubcategory(category, preset.subcategory);
  const size = preset.hierarchy
    ? parseInt(preset.hierarchy.replace('Top ', ''), 10)
    : DEFAULT_LIST_INTENT.size;

  return createListIntent({
    category,
    subcategory,
    timePeriod: preset.timePeriod || DEFAULT_LIST_INTENT.timePeriod,
    size,
    title: preset.title || '',
    color: preset.color || DEFAULT_LIST_INTENT_COLOR,
    isPredefined: true,
    source: 'preset',
  });
}

// ============================================================================
// Transform: ListIntent → List Metadata (for stores)
// ============================================================================

/**
 * Metadata structure used by list stores
 */
export interface ListMetadata {
  size: number;
  selectedCategory: string;
  selectedSubcategory?: string;
  timePeriod: ListIntentTimePeriod;
  selectedDecade?: number;
  selectedYear?: number;
  color: ListIntentColor;
}

/**
 * Transform ListIntent to ListMetadata for store usage
 */
export function listIntentToMetadata(intent: ListIntent): ListMetadata {
  return {
    size: intent.size,
    selectedCategory: intent.category,
    selectedSubcategory: intent.subcategory,
    timePeriod: intent.timePeriod,
    selectedDecade: intent.selectedDecade ? parseInt(intent.selectedDecade, 10) : undefined,
    selectedYear: intent.selectedYear ? parseInt(intent.selectedYear, 10) : undefined,
    color: intent.color,
  };
}

// ============================================================================
// Transform: ListIntent → Blueprint Request
// ============================================================================

/**
 * Blueprint creation request
 */
export interface CreateBlueprintFromIntentRequest {
  title: string;
  category: string;
  subcategory?: string;
  size: number;
  timePeriod: ListIntentTimePeriod;
  description?: string;
  color: ListIntentColor;
}

/**
 * Transform ListIntent to blueprint creation request
 */
export function listIntentToBlueprintRequest(intent: ListIntent): CreateBlueprintFromIntentRequest {
  return {
    title: intent.title || `My ${intent.category} List`,
    category: intent.category,
    subcategory: intent.subcategory,
    size: intent.size,
    timePeriod: intent.timePeriod,
    description: intent.description,
    color: intent.color,
  };
}

// ============================================================================
// Backward Compatibility: CompositionFormData ↔ ListIntent
// ============================================================================

/**
 * Legacy CompositionFormData format (for backward compatibility)
 * @deprecated Use ListIntent directly
 */
export interface LegacyCompositionFormData {
  selectedCategory: string;
  selectedSubcategory?: string;
  timePeriod: ListIntentTimePeriod;
  selectedDecade?: string;
  selectedYear?: string;
  hierarchy: number;
  isPredefined: boolean;
  title?: string;
  description?: string;
  color: ListIntentColor;
}

/**
 * Convert legacy CompositionFormData to ListIntent
 * @deprecated For migration only
 */
export function legacyFormDataToIntent(formData: LegacyCompositionFormData): ListIntent {
  return createListIntent({
    category: formData.selectedCategory,
    subcategory: formData.selectedSubcategory,
    timePeriod: formData.timePeriod,
    size: formData.hierarchy,
    selectedDecade: formData.selectedDecade,
    selectedYear: formData.selectedYear,
    title: formData.title,
    description: formData.description,
    color: formData.color,
    isPredefined: formData.isPredefined,
    source: 'create',
  });
}

/**
 * Convert ListIntent to legacy CompositionFormData format
 * @deprecated For backward compatibility with existing components
 */
export function intentToLegacyFormData(intent: ListIntent): LegacyCompositionFormData {
  return {
    selectedCategory: intent.category,
    selectedSubcategory: intent.subcategory,
    timePeriod: intent.timePeriod,
    selectedDecade: intent.selectedDecade,
    selectedYear: intent.selectedYear,
    hierarchy: intent.size,
    isPredefined: intent.isPredefined,
    title: intent.title,
    description: intent.description,
    color: intent.color,
  };
}

// ============================================================================
// Legacy API Mapping (Backward Compatibility)
// ============================================================================

/**
 * Legacy CompositionData format
 * @deprecated Use ListIntent with listIntentToCreateRequest
 */
export interface LegacyCompositionData {
  selectedCategory: string;
  selectedSubcategory?: string;
  hierarchy: number;
  timePeriod: ListIntentTimePeriod;
  selectedDecade?: string;
  selectedYear?: string;
  color: ListIntentColor;
  title?: string;
  description?: string;
}

/**
 * Map legacy CompositionData to CreateListRequest
 * @deprecated Use listIntentToCreateRequest instead
 */
export function mapCompositionToCreateListRequest(
  compositionData: LegacyCompositionData,
  tempUserId: string
): CreateListRequest {
  // Convert to ListIntent first, then to request
  const intent = createListIntent({
    category: compositionData.selectedCategory,
    subcategory: compositionData.selectedSubcategory,
    timePeriod: compositionData.timePeriod,
    size: compositionData.hierarchy,
    selectedDecade: compositionData.selectedDecade,
    selectedYear: compositionData.selectedYear,
    title: compositionData.title,
    description: compositionData.description,
    color: compositionData.color,
    source: 'create',
  });

  return listIntentToCreateRequest(intent, tempUserId);
}
