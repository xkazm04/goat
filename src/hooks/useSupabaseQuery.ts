/**
 * Supabase Query Hook - TanStack Query Integration
 *
 * A unified wrapper around TanStack Query that provides:
 * - Direct Supabase client integration
 * - Consistent cache configuration from unified-cache.ts
 * - Type-safe query functions
 * - Compatible API with previous custom implementation
 *
 * @example
 * ```tsx
 * const { data, error, isLoading, refetch } = useSupabaseQuery(
 *   ['top-lists', listId],
 *   async (client) => {
 *     const { data, error } = await client
 *       .from('lists')
 *       .select('*')
 *       .eq('id', listId)
 *       .single();
 *
 *     if (error) throw error;
 *     return data;
 *   },
 *   { enabled: !!listId, preset: 'lists' }
 * );
 * ```
 */

import { useState } from 'react';
import { useQuery, useInfiniteQuery, UseQueryOptions } from '@tanstack/react-query';
import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  getCacheSettings,
  type CachePreset,
} from '@/lib/cache/unified-cache';

// =============================================================================
// Types
// =============================================================================

/**
 * Query function type - receives Supabase client and returns data
 */
export type SupabaseQueryFn<T> = (client: SupabaseClient) => Promise<T>;

/**
 * Configuration options for useSupabaseQuery
 * Extends TanStack Query options with Supabase-specific settings
 */
export interface SupabaseQueryOptions<T = unknown> {
  /** Whether the query should execute */
  enabled?: boolean;
  /** Refetch when window regains focus */
  refetchOnWindowFocus?: boolean;
  /** Auto-refetch interval in milliseconds */
  refetchInterval?: number;
  /** Time in ms before data is considered stale (overrides preset) */
  staleTime?: number;
  /** Time in ms to keep unused data in cache (overrides preset) */
  gcTime?: number;
  /** Alias for gcTime (backward compatibility) */
  cacheTime?: number;
  /** Number of retry attempts */
  retry?: number;
  /** Delay between retries in ms */
  retryDelay?: number;
  /** Callback on successful fetch */
  onSuccess?: (data: T) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Cache preset from unified-cache.ts */
  preset?: CachePreset;
  /** Initial data to use while loading */
  initialData?: T;
  /** Placeholder data while loading */
  placeholderData?: T | (() => T);
  /** Select/transform the data */
  select?: (data: T) => T;
}

/**
 * State interface for Supabase queries
 * Compatible with previous implementation for easy migration
 */
export interface SupabaseQueryState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  refetch: () => Promise<void>;
  /** Additional TanStack Query properties */
  isPending: boolean;
  isStale: boolean;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  failureCount: number;
  status: 'pending' | 'error' | 'success';
}

// =============================================================================
// Singleton Supabase Client
// =============================================================================

let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create the Supabase client singleton
 */
function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient();
  }
  return supabaseClient;
}

// =============================================================================
// Main Hook
// =============================================================================

/**
 * useSupabaseQuery - TanStack Query wrapper for Supabase queries
 *
 * Uses unified cache configuration and provides a consistent interface
 * for all Supabase data fetching operations.
 */
export function useSupabaseQuery<T = unknown>(
  queryKey: string | readonly (string | number | boolean | undefined | null)[],
  queryFn: SupabaseQueryFn<T>,
  options: SupabaseQueryOptions<T> = {}
): SupabaseQueryState<T> {
  const {
    enabled = true,
    refetchOnWindowFocus = false,
    refetchInterval,
    staleTime,
    gcTime,
    cacheTime,
    retry = 3,
    retryDelay = 1000,
    preset = 'items',
    initialData,
    placeholderData,
    select,
  } = options;

  // Get cache settings from preset or use overrides
  const presetSettings = getCacheSettings(preset);
  const finalStaleTime = staleTime ?? presetSettings.staleTime;
  const finalGcTime = gcTime ?? cacheTime ?? presetSettings.gcTime;

  // Normalize query key to array format
  const normalizedKey = Array.isArray(queryKey) ? queryKey : [queryKey];

  // Execute the query using inline options to avoid complex type inference
  const query = useQuery({
    queryKey: normalizedKey as readonly unknown[],
    queryFn: async () => {
      const client = getSupabaseClient();
      return queryFn(client);
    },
    enabled,
    refetchOnWindowFocus,
    refetchInterval,
    staleTime: finalStaleTime,
    gcTime: finalGcTime,
    retry: (failureCount, error) => {
      // Don't retry on client errors (4xx)
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('401') || message.includes('403') || message.includes('404')) {
          return false;
        }
      }
      return failureCount < retry;
    },
    retryDelay: (attemptIndex) => Math.min(retryDelay * 2 ** attemptIndex, 30000),
    initialData,
    select,
  });

  // Create a refetch wrapper that matches the old API
  const refetch = async (): Promise<void> => {
    await query.refetch();
  };

  return {
    data: query.data ?? null,
    error: query.error ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    isSuccess: query.isSuccess,
    refetch,
    // Additional TanStack Query properties
    isPending: query.isPending,
    isStale: query.isStale,
    dataUpdatedAt: query.dataUpdatedAt,
    errorUpdatedAt: query.errorUpdatedAt,
    failureCount: query.failureCount,
    status: query.status,
  };
}

// =============================================================================
// Paginated Query Hook
// =============================================================================

/**
 * Paginated query state interface
 */
export interface SupabasePaginatedQueryState<T> extends SupabaseQueryState<{ data: T[]; count: number }> {
  page: number;
  pageSize: number;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalPages: number;
}

/**
 * useSupabasePaginatedQuery - Paginated query hook
 *
 * Handles pagination state and provides navigation helpers.
 */
export function useSupabasePaginatedQuery<T = unknown>(
  queryKey: string | readonly (string | number | boolean | undefined | null)[],
  queryFn: (client: SupabaseClient, page: number, pageSize: number) => Promise<{ data: T[]; count: number }>,
  options: SupabaseQueryOptions<{ data: T[]; count: number }> & { pageSize?: number } = {}
): SupabasePaginatedQueryState<T> {
  const { pageSize = 10, ...queryOptions } = options;

  // Use React state for pagination
  const [page, setPage] = useState(0);

  // Build paginated query key
  const normalizedKey = Array.isArray(queryKey) ? queryKey : [queryKey];
  const paginatedKey = [...normalizedKey, 'page', page, 'pageSize', pageSize] as const;

  // Execute the query
  const query = useSupabaseQuery<{ data: T[]; count: number }>(
    paginatedKey,
    (client) => queryFn(client, page, pageSize),
    queryOptions
  );

  // Calculate pagination helpers
  const totalPages = query.data ? Math.ceil(query.data.count / pageSize) : 0;

  const nextPage = () => {
    if (query.data && (page + 1) * pageSize < query.data.count) {
      setPage((p) => p + 1);
    }
  };

  const previousPage = () => {
    setPage((p) => Math.max(0, p - 1));
  };

  const goToPage = (newPage: number) => {
    setPage(Math.max(0, Math.min(newPage, totalPages - 1)));
  };

  return {
    ...query,
    page,
    pageSize,
    nextPage,
    previousPage,
    goToPage,
    hasNextPage: query.data ? (page + 1) * pageSize < query.data.count : false,
    hasPreviousPage: page > 0,
    totalPages,
  };
}

// =============================================================================
// Infinite Query Hook
// =============================================================================

/**
 * Infinite query options
 */
export interface SupabaseInfiniteQueryOptions<T> extends Omit<SupabaseQueryOptions<T[]>, 'placeholderData'> {
  pageSize?: number;
  getNextPageParam?: (lastPage: T[], allPages: T[][]) => number | undefined;
}

/**
 * useSupabaseInfiniteQuery - Infinite scrolling query hook
 *
 * For infinite scroll or "load more" patterns.
 */
export function useSupabaseInfiniteQuery<T = unknown>(
  queryKey: string | readonly (string | number | boolean | undefined | null)[],
  queryFn: (client: SupabaseClient, pageParam: number, pageSize: number) => Promise<T[]>,
  options: SupabaseInfiniteQueryOptions<T> = {}
) {
  const {
    pageSize = 20,
    preset = 'items',
    staleTime,
    gcTime,
    cacheTime,
    enabled = true,
    getNextPageParam,
  } = options;

  const presetSettings = getCacheSettings(preset);
  const normalizedKey = Array.isArray(queryKey) ? queryKey : [queryKey];

  const query = useInfiniteQuery({
    queryKey: normalizedKey as readonly unknown[],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const client = getSupabaseClient();
      return queryFn(client, pageParam, pageSize);
    },
    initialPageParam: 0,
    getNextPageParam: getNextPageParam ?? ((lastPage: T[]) => {
      // Default: if we got a full page, there might be more
      if (lastPage.length === pageSize) {
        return (lastPage.length / pageSize);
      }
      return undefined;
    }),
    enabled,
    staleTime: staleTime ?? presetSettings.staleTime,
    gcTime: gcTime ?? cacheTime ?? presetSettings.gcTime,
  });

  return {
    data: query.data?.pages.flat() ?? null,
    pages: query.data?.pages ?? [],
    error: query.error ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    isSuccess: query.isSuccess,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: async () => { await query.refetch(); },
  };
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a typed query hook for a specific table/resource
 *
 * @example
 * ```tsx
 * const useListQuery = createSupabaseQueryHook<List>('lists', {
 *   preset: 'lists',
 * });
 *
 * // Usage
 * const { data } = useListQuery(
 *   ['list', id],
 *   (client) => client.from('lists').select('*').eq('id', id).single().then(r => r.data)
 * );
 * ```
 */
export function createSupabaseQueryHook<T>(
  defaultPreset: CachePreset,
  defaultOptions: Partial<SupabaseQueryOptions<T>> = {}
) {
  return function useTypedSupabaseQuery(
    queryKey: string | readonly (string | number | boolean | undefined | null)[],
    queryFn: SupabaseQueryFn<T>,
    options: SupabaseQueryOptions<T> = {}
  ) {
    return useSupabaseQuery<T>(queryKey, queryFn, {
      preset: defaultPreset,
      ...defaultOptions,
      ...options,
    });
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the Supabase client for direct use
 * Useful when you need to make queries outside of hooks
 */
export function getSupabase(): SupabaseClient {
  return getSupabaseClient();
}

/**
 * Reset the Supabase client singleton (for testing)
 */
export function resetSupabaseClient(): void {
  supabaseClient = null;
}
