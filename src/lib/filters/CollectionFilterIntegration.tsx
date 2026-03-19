'use client';

/**
 * CollectionFilterIntegration
 *
 * Integrates FilterEngine, FullTextSearcher, and SmartQueryParser
 * with the Collection system. Provides unified search and filter capabilities.
 *
 * ## Ownership Contract
 *
 * This provider owns the **runtime** filter state — the canonical FilterConfig
 * that the FilterEngine evaluates against collection items each render cycle.
 * Any component that needs to read or write the active filter must go through
 * the hooks exported here (useFilterIntegration, useFilterActions, etc.).
 *
 * The visual FilterBuilder (backed by filter-builder-store) owns the
 * authoring representation. To connect the two, use `useFilterBuilderSync()`
 * which calls `toFilterConfig()` on the builder store and pushes the result
 * into this provider via `setFilterConfig()`.
 *
 * ### Data flow (unidirectional)
 *
 *   FilterBuilderStore (authoring)
 *       → toFilterConfig()
 *           → this provider's setFilterConfig()  (runtime, canonical)
 *               → FilterEngine.apply(items, config)
 *                   → filteredItems (consumed by UI)
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from 'react';
import { FilterEngine } from './FilterEngine';
import { FullTextSearcher, createCollectionSearcher, type SearchResultItem, type SearchStats } from './FullTextSearcher';
import { SmartQueryParser, parseSmartQuery, type ParseResult, type QuerySuggestion } from './SmartQueryParser';
import { FILTER_PRESETS, type FilterPresetDefinition, searchPresets } from './presets';
import type { FilterConfig, FilterCondition, FilterCombinator, FilterResult, SortConfig } from './types';
import { EMPTY_FILTER_CONFIG } from './constants';

/**
 * Collection item type (matches Collection types)
 */
export interface FilterableItem {
  id: string;
  title: string;
  name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  ranking?: number;
  used?: boolean;
  created_at?: string;
  updated_at?: string;
  image_url?: string | null;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Search history entry
 */
export interface SearchHistoryEntry {
  query: string;
  timestamp: number;
  resultCount: number;
}

/**
 * Filter integration state
 */
export interface FilterIntegrationState {
  // Search
  searchQuery: string;
  /** The display query updates instantly on every keystroke (fast path) */
  displayQuery: string;
  searchResults: FilterableItem[];
  searchStats: SearchStats | null;
  isSearching: boolean;

  // Smart query
  parsedQuery: ParseResult | null;
  suggestions: QuerySuggestion[];

  // Filter config
  filterConfig: FilterConfig;
  sortConfig: SortConfig | null;
  activePresetId: string | null;

  // Results
  filteredItems: FilterableItem[];
  filterResult: FilterResult<FilterableItem> | null;

  // History
  searchHistory: SearchHistoryEntry[];

  // Stats
  totalItems: number;
  matchedItems: number;
  executionTime: number;
}

/**
 * Filter integration actions
 */
export interface FilterIntegrationActions {
  // Search
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;

  // Sort
  setSortConfig: (sort: SortConfig | null) => void;

  // Filter config
  setFilterConfig: (config: FilterConfig) => void;
  addCondition: (condition: Omit<FilterCondition, 'id'>) => void;
  removeCondition: (conditionId: string) => void;
  updateCondition: (conditionId: string, updates: Partial<FilterCondition>) => void;
  toggleCondition: (conditionId: string) => void;
  setCombinator: (combinator: FilterCombinator) => void;
  clearFilters: () => void;

  // Presets
  applyPreset: (presetId: string) => void;
  getPresets: () => FilterPresetDefinition[];
  searchFilterPresets: (query: string) => FilterPresetDefinition[];

  // Smart query
  parseQuery: (query: string) => ParseResult;
  applyParsedQuery: (parsed: ParseResult) => void;
  getSuggestions: (partial: string) => QuerySuggestion[];

  // History
  addToHistory: (query: string, resultCount: number) => void;
  clearHistory: () => void;
  getHistorySuggestions: (partial: string) => string[];

  // Autocomplete
  getSearchSuggestions: (partial: string) => string[];

  // Manual filter
  filterItems: (items: FilterableItem[]) => FilterableItem[];
  searchItems: (items: FilterableItem[], query: string) => FilterableItem[];
}

/**
 * Combined context value
 */
export interface FilterIntegrationContextValue
  extends FilterIntegrationState,
    FilterIntegrationActions {}

/**
 * Separate contexts: state changes frequently, actions are stable
 */
const FilterIntegrationStateContext = createContext<FilterIntegrationState | undefined>(
  undefined
);
const FilterIntegrationActionsContext = createContext<FilterIntegrationActions | undefined>(
  undefined
);

// Legacy combined context for backward compat with useFilterIntegration
const FilterIntegrationContext = createContext<FilterIntegrationContextValue | undefined>(
  undefined
);

/**
 * Provider props
 */
export interface FilterIntegrationProviderProps {
  children: ReactNode;
  items: FilterableItem[];
  debounceMs?: number;
  maxHistory?: number;
  persistHistory?: boolean;
}

/**
 * Storage key for search history
 */
const HISTORY_STORAGE_KEY = 'goat-search-history';

/**
 * Load history from storage
 */
function loadHistory(): SearchHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('[CollectionFilter] loadHistory: failed to load search history from localStorage', {
      storageKey: HISTORY_STORAGE_KEY,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Save history to storage
 */
function saveHistory(history: SearchHistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('[CollectionFilter] saveHistory: failed to persist search history to localStorage', {
      storageKey: HISTORY_STORAGE_KEY,
      entryCount: history.length,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Generate condition ID
 */
function generateConditionId(): string {
  return `cond-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * FilterIntegrationProvider
 *
 * Provides unified search and filter capabilities to child components.
 */
export function FilterIntegrationProvider({
  children,
  items,
  debounceMs = 150,
  maxHistory = 20,
  persistHistory = true,
}: FilterIntegrationProviderProps) {
  // Refs for engines (singleton pattern)
  const filterEngineRef = useRef<FilterEngine<FilterableItem> | null>(null);
  const searcherRef = useRef<FullTextSearcher<FilterableItem> | null>(null);
  const parserRef = useRef<SmartQueryParser | null>(null);

  // Initialize engines
  if (!filterEngineRef.current) {
    filterEngineRef.current = new FilterEngine<FilterableItem>({
      fuzzyMatching: false,
      caseSensitive: false,
    });
  }
  if (!searcherRef.current) {
    searcherRef.current = createCollectionSearcher<FilterableItem>();
  }
  if (!parserRef.current) {
    parserRef.current = new SmartQueryParser();
  }

  // State
  const [searchQuery, setSearchQueryState] = useState('');
  const [displayQuery, setDisplayQuery] = useState('');
  const [filterConfig, setFilterConfigState] = useState<FilterConfig>(EMPTY_FILTER_CONFIG);
  const [sortConfig, setSortConfigState] = useState<SortConfig | null>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>(() =>
    persistHistory ? loadHistory() : []
  );
  const [isSearching, setIsSearching] = useState(false);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fingerprint tracking to skip redundant index rebuilds when Zustand/React
  // produces a new array reference without changing the actual content.
  const itemsFingerprintRef = useRef<string>('');
  const indexedItemsRef = useRef<FilterableItem[] | null>(null);

  // Fields to pre-index for O(1) hash lookups in FilterEngine
  const INDEXED_FIELDS = useMemo(() => ['category', 'used', 'tags', 'subcategory'], []);

  // Build search index and filter field indexes when items change
  useEffect(() => {
    if (items.length === 0) return;

    // Fast path: same reference means definitely same data
    if (items === indexedItemsRef.current) return;

    // Content fingerprint: length + sampled IDs (first, middle, last)
    const first = items[0]?.id ?? '';
    const mid = items[Math.floor(items.length / 2)]?.id ?? '';
    const last = items[items.length - 1]?.id ?? '';
    const fingerprint = `${items.length}:${first}:${mid}:${last}`;

    if (fingerprint === itemsFingerprintRef.current) {
      // Content unchanged — update ref but skip expensive rebuild
      indexedItemsRef.current = items;
      return;
    }

    // Content changed — rebuild indexes
    itemsFingerprintRef.current = fingerprint;
    indexedItemsRef.current = items;

    if (searcherRef.current) {
      searcherRef.current.buildIndex(items);
    }
    if (filterEngineRef.current) {
      filterEngineRef.current.rebuildIndexes(items, INDEXED_FIELDS);
    }
  }, [items, INDEXED_FIELDS]);

  // Parse query
  const parsedQuery = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return parserRef.current!.parse(searchQuery);
  }, [searchQuery]);

  // Combined filtering and searching — minimizes intermediate array allocations
  const { filteredItems, filterResult, searchStats } = useMemo(() => {
    const startTime = performance.now();

    let result = items;
    let searchStatsResult: SearchStats | null = null;
    let filterResultData: FilterResult<FilterableItem> | null = null;

    // Merge parsed query conditions with manual filters (instead of replacing)
    const parsedConfig = parsedQuery?.config;
    const hasParsedFilters = parsedConfig &&
      (parsedConfig.conditions.length > 0 || parsedConfig.groups.length > 0);
    const effectiveConfig = hasParsedFilters
      ? FilterEngine.mergeConfigs(filterConfig, parsedConfig)
      : filterConfig;
    const hasFilters =
      effectiveConfig.conditions.length > 0 || effectiveConfig.groups.length > 0;
    const needsFilterPass = (hasFilters || sortConfig) && filterEngineRef.current;

    // Apply full-text search if there's a search term
    const searchTerm = parsedQuery?.searchTerm
      || (searchQuery.trim() && !parsedQuery?.matches.length ? searchQuery : null);

    if (searchTerm && searcherRef.current) {
      const searchResult = searcherRef.current.search(searchTerm);
      searchStatsResult = searchResult.stats;

      if (needsFilterPass) {
        // Feed search results directly to filter engine — extract items inline
        // to avoid a separate .map() pass creating a throwaway array
        filterResultData = filterEngineRef.current!.apply(
          searchResult.results.map((r) => r.item),
          effectiveConfig,
          sortConfig,
        );
        result = filterResultData.items;
      } else {
        // No filter pass needed — extract items (single allocation)
        result = searchResult.results.map((r) => r.item);
      }
    } else if (needsFilterPass) {
      // No search, just filter/sort
      filterResultData = filterEngineRef.current!.apply(result, effectiveConfig, sortConfig);
      result = filterResultData.items;
    }

    const executionTime = performance.now() - startTime;

    return {
      filteredItems: result,
      filterResult: filterResultData,
      searchStats: searchStatsResult
        ? { ...searchStatsResult, executionTime }
        : null,
    };
  }, [items, searchQuery, parsedQuery, filterConfig, sortConfig]);

  // Suggestions
  const suggestions = useMemo(() => {
    if (!parsedQuery) return [];
    return parsedQuery.suggestions;
  }, [parsedQuery]);

  // Actions
  const setSearchQuery = useCallback(
    (query: string) => {
      // Fast path: update display query instantly for typing feedback
      setDisplayQuery(query);

      // Debounce the expensive filter+search pipeline
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setIsSearching(true);
      debounceTimerRef.current = setTimeout(() => {
        setSearchQueryState(query);
        setIsSearching(false);
      }, debounceMs);
    },
    [debounceMs]
  );

  const clearSearch = useCallback(() => {
    setDisplayQuery('');
    setSearchQueryState('');
    setIsSearching(false);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setActivePresetId(null);
  }, []);

  const setSortConfig = useCallback((sort: SortConfig | null) => {
    setSortConfigState(sort);
  }, []);

  const setFilterConfig = useCallback((config: FilterConfig) => {
    setFilterConfigState(config);
    setActivePresetId(null);
  }, []);

  const addCondition = useCallback((condition: Omit<FilterCondition, 'id'>) => {
    const newCondition: FilterCondition = {
      ...condition,
      id: generateConditionId(),
    };
    setFilterConfigState((prev) => ({
      ...prev,
      conditions: [...prev.conditions, newCondition],
    }));
    setActivePresetId(null);
  }, []);

  const removeCondition = useCallback((conditionId: string) => {
    setFilterConfigState((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((c) => c.id !== conditionId),
    }));
    setActivePresetId(null);
  }, []);

  const updateCondition = useCallback(
    (conditionId: string, updates: Partial<FilterCondition>) => {
      setFilterConfigState((prev) => ({
        ...prev,
        conditions: prev.conditions.map((c) =>
          c.id === conditionId ? { ...c, ...updates } : c
        ),
      }));
      setActivePresetId(null);
    },
    []
  );

  const toggleCondition = useCallback((conditionId: string) => {
    setFilterConfigState((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c) =>
        c.id === conditionId ? { ...c, enabled: !c.enabled } : c
      ),
    }));
  }, []);

  const setCombinator = useCallback((combinator: FilterCombinator) => {
    setFilterConfigState((prev) => ({
      ...prev,
      rootCombinator: combinator,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilterConfigState(EMPTY_FILTER_CONFIG);
    setActivePresetId(null);
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const preset = FILTER_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setFilterConfigState(preset.config);
      setActivePresetId(presetId);
    }
  }, []);

  const getPresets = useCallback(() => FILTER_PRESETS, []);

  const searchFilterPresets = useCallback((query: string) => searchPresets(query), []);

  const parseQuery = useCallback(
    (query: string) => parserRef.current!.parse(query),
    []
  );

  const applyParsedQuery = useCallback((parsed: ParseResult) => {
    if (parsed.config.conditions.length > 0 || parsed.config.groups.length > 0) {
      setFilterConfigState(parsed.config);
    }
    if (parsed.searchTerm) {
      setDisplayQuery(parsed.searchTerm);
      setSearchQueryState(parsed.searchTerm);
    }
    setActivePresetId(null);
  }, []);

  const getSuggestions = useCallback(
    (partial: string): QuerySuggestion[] => {
      const parsed = parserRef.current!.parse(partial);
      return parsed.suggestions;
    },
    []
  );

  const addToHistory = useCallback(
    (query: string, resultCount: number) => {
      if (!query.trim()) return;

      setSearchHistory((prev) => {
        // Remove duplicate if exists
        const filtered = prev.filter(
          (h) => h.query.toLowerCase() !== query.toLowerCase()
        );
        // Add new entry at beginning
        const newHistory = [
          { query, timestamp: Date.now(), resultCount },
          ...filtered,
        ].slice(0, maxHistory);

        if (persistHistory) {
          saveHistory(newHistory);
        }

        return newHistory;
      });
    },
    [maxHistory, persistHistory]
  );

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    if (persistHistory) {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    }
  }, [persistHistory]);

  const getHistorySuggestions = useCallback(
    (partial: string): string[] => {
      if (!partial.trim()) {
        return searchHistory.slice(0, 5).map((h) => h.query);
      }

      const normalizedPartial = partial.toLowerCase();
      return searchHistory
        .filter((h) => h.query.toLowerCase().includes(normalizedPartial))
        .slice(0, 5)
        .map((h) => h.query);
    },
    [searchHistory]
  );

  const getSearchSuggestions = useCallback(
    (partial: string): string[] => {
      if (!partial.trim() || !searcherRef.current) return [];
      return searcherRef.current.getSuggestions(partial, 5);
    },
    []
  );

  const filterItems = useCallback(
    (itemsToFilter: FilterableItem[]): FilterableItem[] => {
      if (!filterEngineRef.current) return itemsToFilter;
      const result = filterEngineRef.current.apply(itemsToFilter, filterConfig);
      return result.items;
    },
    [filterConfig]
  );

  const searchItems = useCallback(
    (itemsToSearch: FilterableItem[], query: string): FilterableItem[] => {
      if (!query.trim() || !searcherRef.current) return itemsToSearch;
      // Create temporary searcher for different items
      const tempSearcher = createCollectionSearcher(itemsToSearch);
      return tempSearcher.quickSearch(query);
    },
    []
  );

  // Memoize actions (stable references — these never change between renders)
  const actions: FilterIntegrationActions = useMemo(() => ({
    setSearchQuery,
    clearSearch,
    setSortConfig,
    setFilterConfig,
    addCondition,
    removeCondition,
    updateCondition,
    toggleCondition,
    setCombinator,
    clearFilters,
    applyPreset,
    getPresets,
    searchFilterPresets,
    parseQuery,
    applyParsedQuery,
    getSuggestions,
    addToHistory,
    clearHistory,
    getHistorySuggestions,
    getSearchSuggestions,
    filterItems,
    searchItems,
  }), [
    setSearchQuery, clearSearch, setSortConfig, setFilterConfig,
    addCondition, removeCondition, updateCondition, toggleCondition,
    setCombinator, clearFilters, applyPreset, getPresets, searchFilterPresets,
    parseQuery, applyParsedQuery, getSuggestions,
    addToHistory, clearHistory, getHistorySuggestions, getSearchSuggestions,
    filterItems, searchItems,
  ]);

  // Memoize state (changes when data changes)
  const stateValue: FilterIntegrationState = useMemo(() => ({
    searchQuery,
    displayQuery,
    searchResults: filteredItems,
    searchStats,
    isSearching,
    parsedQuery,
    suggestions,
    filterConfig,
    sortConfig,
    activePresetId,
    filteredItems,
    filterResult,
    searchHistory,
    totalItems: items.length,
    matchedItems: filteredItems.length,
    executionTime: searchStats?.executionTime || filterResult?.executionTime || 0,
  }), [
    searchQuery, displayQuery, filteredItems, searchStats, isSearching,
    parsedQuery, suggestions, filterConfig, sortConfig,
    activePresetId, filterResult, searchHistory, items.length,
  ]);

  // Combined value for legacy context consumers
  const value: FilterIntegrationContextValue = useMemo(
    () => ({ ...stateValue, ...actions }),
    [stateValue, actions]
  );

  return (
    <FilterIntegrationActionsContext.Provider value={actions}>
      <FilterIntegrationStateContext.Provider value={stateValue}>
        <FilterIntegrationContext.Provider value={value}>
          {children}
        </FilterIntegrationContext.Provider>
      </FilterIntegrationStateContext.Provider>
    </FilterIntegrationActionsContext.Provider>
  );
}

/**
 * Hook to access filter integration context
 */
export function useFilterIntegration(): FilterIntegrationContextValue {
  const context = useContext(FilterIntegrationContext);

  if (context === undefined) {
    throw new Error(
      'useFilterIntegration must be used within a FilterIntegrationProvider. ' +
        'Wrap your component tree with <FilterIntegrationProvider> to use this hook.'
    );
  }

  return context;
}

/**
 * Optional hook that returns undefined if not in provider
 */
export function useFilterIntegrationOptional(): FilterIntegrationContextValue | undefined {
  return useContext(FilterIntegrationContext);
}

/**
 * Hook for just search functionality
 */
export function useSearch() {
  const {
    searchQuery,
    displayQuery,
    setSearchQuery,
    clearSearch,
    filteredItems,
    isSearching,
    searchStats,
    getSearchSuggestions,
    getHistorySuggestions,
    addToHistory,
  } = useFilterIntegration();

  return {
    query: searchQuery,
    displayQuery,
    setQuery: setSearchQuery,
    clear: clearSearch,
    results: filteredItems,
    isSearching,
    stats: searchStats,
    getSuggestions: getSearchSuggestions,
    getHistorySuggestions,
    addToHistory,
  };
}

/**
 * Hook for just filter functionality
 */
export function useFilters() {
  const {
    filterConfig,
    setFilterConfig,
    addCondition,
    removeCondition,
    updateCondition,
    toggleCondition,
    setCombinator,
    clearFilters,
    applyPreset,
    getPresets,
    activePresetId,
    filteredItems,
    filterResult,
  } = useFilterIntegration();

  return {
    config: filterConfig,
    setConfig: setFilterConfig,
    addCondition,
    removeCondition,
    updateCondition,
    toggleCondition,
    setCombinator,
    clear: clearFilters,
    applyPreset,
    getPresets,
    activePresetId,
    results: filteredItems,
    filterResult,
  };
}

/**
 * Hook for just filter actions (stable — won't cause re-renders on state changes)
 */
export function useFilterActions(): FilterIntegrationActions {
  const context = useContext(FilterIntegrationActionsContext);
  if (!context) {
    throw new Error('useFilterActions must be used within a FilterIntegrationProvider');
  }
  return context;
}

/**
 * Hook for just filter state (re-renders only when state changes)
 */
export function useFilterState(): FilterIntegrationState {
  const context = useContext(FilterIntegrationStateContext);
  if (!context) {
    throw new Error('useFilterState must be used within a FilterIntegrationProvider');
  }
  return context;
}

/**
 * Hook for sort functionality
 */
export function useSort() {
  const { sortConfig, setSortConfig } = useFilterIntegration();
  return {
    sortConfig,
    setSortConfig,
  };
}

/**
 * Hook for smart query functionality
 */
export function useSmartQuery() {
  const {
    searchQuery,
    setSearchQuery,
    parsedQuery,
    suggestions,
    parseQuery,
    applyParsedQuery,
    getSuggestions,
  } = useFilterIntegration();

  return {
    query: searchQuery,
    setQuery: setSearchQuery,
    parsed: parsedQuery,
    suggestions,
    parse: parseQuery,
    apply: applyParsedQuery,
    getSuggestions,
  };
}
