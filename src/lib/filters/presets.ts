/**
 * Filter Presets
 * Predefined filter configurations for common use cases
 */

import type { FilterConfig, FilterCondition, QuickFilter } from './types';

/**
 * Preset category for grouping
 */
export type PresetCategory = 'status' | 'rating' | 'recency' | 'category' | 'custom';

/**
 * Filter preset definition
 */
export interface FilterPresetDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: PresetCategory;
  config: FilterConfig;
  color?: string;
  keywords?: string[]; // For search/autocomplete
}

/**
 * Generate a unique condition ID
 */
function condId(prefix: string): string {
  return `preset-${prefix}-${Date.now().toString(36)}`;
}

/**
 * Predefined filter presets
 */
export const FILTER_PRESETS: FilterPresetDefinition[] = [
  // Status presets
  {
    id: 'unplaced',
    name: 'Not in Grid',
    description: 'Items not yet placed in the ranking grid',
    icon: '📋',
    category: 'status',
    color: 'blue',
    keywords: ['unplaced', 'available', 'pending', 'backlog'],
    config: {
      rootCombinator: 'AND',
      conditions: [
        {
          id: condId('unplaced'),
          field: 'used',
          operator: 'equals',
          value: false,
          valueType: 'boolean',
          enabled: true,
        },
      ],
      groups: [],
    },
  },
  {
    id: 'placed',
    name: 'In Grid',
    description: 'Items already placed in the ranking grid',
    icon: '✅',
    category: 'status',
    color: 'green',
    keywords: ['placed', 'used', 'ranked', 'grid'],
    config: {
      rootCombinator: 'AND',
      conditions: [
        {
          id: condId('placed'),
          field: 'used',
          operator: 'equals',
          value: true,
          valueType: 'boolean',
          enabled: true,
        },
      ],
      groups: [],
    },
  },
  {
    id: 'unrated',
    name: 'Unrated',
    description: 'Items without a rating',
    icon: '❓',
    category: 'status',
    color: 'yellow',
    keywords: ['unrated', 'no rating', 'unranked'],
    config: {
      rootCombinator: 'AND',
      conditions: [
        {
          id: condId('unrated'),
          field: 'ranking',
          operator: 'is_empty',
          value: null,
          valueType: 'number',
          enabled: true,
        },
      ],
      groups: [],
    },
  },

  // Rating presets
  {
    id: 'top-rated',
    name: 'Top Rated',
    description: 'Items with 5-star rating',
    icon: '⭐',
    category: 'rating',
    color: 'yellow',
    keywords: ['top', 'best', '5 stars', 'excellent'],
    config: {
      rootCombinator: 'AND',
      conditions: [
        {
          id: condId('top'),
          field: 'ranking',
          operator: 'equals',
          value: 5,
          valueType: 'number',
          enabled: true,
        },
      ],
      groups: [],
    },
  },
  {
    id: 'high-rated',
    name: 'High Rated',
    description: 'Items rated 4 stars or higher',
    icon: '🌟',
    category: 'rating',
    color: 'orange',
    keywords: ['high', 'good', '4 stars', 'great'],
    config: {
      rootCombinator: 'AND',
      conditions: [
        {
          id: condId('high'),
          field: 'ranking',
          operator: 'greater_equal',
          value: 4,
          valueType: 'number',
          enabled: true,
        },
      ],
      groups: [],
    },
  },
  {
    id: 'low-rated',
    name: 'Low Rated',
    description: 'Items rated 2 stars or lower',
    icon: '👎',
    category: 'rating',
    color: 'red',
    keywords: ['low', 'bad', 'poor', '1 star', '2 stars'],
    config: {
      rootCombinator: 'AND',
      conditions: [
        {
          id: condId('low'),
          field: 'ranking',
          operator: 'less_equal',
          value: 2,
          valueType: 'number',
          enabled: true,
        },
      ],
      groups: [],
    },
  },

  // Recency presets
  {
    id: 'recently-added',
    name: 'Recently Added',
    description: 'Items added in the last 7 days',
    icon: '🆕',
    category: 'recency',
    color: 'purple',
    keywords: ['recent', 'new', 'latest', 'fresh'],
    config: {
      rootCombinator: 'AND',
      conditions: [
        {
          id: condId('recent'),
          field: 'created_at',
          operator: 'greater_than',
          value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          valueType: 'date',
          enabled: true,
        },
      ],
      groups: [],
    },
  },
  {
    id: 'this-month',
    name: 'This Month',
    description: 'Items added this month',
    icon: '📅',
    category: 'recency',
    color: 'cyan',
    keywords: ['month', 'current month'],
    config: {
      rootCombinator: 'AND',
      conditions: [
        {
          id: condId('month'),
          field: 'created_at',
          operator: 'greater_than',
          value: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
          valueType: 'date',
          enabled: true,
        },
      ],
      groups: [],
    },
  },

  // Combined presets
  {
    id: 'favorites-unplaced',
    name: 'Top Picks Available',
    description: 'High-rated items not yet in grid',
    icon: '💎',
    category: 'custom',
    color: 'pink',
    keywords: ['favorites', 'best available', 'top picks'],
    config: {
      rootCombinator: 'AND',
      conditions: [
        {
          id: condId('fav-rating'),
          field: 'ranking',
          operator: 'greater_equal',
          value: 4,
          valueType: 'number',
          enabled: true,
        },
        {
          id: condId('fav-unplaced'),
          field: 'used',
          operator: 'equals',
          value: false,
          valueType: 'boolean',
          enabled: true,
        },
      ],
      groups: [],
    },
  },
  {
    id: 'needs-attention',
    name: 'Needs Attention',
    description: 'Unrated or low-rated items not placed',
    icon: '⚠️',
    category: 'custom',
    color: 'amber',
    keywords: ['attention', 'review', 'pending'],
    config: {
      rootCombinator: 'AND',
      conditions: [
        {
          id: condId('attn-unplaced'),
          field: 'used',
          operator: 'equals',
          value: false,
          valueType: 'boolean',
          enabled: true,
        },
      ],
      groups: [
        {
          id: condId('attn-group'),
          combinator: 'OR',
          enabled: true,
          conditions: [
            {
              id: condId('attn-unrated'),
              field: 'ranking',
              operator: 'is_empty',
              value: null,
              valueType: 'number',
              enabled: true,
            },
            {
              id: condId('attn-low'),
              field: 'ranking',
              operator: 'less_equal',
              value: 2,
              valueType: 'number',
              enabled: true,
            },
          ],
          groups: [],
        },
      ],
    },
  },
  {
    id: 'has-tags',
    name: 'Tagged Items',
    description: 'Items with tags assigned',
    icon: '🏷️',
    category: 'status',
    color: 'teal',
    keywords: ['tagged', 'labels', 'categorized'],
    config: {
      rootCombinator: 'AND',
      conditions: [
        {
          id: condId('tagged'),
          field: 'tags',
          operator: 'is_not_empty',
          value: null,
          valueType: 'array',
          enabled: true,
        },
      ],
      groups: [],
    },
  },
];

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: PresetCategory): FilterPresetDefinition[] {
  return FILTER_PRESETS.filter((p) => p.category === category);
}

/**
 * Get preset by ID
 */
export function getPresetById(id: string): FilterPresetDefinition | undefined {
  return FILTER_PRESETS.find((p) => p.id === id);
}

/**
 * Search presets by keyword
 */
export function searchPresets(query: string): FilterPresetDefinition[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return FILTER_PRESETS;

  return FILTER_PRESETS.filter((preset) => {
    // Check name
    if (preset.name.toLowerCase().includes(normalizedQuery)) return true;
    // Check description
    if (preset.description.toLowerCase().includes(normalizedQuery)) return true;
    // Check keywords
    if (preset.keywords?.some((k) => k.toLowerCase().includes(normalizedQuery))) return true;
    return false;
  });
}

/**
 * Convert preset to QuickFilter for the filter store
 */
export function presetToQuickFilter(preset: FilterPresetDefinition): QuickFilter {
  return {
    id: preset.id,
    label: preset.name,
    icon: preset.icon,
    config: preset.config,
    isActive: false,
    color: preset.color,
  };
}

/**
 * Get all presets as QuickFilters
 */
export function getPresetsAsQuickFilters(): QuickFilter[] {
  return FILTER_PRESETS.map((preset, index) => ({
    ...presetToQuickFilter(preset),
    order: index,
  }));
}

/**
 * Create a dynamic preset based on current date/time
 */
export function createDynamicPreset(
  type: 'today' | 'this-week' | 'this-year'
): FilterPresetDefinition {
  const now = new Date();

  switch (type) {
    case 'today':
      return {
        id: 'dynamic-today',
        name: 'Added Today',
        description: 'Items added today',
        icon: '📆',
        category: 'recency',
        config: {
          rootCombinator: 'AND',
          conditions: [
            {
              id: condId('today'),
              field: 'created_at',
              operator: 'greater_than',
              value: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
              valueType: 'date',
              enabled: true,
            },
          ],
          groups: [],
        },
      };

    case 'this-week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return {
        id: 'dynamic-week',
        name: 'This Week',
        description: 'Items added this week',
        icon: '📅',
        category: 'recency',
        config: {
          rootCombinator: 'AND',
          conditions: [
            {
              id: condId('week'),
              field: 'created_at',
              operator: 'greater_than',
              value: weekStart.toISOString(),
              valueType: 'date',
              enabled: true,
            },
          ],
          groups: [],
        },
      };

    case 'this-year':
      return {
        id: 'dynamic-year',
        name: 'This Year',
        description: `Items added in ${now.getFullYear()}`,
        icon: '🗓️',
        category: 'recency',
        config: {
          rootCombinator: 'AND',
          conditions: [
            {
              id: condId('year'),
              field: 'created_at',
              operator: 'greater_than',
              value: new Date(now.getFullYear(), 0, 1).toISOString(),
              valueType: 'date',
              enabled: true,
            },
          ],
          groups: [],
        },
      };
  }
}

/**
 * Preset categories with metadata
 */
export const PRESET_CATEGORIES: Array<{
  id: PresetCategory;
  name: string;
  description: string;
}> = [
  { id: 'status', name: 'Status', description: 'Filter by item status' },
  { id: 'rating', name: 'Rating', description: 'Filter by rating/ranking' },
  { id: 'recency', name: 'Recency', description: 'Filter by when added' },
  { id: 'category', name: 'Category', description: 'Filter by category' },
  { id: 'custom', name: 'Custom', description: 'Combined filters' },
];
