'use client';

/**
 * CollectionFilterIntegration
 *
 * Integrates FilterEngine, FullTextSearcher, and SmartQueryParser
 * with the Collection system. Provides unified search and filter capabilities.
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
import type { FilterConfig, FilterCondition, FilterCombinator, FilterResult } from './types';
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
  searchResults: FilterableItem[];
  searchStats: SearchStats | null;
  isSearching: boolean;

  // Smart query
  parsedQuery: ParseResult | null;
  suggestions: QuerySuggestion[];

  // Filter config
  filterConfig: FilterConfig;
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
 * Context
 */
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
  } catch {
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
  } catch {
    // Ignore storage errors
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
  const [filterConfig, setFilterConfigState] = useState<FilterConfig>(EMPTY_FILTER_CONFIG);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>(() =>
    persistHistory ? loadHistory() : []
  );
  const [isSearching, setIsSearching] = useState(false);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Build search index when items change
  useEffect(() => {
    if (items.length > 0 && searcherRef.current) {
      searcherRef.current.buildIndex(items);
    }
  }, [items]);

  // Parse query
  const parsedQuery = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return parserRef.current!.parse(searchQuery);
  }, [searchQuery]);

  // Combined filtering and searching
  const { filteredItems, filterResult, searchStats } = useMemo(() => {
    const startTime = performance.now();

    let result = items;
    let searchStatsResult: SearchStats | null = null;
    let filterResultData: FilterResult<FilterableItem> | null = null;

    // First: Apply full-text search if there's a search term
    if (parsedQuery?.searchTerm && searcherRef.current) {
      const searchResult = searcherRef.current.search(parsedQuery.searchTerm);
      result = searchResult.results.map((r) => r.item);
      searchStatsResult = searchResult.stats;
    } else if (searchQuery.trim() && !parsedQuery?.matches.length && searcherRef.current) {
      // Pure search query without parsed filters
      const searchResult = searcherRef.current.search(searchQuery);
      result = searchResult.results.map((r) => r.item);
      searchStatsResult = searchResult.stats;
    }

    // Second: Apply filter config (from smart query or manual filters)
    const effectiveConfig = parsedQuery?.config || filterConfig;
    const hasFilters =
      effectiveConfig.conditions.length > 0 || effectiveConfig.groups.length > 0;

    if (hasFilters && filterEngineRef.current) {
      filterResultData = filterEngineRef.current.apply(result, effectiveConfig);
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
  }, [items, searchQuery, parsedQuery, filterConfig]);

  // Suggestions
  const suggestions = useMemo(() => {
    if (!parsedQuery) return [];
    return parsedQuery.suggestions;
  }, [parsedQuery]);

  // Actions
  const setSearchQuery = useCallback(
    (query: string) => {
      // Debounce search
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
    setSearchQueryState('');
    setActivePresetId(null);
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

  // Build context value
  const value: FilterIntegrationContextValue = {
    // State
    searchQuery,
    searchResults: filteredItems,
    searchStats,
    isSearching,
    parsedQuery,
    suggestions,
    filterConfig,
    activePresetId,
    filteredItems,
    filterResult,
    searchHistory,
    totalItems: items.length,
    matchedItems: filteredItems.length,
    executionTime: searchStats?.executionTime || filterResult?.executionTime || 0,

    // Actions
    setSearchQuery,
    clearSearch,
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
  };

  return (
    <FilterIntegrationContext.Provider value={value}>
      {children}
    </FilterIntegrationContext.Provider>
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
