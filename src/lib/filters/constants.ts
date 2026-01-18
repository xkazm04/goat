/**
 * Advanced Multi-Filter System Constants
 * Configuration values for the filter engine and UI
 */

import type {
  FilterOperator,
  FilterValueType,
  FilterFieldDefinition,
  QuickFilter,
  FilterCombinator,
  FilterConfig,
} from './types';

/**
 * Operator labels for UI display
 */
export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: 'equals',
  not_equals: 'does not equal',
  contains: 'contains',
  not_contains: 'does not contain',
  starts_with: 'starts with',
  ends_with: 'ends with',
  greater_than: 'greater than',
  less_than: 'less than',
  greater_equal: 'at least',
  less_equal: 'at most',
  between: 'between',
  in: 'is one of',
  not_in: 'is not one of',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
  matches_regex: 'matches pattern',
};

/**
 * Operators available for each value type
 */
export const TYPE_OPERATORS: Record<FilterValueType, FilterOperator[]> = {
  string: [
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'starts_with',
    'ends_with',
    'is_empty',
    'is_not_empty',
    'matches_regex',
  ],
  number: [
    'equals',
    'not_equals',
    'greater_than',
    'less_than',
    'greater_equal',
    'less_equal',
    'between',
    'is_empty',
    'is_not_empty',
  ],
  boolean: ['equals', 'not_equals'],
  date: [
    'equals',
    'not_equals',
    'greater_than',
    'less_than',
    'greater_equal',
    'less_equal',
    'between',
    'is_empty',
    'is_not_empty',
  ],
  array: ['contains', 'not_contains', 'is_empty', 'is_not_empty', 'in', 'not_in'],
  enum: ['equals', 'not_equals', 'in', 'not_in'],
};

/**
 * Default field definitions for collection items
 */
export const DEFAULT_FILTER_FIELDS: FilterFieldDefinition[] = [
  {
    id: 'title',
    name: 'Title',
    field: 'title',
    type: 'string',
    operators: TYPE_OPERATORS.string,
    defaultOperator: 'contains',
    placeholder: 'Search by title...',
    searchable: true,
    sortable: true,
    icon: '📝',
  },
  {
    id: 'category',
    name: 'Category',
    field: 'category',
    type: 'enum',
    operators: TYPE_OPERATORS.enum,
    defaultOperator: 'equals',
    searchable: true,
    groupable: true,
    icon: '📁',
  },
  {
    id: 'subcategory',
    name: 'Subcategory',
    field: 'subcategory',
    type: 'enum',
    operators: TYPE_OPERATORS.enum,
    defaultOperator: 'equals',
    searchable: true,
    groupable: true,
    icon: '📂',
  },
  {
    id: 'ranking',
    name: 'Rating',
    field: 'ranking',
    type: 'number',
    operators: TYPE_OPERATORS.number,
    defaultOperator: 'greater_equal',
    range: { min: 0, max: 5 },
    sortable: true,
    icon: '⭐',
  },
  {
    id: 'tags',
    name: 'Tags',
    field: 'tags',
    type: 'array',
    operators: TYPE_OPERATORS.array,
    defaultOperator: 'contains',
    searchable: true,
    icon: '🏷️',
  },
  {
    id: 'used',
    name: 'Placed in Grid',
    field: 'used',
    type: 'boolean',
    operators: TYPE_OPERATORS.boolean,
    defaultOperator: 'equals',
    icon: '📍',
  },
  {
    id: 'description',
    name: 'Description',
    field: 'description',
    type: 'string',
    operators: TYPE_OPERATORS.string,
    defaultOperator: 'contains',
    placeholder: 'Search in description...',
    searchable: true,
    icon: '📄',
  },
];

/**
 * Default quick filters
 */
export const DEFAULT_QUICK_FILTERS: QuickFilter[] = [
  {
    id: 'unranked',
    label: 'Unranked',
    icon: '📋',
    config: {
      rootCombinator: 'AND',
      groups: [],
      conditions: [
        {
          id: 'unranked-condition',
          field: 'used',
          operator: 'equals',
          value: false,
          valueType: 'boolean',
          enabled: true,
        },
      ],
    },
  },
  {
    id: 'top-rated',
    label: 'Top Rated',
    icon: '⭐',
    config: {
      rootCombinator: 'AND',
      groups: [],
      conditions: [
        {
          id: 'top-rated-condition',
          field: 'ranking',
          operator: 'greater_equal',
          value: 4,
          valueType: 'number',
          enabled: true,
        },
      ],
    },
  },
  {
    id: 'has-tags',
    label: 'Tagged',
    icon: '🏷️',
    config: {
      rootCombinator: 'AND',
      groups: [],
      conditions: [
        {
          id: 'has-tags-condition',
          field: 'tags',
          operator: 'is_not_empty',
          value: null,
          valueType: 'array',
          enabled: true,
        },
      ],
    },
  },
  {
    id: 'no-tags',
    label: 'Untagged',
    icon: '📦',
    config: {
      rootCombinator: 'AND',
      groups: [],
      conditions: [
        {
          id: 'no-tags-condition',
          field: 'tags',
          operator: 'is_empty',
          value: null,
          valueType: 'array',
          enabled: true,
        },
      ],
    },
  },
];

/**
 * Empty filter config
 */
export const EMPTY_FILTER_CONFIG: FilterConfig = {
  rootCombinator: 'AND',
  groups: [],
  conditions: [],
};

/**
 * Filter engine default options
 */
export const DEFAULT_FILTER_OPTIONS = {
  caseSensitive: false,
  fuzzyMatching: true,
  fuzzyThreshold: 0.3,
  debounceMs: 150,
  maxResults: 10000,
  includeScores: false,
} as const;

/**
 * Animation configurations
 */
export const FILTER_ANIMATIONS = {
  panel: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
    mass: 0.8,
  },
  chip: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 35,
    mass: 0.6,
  },
  transition: {
    duration: 0.2,
    ease: [0.4, 0, 0.2, 1] as const,
  },
  stagger: {
    delayChildren: 0.05,
    staggerChildren: 0.03,
  },
};

/**
 * Filter colors
 */
export const FILTER_COLORS = {
  string: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500' },
  number: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-500' },
  boolean: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-500' },
  date: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-500' },
  array: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-500' },
  enum: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-500' },
} as const;

/**
 * Combinator labels
 */
export const COMBINATOR_LABELS: Record<FilterCombinator, { label: string; description: string }> = {
  AND: {
    label: 'AND',
    description: 'All conditions must match',
  },
  OR: {
    label: 'OR',
    description: 'At least one condition must match',
  },
};

/**
 * Suggestion types
 */
export const SUGGESTION_TYPES = {
  narrow: {
    label: 'Narrow Results',
    description: 'Add more filters to find specific items',
    icon: '🎯',
  },
  expand: {
    label: 'Expand Results',
    description: 'Remove or relax filters to see more items',
    icon: '🔍',
  },
  alternative: {
    label: 'Try Instead',
    description: 'Alternative filters that might help',
    icon: '💡',
  },
  complement: {
    label: 'Also Consider',
    description: 'Additional filters you might want',
    icon: '➕',
  },
} as const;

/**
 * Preset icons
 */
export const PRESET_ICONS = [
  '🎯', '⭐', '🔥', '💎', '🎨', '🎵', '🎬', '📚',
  '🏆', '💡', '🔮', '🎪', '🌟', '🎭', '🎲', '🎸',
];

/**
 * Preset colors
 */
export const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

/**
 * Z-index layers
 */
export const FILTER_Z_INDEX = {
  panel: 30,
  dropdown: 40,
  modal: 50,
  tooltip: 60,
} as const;

/**
 * Performance thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  smallDataset: 100,
  mediumDataset: 1000,
  largeDataset: 10000,
  targetFilterTime: 50, // ms
  debounceTime: 150, // ms
  maxSuggestions: 5,
} as const;
