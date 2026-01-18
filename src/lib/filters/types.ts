/**
 * Advanced Multi-Filter System Types
 * Type definitions for filter engine, presets, and UI components
 */

/**
 * Filter operator types
 */
export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'between'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty'
  | 'matches_regex';

/**
 * Filter value types
 */
export type FilterValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'enum';

/**
 * Logic combinator
 */
export type FilterCombinator = 'AND' | 'OR';

/**
 * Single filter condition
 */
export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: FilterValue;
  valueType: FilterValueType;
  enabled: boolean;
}

/**
 * Filter value - can be single or range
 */
export type FilterValue =
  | string
  | number
  | boolean
  | Date
  | string[]
  | number[]
  | { min: number; max: number }
  | { min: Date; max: Date }
  | null;

/**
 * Filter group - combines conditions with logic
 */
export interface FilterGroup {
  id: string;
  combinator: FilterCombinator;
  conditions: FilterCondition[];
  groups: FilterGroup[];
  enabled: boolean;
}

/**
 * Complete filter configuration
 */
export interface FilterConfig {
  rootCombinator: FilterCombinator;
  groups: FilterGroup[];
  conditions: FilterCondition[];
}

/**
 * Filter preset - saved filter configuration
 */
export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  config: FilterConfig;
  isDefault?: boolean;
  isQuickFilter?: boolean;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  listId?: string;
  categoryId?: string;
}

/**
 * Quick filter chip
 */
export interface QuickFilter {
  id: string;
  label: string;
  icon?: string;
  config: FilterConfig;
  badge?: string | number;
  color?: string;
  isActive?: boolean;
}

/**
 * Filter field definition - describes a filterable field
 */
export interface FilterFieldDefinition {
  id: string;
  name: string;
  field: string;
  type: FilterValueType;
  operators: FilterOperator[];
  defaultOperator: FilterOperator;
  placeholder?: string;
  options?: FilterFieldOption[];
  range?: { min: number; max: number };
  dateRange?: { min: Date; max: Date };
  searchable?: boolean;
  sortable?: boolean;
  groupable?: boolean;
  icon?: string;
}

/**
 * Filter field option - for enum/select fields
 */
export interface FilterFieldOption {
  value: string | number;
  label: string;
  icon?: string;
  count?: number;
}

/**
 * Filter statistics
 */
export interface FilterStatistics {
  totalItems: number;
  matchedItems: number;
  matchPercentage: number;
  activeFilters: number;
  fieldDistribution: Record<string, FieldDistribution>;
  lastUpdated: Date;
}

/**
 * Field value distribution
 */
export interface FieldDistribution {
  field: string;
  values: Array<{
    value: string | number;
    count: number;
    percentage: number;
  }>;
  min?: number;
  max?: number;
  average?: number;
}

/**
 * Smart filter suggestion
 */
export interface SmartFilterSuggestion {
  id: string;
  type: 'narrow' | 'expand' | 'alternative' | 'complement';
  label: string;
  description: string;
  config: FilterConfig;
  estimatedMatches: number;
  confidence: number;
  reasoning?: string;
}

/**
 * Filter result
 */
export interface FilterResult<T> {
  items: T[];
  total: number;
  matched: number;
  executionTime: number;
  appliedFilters: FilterCondition[];
}

/**
 * Filter engine options
 */
export interface FilterEngineOptions {
  caseSensitive?: boolean;
  fuzzyMatching?: boolean;
  fuzzyThreshold?: number;
  debounceMs?: number;
  maxResults?: number;
  includeScores?: boolean;
}

/**
 * Filter state
 */
export interface FilterState {
  config: FilterConfig;
  presets: FilterPreset[];
  activePresetId: string | null;
  quickFilters: QuickFilter[];
  statistics: FilterStatistics | null;
  suggestions: SmartFilterSuggestion[];
  isLoading: boolean;
  lastApplied: Date | null;
  searchTerm: string;
  selectedFields: string[];
}

/**
 * Filter actions
 */
export interface FilterActions {
  // Condition management
  addCondition: (condition: Omit<FilterCondition, 'id'>) => void;
  updateCondition: (id: string, updates: Partial<FilterCondition>) => void;
  removeCondition: (id: string) => void;
  toggleCondition: (id: string) => void;

  // Group management
  addGroup: (parentId?: string) => void;
  updateGroup: (id: string, updates: Partial<FilterGroup>) => void;
  removeGroup: (id: string) => void;
  toggleGroup: (id: string) => void;

  // Preset management
  savePreset: (name: string, description?: string) => void;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  updatePreset: (presetId: string, updates: Partial<FilterPreset>) => void;

  // Quick filters
  setQuickFilters: (filters: QuickFilter[]) => void;
  toggleQuickFilter: (id: string) => void;

  // Global actions
  setCombinator: (combinator: FilterCombinator) => void;
  setSearchTerm: (term: string) => void;
  clearAll: () => void;
  reset: () => void;

  // Apply
  applyFilters: <T>(items: T[]) => FilterResult<T>;
}

/**
 * Filter store type
 */
export type FilterStore = FilterState & FilterActions;

/**
 * Storage keys
 */
export const FILTER_STORAGE_KEYS = {
  PRESETS: 'goat_filter_presets',
  LAST_CONFIG: 'goat_filter_last_config',
  QUICK_FILTERS: 'goat_filter_quick',
} as const;
