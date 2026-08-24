/**
 * Filter System — Public API
 *
 * Core pipeline: FilterEngine, SmartQueryParser, FullTextSearcher (~1,500 lines)
 * UI components: import from './components/*' or './visual/*' directly
 * Faceted search: import from '@/lib/faceted-search'
 */

// ── Core types ──────────────────────────────────────────────────────────
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
  SortConfig,
  SortDirection,
} from './types';

export { FILTER_STORAGE_KEYS } from './types';

// ── Core engine ─────────────────────────────────────────────────────────
export { FilterEngine, createFilterMemo } from './FilterEngine';

// ── Full-text search ────────────────────────────────────────────────────
export {
  FullTextSearcher,
  createCollectionSearcher,
  highlightMatches,
  DEFAULT_SEARCH_CONFIG,
} from './FullTextSearcher';

export type {
  FullTextSearchConfig,
  SearchResultItem,
  SearchStats,
} from './FullTextSearcher';

// ── Smart query parser ──────────────────────────────────────────────────
export {
  SmartQueryParser,
  parseSmartQuery,
  configToQueryString,
  QUERY_TEMPLATES,
} from './SmartQueryParser';

export type {
  ParseResult,
  QuerySuggestion,
  UnresolvedSegment,
} from './SmartQueryParser';

// ── Constants ───────────────────────────────────────────────────────────
export {
  OPERATOR_LABELS,
  TYPE_OPERATORS,
  DEFAULT_FILTER_FIELDS,
  DEFAULT_QUICK_FILTERS,
  EMPTY_FILTER_CONFIG,
  DEFAULT_FILTER_OPTIONS,
  FILTER_ANIMATIONS,
  FILTER_TIMING,
  FILTER_SCALE,
  FILTER_COLORS,
  COMBINATOR_LABELS,
  SUGGESTION_TYPES,
  PRESET_ICONS,
  PRESET_COLORS,
  FILTER_Z_INDEX,
  PERFORMANCE_THRESHOLDS,
} from './constants';

// ── Integration provider ────────────────────────────────────────────────
export {
  FilterIntegrationProvider,
  useFilterIntegration,
  useFilterIntegrationOptional,
  useFilterActions,
  useFilterState,
  useSearch,
  useFilters,
  useSmartQuery,
  useSort,
} from './CollectionFilterIntegration';

export type {
  FilterableItem,
  SearchHistoryEntry,
  FilterIntegrationState,
  FilterIntegrationActions,
  FilterIntegrationContextValue,
  FilterIntegrationProviderProps,
} from './CollectionFilterIntegration';

// ── Presets ─────────────────────────────────────────────────────────────
export {
  FILTER_PRESETS,
  PRESET_CATEGORIES,
  getPresetsByCategory,
  getPresetById,
  searchPresets,
  presetToQuickFilter,
  getPresetsAsQuickFilters,
  getDefaultQuickFilters,
  getPresetSearchKeywords,
  createDynamicPreset,
} from './presets';

export type { PresetCategory, FilterPresetDefinition } from './presets';

// ── UI components (commonly used, kept for convenience) ─────────────────
export { FilterPanel, FilterPill } from './components/FilterPanel';
export { FilterPresetManager, PresetQuickAccess } from './components/FilterPresetManager';
export { QuickFilterBar, QuickFilterGroup, SearchableQuickFilters } from './components/QuickFilterBar';
export { FilterStatistics, MatchCountBadge, FilterSummary } from './components/FilterStatistics';
export { SmartFilterSuggestions, generateSmartSuggestions } from './components/SmartFilterSuggestions';
export { SearchAutocomplete, CompactSearchInput } from './components/SearchAutocomplete';
export { FilterResultsCounter, FilterCountBadge, SearchResultSummary } from './components/FilterResultsCounter';

// ── Faceted search (re-export for backward compatibility) ───────────────
// Prefer importing directly from '@/lib/faceted-search'
export {
  type FacetValue,
  type FacetDefinition,
  type Facet,
  type HierarchicalFacetNode,
  type HierarchicalFacet,
  type FacetSelection,
  type FacetState,
  type FacetBreadcrumb,
  type FacetExtractionConfig,
  type FacetAggregationResult,
  type FacetActions as FacetActionsType,
  type FacetAggregationOptions,
  type FacetCacheStats,
  type FacetContextState,
  type FacetContextValue,
  type FacetProviderProps,
  DEFAULT_FACET_DEFINITIONS,
  FacetExtractor,
  createCollectionFacetExtractor,
  FacetAggregator,
  createFacetAggregator,
  FacetPanel,
  FacetBreadcrumbs,
  GroupedFacetBreadcrumbs,
  MobileFacetDrawer,
  MobileFilterButton,
  useMobileFacetDrawer,
  useFacets,
  FacetProvider,
  useFacetContext,
  useFacetContextOptional,
} from './facets';
