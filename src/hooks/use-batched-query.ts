/**
 * use-batched-query - React hooks for batched API requests
 *
 * Integrates the BatchManager with React Query to provide automatic
 * request batching and deduplication for optimal performance.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
} from '@tanstack/react-query';
import {
  BatchManager,
  getGlobalBatchManager,
  type BatchManagerStats,
  type BatchRequest,
} from '@/lib/api/BatchManager';
import { type BatchPriority } from '@/lib/api/WindowScheduler';
import { CACHE_TTL_MS, GC_TIME_MS } from '@/lib/cache/unified-cache';

// =============================================================================
// Types
// =============================================================================

export interface BatchedQueryOptions<TData, TError = Error>
  extends Omit<UseQueryOptions<TData, TError, TData, QueryKey>, 'queryKey' | 'queryFn'> {
  /** Request priority (default: 'normal') */
  priority?: BatchPriority;
  /** Skip batching for this request */
  skipBatch?: boolean;
  /** Cache time preset */
  cacheTime?: 'short' | 'standard' | 'long' | 'static';
}

export interface BatchedMutationOptions<TData, TError = Error, TVariables = void>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  /** Request priority (default: 'normal') */
  priority?: BatchPriority;
  /** Skip batching for this mutation */
  skipBatch?: boolean;
}

export interface BatchedFetcherConfig {
  /** API endpoint */
  endpoint: string;
  /** HTTP method (default: 'GET') */
  method?: BatchRequest['method'];
  /** Request parameters or body */
  data?: unknown;
  /** Request priority */
  priority?: BatchPriority;
}

// =============================================================================
// Constants
// =============================================================================

const CACHE_TIMES = {
  short: CACHE_TTL_MS.SHORT,
  standard: CACHE_TTL_MS.STANDARD,
  long: CACHE_TTL_MS.LONG,
  static: CACHE_TTL_MS.STATIC,
} as const;

const GC_TIMES = {
  short: GC_TIME_MS.SHORT,
  standard: GC_TIME_MS.STANDARD,
  long: GC_TIME_MS.LONG,
  static: GC_TIME_MS.STATIC,
} as const;

// =============================================================================
// Batch Manager Integration
// =============================================================================

/**
 * Create a batched fetcher function for use with React Query
 */
export function createBatchedFetcher<T>(config: BatchedFetcherConfig): () => Promise<T> {
  const batchManager = getGlobalBatchManager();

  return () =>
    batchManager.add<T>(
      config.endpoint,
      config.method || 'GET',
      config.data,
      config.priority || 'normal'
    );
}

/**
 * Create a batched mutation function
 */
export function createBatchedMutation<T, V = unknown>(
  endpoint: string,
  method: BatchRequest['method'] = 'POST',
  priority: BatchPriority = 'normal'
): (variables: V) => Promise<T> {
  const batchManager = getGlobalBatchManager();

  return (variables: V) =>
    batchManager.add<T>(endpoint, method, variables, priority);
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook for making batched GET requests with React Query
 *
 * @example
 * ```tsx
 * // Simple batched query
 * const { data, isLoading } = useBatchedQuery(
 *   ['user', userId],
 *   `/api/users/${userId}`,
 *   { cacheTime: 'standard' }
 * );
 *
 * // With params
 * const { data } = useBatchedQuery(
 *   ['users', 'list'],
 *   '/api/users',
 *   { cacheTime: 'short' },
 *   { page: 1, limit: 10 }
 * );
 * ```
 */
export function useBatchedQuery<TData = unknown, TError = Error>(
  queryKey: QueryKey,
  endpoint: string,
  options?: BatchedQueryOptions<TData, TError>,
  params?: Record<string, unknown>
) {
  const batchManager = useMemo(() => getGlobalBatchManager(), []);

  const cacheTime = options?.cacheTime || 'standard';

  return useQuery<TData, TError>({
    queryKey,
    queryFn: () => {
      if (options?.skipBatch) {
        // Direct fetch without batching
        const url = params ? `${endpoint}?${new URLSearchParams(params as Record<string, string>)}` : endpoint;
        return fetch(url).then((res) => res.json());
      }

      return batchManager.add<TData>(
        endpoint,
        'GET',
        params,
        options?.priority || 'normal'
      );
    },
    staleTime: CACHE_TIMES[cacheTime],
    gcTime: GC_TIMES[cacheTime],
    refetchOnWindowFocus: false,
    ...options,
  });
}

/**
 * Hook for making batched mutations
 *
 * @example
 * ```tsx
 * const mutation = useBatchedMutation<User, CreateUserInput>(
 *   '/api/users',
 *   'POST',
 *   {
 *     onSuccess: (user) => console.log('Created:', user),
 *   }
 * );
 *
 * mutation.mutate({ name: 'John', email: 'john@example.com' });
 * ```
 */
export function useBatchedMutation<TData = unknown, TError = Error, TVariables = unknown>(
  endpoint: string,
  method: BatchRequest['method'] = 'POST',
  options?: BatchedMutationOptions<TData, TError, TVariables>
) {
  const batchManager = useMemo(() => getGlobalBatchManager(), []);

  return useMutation<TData, TError, TVariables>({
    mutationFn: (variables) => {
      if (options?.skipBatch) {
        return fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(variables),
        }).then((res) => res.json());
      }

      return batchManager.add<TData>(
        endpoint,
        method,
        variables,
        options?.priority || 'normal'
      );
    },
    ...options,
  });
}

/**
 * Hook for batching multiple queries together
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useBatchedQueries([
 *   { queryKey: ['user', 1], endpoint: '/api/users/1' },
 *   { queryKey: ['posts', 1], endpoint: '/api/posts?userId=1' },
 *   { queryKey: ['comments', 1], endpoint: '/api/comments?postId=1' },
 * ]);
 *
 * // data = { 'user-1': userData, 'posts-1': postsData, 'comments-1': commentsData }
 * ```
 */
export function useBatchedQueries<T = unknown>(
  queries: Array<{
    queryKey: QueryKey;
    endpoint: string;
    params?: Record<string, unknown>;
    priority?: BatchPriority;
  }>,
  options?: {
    enabled?: boolean;
    cacheTime?: 'short' | 'standard' | 'long' | 'static';
  }
) {
  const batchManager = useMemo(() => getGlobalBatchManager(), []);
  const queryClient = useQueryClient();

  // Create a combined query key
  const combinedKey = useMemo(
    () => ['batched-queries', ...queries.map((q) => JSON.stringify(q.queryKey))],
    [queries]
  );

  const cacheTime = options?.cacheTime || 'standard';

  return useQuery({
    queryKey: combinedKey,
    queryFn: async () => {
      const results: Record<string, T> = {};

      // Add all queries to batch
      const promises = queries.map((query) =>
        batchManager
          .add<T>(query.endpoint, 'GET', query.params, query.priority || 'normal')
          .then((data) => {
            const keyString = JSON.stringify(query.queryKey);
            results[keyString] = data;

            // Also update individual query caches
            queryClient.setQueryData(query.queryKey, data);

            return data;
          })
      );

      await Promise.all(promises);
      return results;
    },
    staleTime: CACHE_TIMES[cacheTime],
    gcTime: GC_TIMES[cacheTime],
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to access batch manager stats and controls
 *
 * @example
 * ```tsx
 * const { stats, flush, clear, resetStats } = useBatchManager();
 *
 * console.log(`Efficiency: ${(stats.efficiency * 100).toFixed(1)}%`);
 * console.log(`Requests saved: ${stats.requestsSaved}`);
 * ```
 */
export function useBatchManager() {
  const batchManager = useMemo(() => getGlobalBatchManager(), []);
  const statsRef = useRef<BatchManagerStats>(batchManager.getStats());

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      statsRef.current = batchManager.getStats();
    }, 1000);

    return () => clearInterval(interval);
  }, [batchManager]);

  const flush = useCallback(() => {
    batchManager.flush();
  }, [batchManager]);

  const clear = useCallback(() => {
    batchManager.clear();
  }, [batchManager]);

  const resetStats = useCallback(() => {
    batchManager.resetStats();
    statsRef.current = batchManager.getStats();
  }, [batchManager]);

  const getStats = useCallback(() => {
    return batchManager.getStats();
  }, [batchManager]);

  return {
    stats: statsRef.current,
    getStats,
    flush,
    clear,
    resetStats,
    pendingCount: batchManager.getPendingCount(),
  };
}

/**
 * Hook to prefetch data using batched requests
 *
 * @example
 * ```tsx
 * const prefetch = useBatchedPrefetch();
 *
 * // Prefetch on hover
 * const handleMouseEnter = () => {
 *   prefetch('/api/users/1', ['user', 1]);
 * };
 * ```
 */
export function useBatchedPrefetch() {
  const batchManager = useMemo(() => getGlobalBatchManager(), []);
  const queryClient = useQueryClient();

  const prefetch = useCallback(
    async <T = unknown>(
      endpoint: string,
      queryKey: QueryKey,
      params?: Record<string, unknown>,
      options?: {
        cacheTime?: 'short' | 'standard' | 'long' | 'static';
        priority?: BatchPriority;
      }
    ) => {
      const cacheTime = options?.cacheTime || 'standard';

      // Check if data is already cached
      const cached = queryClient.getQueryData(queryKey);
      if (cached) return;

      // Prefetch using batch manager
      const data = await batchManager.add<T>(
        endpoint,
        'GET',
        params,
        options?.priority || 'low' // Use low priority for prefetch
      );

      // Store in query cache
      queryClient.setQueryData(queryKey, data, {
        updatedAt: Date.now(),
      });
    },
    [batchManager, queryClient]
  );

  return prefetch;
}

/**
 * Hook for deferred/lazy batched queries
 *
 * @example
 * ```tsx
 * const { fetch, data, isLoading } = useLazyBatchedQuery<User>(
 *   ['user'],
 *   '/api/users'
 * );
 *
 * // Fetch when needed
 * const handleClick = async () => {
 *   const user = await fetch({ id: '123' });
 * };
 * ```
 */
export function useLazyBatchedQuery<TData = unknown, TError = Error>(
  baseQueryKey: QueryKey,
  endpoint: string,
  options?: BatchedQueryOptions<TData, TError>
) {
  const batchManager = useMemo(() => getGlobalBatchManager(), []);
  const queryClient = useQueryClient();
  const paramsRef = useRef<Record<string, unknown> | undefined>(undefined);

  const { data, isLoading, error, refetch } = useQuery<TData, TError>({
    queryKey: [...baseQueryKey, paramsRef.current],
    queryFn: () => {
      if (!paramsRef.current) {
        throw new Error('No params provided');
      }

      return batchManager.add<TData>(
        endpoint,
        'GET',
        paramsRef.current,
        options?.priority || 'normal'
      );
    },
    enabled: false, // Don't fetch automatically
    ...options,
  });

  const fetch = useCallback(
    async (params?: Record<string, unknown>): Promise<TData> => {
      paramsRef.current = params;

      // Check cache first
      const queryKey = [...baseQueryKey, params];
      const cached = queryClient.getQueryData<TData>(queryKey);
      if (cached) return cached;

      // Fetch
      const result = await batchManager.add<TData>(
        endpoint,
        'GET',
        params,
        options?.priority || 'normal'
      );

      // Update cache
      queryClient.setQueryData(queryKey, result);

      return result;
    },
    [batchManager, baseQueryKey, endpoint, options?.priority, queryClient]
  );

  return {
    fetch,
    data,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================================
// Export convenience utilities
// =============================================================================

export {
  getGlobalBatchManager,
  type BatchManagerStats,
  type BatchRequest,
  type BatchPriority,
};
