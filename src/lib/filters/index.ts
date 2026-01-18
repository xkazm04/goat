/**
 * Advanced Multi-Filter System
 * Module exports for the filter engine and components
 */

// Types
export type {
  FilterOperator,
  FilterValueType,
  FilterCombinator,
  FilterCondition,
  FilterValue,
  FilterGroup,
  FilterConfig,
  FilterPreset,
  QuickFilter,
  FilterFieldDefinition,
  FilterFieldOption,
  FilterStatistics as FilterStatisticsData,
  FieldDistribution,
  SmartFilterSuggestion,
  FilterResult,
  FilterEngineOptions,
  FilterState,
  FilterActions,
  FilterStore,
} from './types';

export { FILTER_STORAGE_KEYS } from './types';

// Constants
export {
  OPERATOR_LABELS,
  TYPE_OPERATORS,
  DEFAULT_FILTER_FIELDS,
  DEFAULT_QUICK_FILTERS,
  EMPTY_FILTER_CONFIG,
  DEFAULT_FILTER_OPTIONS,
  FILTER_ANIMATIONS,
  FILTER_COLORS,
  COMBINATOR_LABELS,
  SUGGESTION_TYPES,
  PRESET_ICONS,
  PRESET_COLORS,
  FILTER_Z_INDEX,
  PERFORMANCE_THRESHOLDS,
} from './constants';

// Filter Engine
export {
  FilterEngine,
  createFilterMemo,
  defaultFilterEngine,
} from './FilterEngine';

// Components
export {
  FilterPanel,
  FilterPill,
} from './components/FilterPanel';

export {
  FilterPresetManager,
  PresetQuickAccess,
} from './components/FilterPresetManager';

export {
  QuickFilterBar,
  QuickFilterGroup,
  SearchableQuickFilters,
} from './components/QuickFilterBar';

export {
  FilterStatistics,
  MatchCountBadge,
  FilterSummary,
} from './components/FilterStatistics';

export {
  SmartFilterSuggestions,
  generateSmartSuggestions,
} from './components/SmartFilterSuggestions';
