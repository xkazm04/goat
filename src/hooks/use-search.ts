/**
 * Search Hooks
 *
 * React hooks for the unified search system.
 */

'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SearchEngine, type SearchOptions, type SearchResponse, type SearchResult, type SearchDomain } from '@/lib/search';

// =============================================================================
// Query Keys
// =============================================================================

export const searchKeys = {
  all: ['search'] as const,
  search: (query: string, options?: SearchOptions) =>
    [...searchKeys.all, query, options] as const,
  quickSearch: (query: string) =>
    [...searchKeys.all, 'quick', query] as const,
  domain: (domain: SearchDomain, query: string, options?: Omit<SearchOptions, 'domains'>) =>
    [...searchKeys.all, 'domain', domain, query, options] as const,
};

// =============================================================================
// useSearch - Full search with all features
// =============================================================================

export interface UseSearchOptions extends SearchOptions {
  /** Enable the query */
  enabled?: boolean;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Minimum query length to search */
  minQueryLength?: number;
}

export interface UseSearchReturn {
  /** Search response data */
  data: SearchResponse | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether initial fetch is loading */
  isFetching: boolean;
  /** Refetch the search */
  refetch: () => void;
}

export function useSearch(
  query: string,
  options: UseSearchOptions = {}
): UseSearchReturn {
  const {
    enabled = true,
    debounceMs = 300,
    minQueryLength = 1,
    ...searchOptions
  } = options;

  // Debounced query
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  const shouldSearch = enabled && debouncedQuery.trim().length >= minQueryLength;

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: searchKeys.search(debouncedQuery, searchOptions),
    queryFn: () => SearchEngine.search(debouncedQuery, searchOptions),
    enabled: shouldSearch,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    data,
    isLoading: shouldSearch && isLoading,
    error: error as Error | null,
    isFetching,
    refetch,
  };
}

// =============================================================================
// useQuickSearch - Fast autocomplete search
// =============================================================================

export interface UseQuickSearchOptions {
  /** Enable the query */
  enabled?: boolean;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Maximum results */
  limit?: number;
  /** Domains to search */
  domains?: SearchDomain[];
}

export interface UseQuickSearchReturn {
  /** Search results */
  results: SearchResult[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

export function useQuickSearch(
  query: string,
  options: UseQuickSearchOptions = {}
): UseQuickSearchReturn {
  const {
    enabled = true,
    debounceMs = 150,
    limit = 8,
    domains,
  } = options;

  // Debounced query with shorter delay
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  const shouldSearch = enabled && debouncedQuery.trim().length >= 1;

  const { data, isLoading, error } = useQuery({
    queryKey: searchKeys.quickSearch(debouncedQuery),
    queryFn: () => SearchEngine.quickSearch(debouncedQuery, { limit, domains }),
    enabled: shouldSearch,
    staleTime: 15 * 1000, // 15 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    results: data || [],
    isLoading: shouldSearch && isLoading,
    error: error as Error | null,
  };
}

// =============================================================================
// useDomainSearch - Search within a single domain
// =============================================================================

export interface UseDomainSearchOptions extends Omit<SearchOptions, 'domains'> {
  /** Enable the query */
  enabled?: boolean;
  /** Debounce delay in ms */
  debounceMs?: number;
}

export function useDomainSearch(
  domain: SearchDomain,
  query: string,
  options: UseDomainSearchOptions = {}
) {
  const {
    enabled = true,
    debounceMs = 300,
    ...searchOptions
  } = options;

  // Debounced query
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  const shouldSearch = enabled && debouncedQuery.trim().length >= 1;

  const { data, isLoading, error } = useQuery({
    queryKey: searchKeys.domain(domain, debouncedQuery, searchOptions),
    queryFn: () => SearchEngine.searchDomain(domain, debouncedQuery, searchOptions),
    enabled: shouldSearch,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    results: data || [],
    isLoading: shouldSearch && isLoading,
    error: error as Error | null,
  };
}

// =============================================================================
// useSearchHistory - Manage recent searches
// =============================================================================

const SEARCH_HISTORY_KEY = 'goat-search-history';
const MAX_HISTORY_ITEMS = 10;

export interface SearchHistoryEntry {
  query: string;
  timestamp: number;
  domain?: SearchDomain;
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Add search to history
  const addToHistory = useCallback((query: string, domain?: SearchDomain) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.query.toLowerCase() !== query.toLowerCase());
      const updated = [
        { query, timestamp: Date.now(), domain },
        ...filtered,
      ].slice(0, MAX_HISTORY_ITEMS);

      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // Ignore errors
      }

      return updated;
    });
  }, []);

  // Remove item from history
  const removeFromHistory = useCallback((query: string) => {
    setHistory(prev => {
      const updated = prev.filter(h => h.query.toLowerCase() !== query.toLowerCase());

      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // Ignore errors
      }

      return updated;
    });
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      // Ignore errors
    }
  }, []);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}

// =============================================================================
// useSearchInput - Combined input state management
// =============================================================================

export interface UseSearchInputOptions {
  /** Initial query */
  initialQuery?: string;
  /** Callback when search is executed */
  onSearch?: (query: string) => void;
  /** Callback when a result is selected */
  onSelect?: (result: SearchResult) => void;
  /** Domains to search */
  domains?: SearchDomain[];
}

export function useSearchInput(options: UseSearchInputOptions = {}) {
  const { initialQuery = '', onSearch, onSelect, domains } = options;

  const [query, setQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results, isLoading, error } = useQuickSearch(query, {
    enabled: isOpen,
    domains,
  });

  const { addToHistory } = useSearchHistory();

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            addToHistory(query);
            onSelect?.(results[selectedIndex]);
          } else if (query.trim()) {
            addToHistory(query);
            onSearch?.(query);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
        case 'Tab':
          if (results[selectedIndex]) {
            e.preventDefault();
            setQuery(results[selectedIndex].title);
          }
          break;
      }
    },
    [isOpen, results, selectedIndex, query, addToHistory, onSelect, onSearch]
  );

  // Handle input change
  const handleChange = useCallback((value: string) => {
    setQuery(value);
    setIsOpen(true);
  }, []);

  // Handle blur
  const handleBlur = useCallback(() => {
    // Delay to allow click on results
    setTimeout(() => setIsOpen(false), 200);
  }, []);

  // Handle focus
  const handleFocus = useCallback(() => {
    if (query.trim()) {
      setIsOpen(true);
    }
  }, [query]);

  // Select a result
  const selectResult = useCallback(
    (result: SearchResult) => {
      addToHistory(query);
      onSelect?.(result);
      setIsOpen(false);
    },
    [query, addToHistory, onSelect]
  );

  return {
    query,
    setQuery: handleChange,
    selectedIndex,
    setSelectedIndex,
    isOpen,
    setIsOpen,
    results,
    isLoading,
    error,
    inputRef,
    handleKeyDown,
    handleBlur,
    handleFocus,
    selectResult,
  };
}
