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

// Visual Filter Builder
export {
  FilterBuilder,
  CompactFilterBuilder,
  FilterBlock,
  FilterBlockOverlay,
  FilterGroup as FilterGroupComponent,
  FilterGroupOverlay,
  RootCombinatorToggle,
  FilterPreview,
  FilterPreviewBadge,
  FilterSaver,
  FilterActions as FilterActionsToolbar,
  OperatorSelector,
  OperatorBadge,
  ValueInput,
  ValueDisplay,
  FilterTemplates,
  TemplateQuickSelect,
  FILTER_TEMPLATES,
} from './visual';

// Full-Text Search
export {
  FullTextSearcher,
  createCollectionSearcher,
  highlightMatches,
  defaultSearcher,
  DEFAULT_SEARCH_CONFIG,
} from './FullTextSearcher';

export type {
  FullTextSearchConfig,
  SearchResultItem,
  SearchStats,
} from './FullTextSearcher';

// Smart Query Parser
export {
  SmartQueryParser,
  parseSmartQuery,
  configToQueryString,
  defaultQueryParser,
  QUERY_TEMPLATES,
} from './SmartQueryParser';

export type {
  ParseResult,
  QuerySuggestion,
} from './SmartQueryParser';

// Filter Presets
export {
  FILTER_PRESETS,
  PRESET_CATEGORIES,
  getPresetsByCategory,
  getPresetById,
  searchPresets,
  presetToQuickFilter,
  getPresetsAsQuickFilters,
  createDynamicPreset,
} from './presets';

export type {
  PresetCategory,
  FilterPresetDefinition,
} from './presets';

// Collection Filter Integration
export {
  FilterIntegrationProvider,
  useFilterIntegration,
  useFilterIntegrationOptional,
  useSearch,
  useFilters,
  useSmartQuery,
} from './CollectionFilterIntegration';

export type {
  FilterableItem,
  SearchHistoryEntry,
  FilterIntegrationState,
  FilterIntegrationActions,
  FilterIntegrationContextValue,
  FilterIntegrationProviderProps,
} from './CollectionFilterIntegration';

// Search Autocomplete Component
export {
  SearchAutocomplete,
  CompactSearchInput,
} from './components/SearchAutocomplete';

// Filter Results Counter Component
export {
  FilterResultsCounter,
  FilterCountBadge,
  SearchResultSummary,
} from './components/FilterResultsCounter';
