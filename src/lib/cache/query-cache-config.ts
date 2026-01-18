/**
 * React Query Cache Configuration
 *
 * Enhanced QueryClient configuration with:
 * - Unified TTL values from unified-cache.ts
 * - Request coalescing (deduplication)
 * - Cache metrics for development
 * - Tag-based invalidation integration
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { CACHE_TTL_MS, GC_TIME_MS, INVALIDATION_RULES, type InvalidationEvent } from './unified-cache';

// =============================================================================
// Cache Metrics
// =============================================================================

interface CacheMetrics {
  hits: number;
  misses: number;
  mutations: number;
  invalidations: number;
  errors: number;
  startTime: number;
}

let metrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  mutations: 0,
  invalidations: 0,
  errors: 0,
  startTime: Date.now(),
};

/**
 * Get current cache metrics.
 */
export function getCacheMetrics(): CacheMetrics & {
  hitRate: number;
  totalQueries: number;
  uptime: number;
} {
  const totalQueries = metrics.hits + metrics.misses;
  return {
    ...metrics,
    hitRate: totalQueries > 0 ? (metrics.hits / totalQueries) * 100 : 0,
    totalQueries,
    uptime: Date.now() - metrics.startTime,
  };
}

/**
 * Reset cache metrics.
 */
export function resetCacheMetrics(): void {
  metrics = {
    hits: 0,
    misses: 0,
    mutations: 0,
    invalidations: 0,
    errors: 0,
    startTime: Date.now(),
  };
}

// =============================================================================
// Query Client Factory
// =============================================================================

let queryClientInstance: QueryClient | null = null;

/**
 * Create or get the singleton QueryClient with unified cache configuration.
 */
export function createQueryClient(): QueryClient {
  if (queryClientInstance) {
    return queryClientInstance;
  }

  const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

  // Create query cache with metrics tracking
  const queryCache = new QueryCache({
    onSuccess: (_data, query) => {
      // Track cache hits/misses
      if (query.state.dataUpdatedAt > 0 && query.state.fetchStatus === 'idle') {
        metrics.hits++;
      } else {
        metrics.misses++;
      }

      if (isDev) {
        console.log(`[QueryCache] ✅ ${query.queryHash}`, {
          staleTime: (query.options as { staleTime?: number }).staleTime,
          dataAge: Date.now() - query.state.dataUpdatedAt,
        });
      }
    },
    onError: (error, query) => {
      metrics.errors++;
      console.error(`[QueryCache] ❌ ${query.queryHash}`, error);
    },
  });

  // Create mutation cache with metrics tracking
  const mutationCache = new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      metrics.mutations++;

      if (isDev) {
        console.log(`[MutationCache] ✅ Mutation completed`, {
          key: mutation.options.mutationKey,
        });
      }
    },
    onError: (error, _variables, _context, mutation) => {
      metrics.errors++;
      console.error(`[MutationCache] ❌ Mutation failed`, {
        key: mutation.options.mutationKey,
        error,
      });
    },
  });

  queryClientInstance = new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
      queries: {
        // Unified stale time - data considered fresh for 5 minutes
        staleTime: CACHE_TTL_MS.STANDARD,

        // Garbage collection - keep unused data for 10 minutes
        gcTime: GC_TIME_MS.STANDARD,

        // Retry strategy with exponential backoff
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes('401') || message.includes('403') || message.includes('404')) {
              return false;
            }
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Network mode - always try to fetch in background
        networkMode: 'offlineFirst',

        // Refetch settings
        refetchOnWindowFocus: false, // Don't auto-refetch on window focus
        refetchOnReconnect: true,    // Refetch when coming back online
        refetchOnMount: true,        // Refetch on component mount if stale
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
        networkMode: 'offlineFirst',
      },
    },
  });

  // Expose for debugging in development
  if (typeof window !== 'undefined' && isDev) {
    (window as unknown as Record<string, unknown>).__queryClient = queryClientInstance;
    (window as unknown as Record<string, unknown>).__cacheMetrics = getCacheMetrics;
  }

  return queryClientInstance;
}

/**
 * Reset the QueryClient singleton (for testing).
 */
export function resetQueryClient(): void {
  if (queryClientInstance) {
    queryClientInstance.clear();
    queryClientInstance = null;
  }
  resetCacheMetrics();
}

// =============================================================================
// Tag-Based Invalidation
// =============================================================================

/**
 * Invalidate queries by event type using the unified invalidation rules.
 */
export function invalidateByEvent(
  queryClient: QueryClient,
  event: InvalidationEvent,
  context?: Record<string, unknown>
): void {
  const tags = INVALIDATION_RULES[event];

  if (!tags || tags.length === 0) {
    console.warn(`[QueryCache] No invalidation rules for event: ${event}`);
    return;
  }

  metrics.invalidations++;

  // Invalidate all queries that match any of the tags
  tags.forEach((tag) => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        // Check if any part of the query key matches the tag
        return queryKey.some((part) => {
          if (typeof part === 'string') {
            return part.includes(tag);
          }
          if (typeof part === 'object' && part !== null) {
            return JSON.stringify(part).includes(tag);
          }
          return false;
        });
      },
    });
  });

  console.log(`[QueryCache] Invalidated by event: ${event}`, { tags, context });
}

/**
 * Invalidate queries by specific tags.
 */
export function invalidateByTags(
  queryClient: QueryClient,
  tags: string[]
): void {
  metrics.invalidations++;

  tags.forEach((tag) => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return queryKey.some((part) => {
          if (typeof part === 'string') {
            return part.includes(tag);
          }
          return false;
        });
      },
    });
  });

  console.log(`[QueryCache] Invalidated by tags:`, tags);
}

/**
 * Invalidate queries by query key prefix.
 */
export function invalidateByPrefix(
  queryClient: QueryClient,
  prefix: string
): void {
  metrics.invalidations++;

  queryClient.invalidateQueries({
    predicate: (query) => {
      const firstKey = query.queryKey[0];
      return typeof firstKey === 'string' && firstKey.startsWith(prefix);
    },
  });

  console.log(`[QueryCache] Invalidated by prefix: ${prefix}`);
}

// =============================================================================
// Request Coalescing / Deduplication
// =============================================================================

const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * Wrap a fetch function with request coalescing.
 * Multiple calls with the same key will share a single network request.
 */
export function withCoalescing<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const existing = pendingRequests.get(key) as Promise<T> | undefined;

  if (existing) {
    console.log(`[Coalescing] Reusing in-flight request: ${key}`);
    return existing;
  }

  const promise = fetcher().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Get the number of pending coalesced requests.
 */
export function getPendingRequestCount(): number {
  return pendingRequests.size;
}

// =============================================================================
// Prefetching Helpers
// =============================================================================

/**
 * Prefetch data into the query cache.
 */
export async function prefetchQuery<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
  staleTime?: number
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime: staleTime ?? CACHE_TTL_MS.STANDARD,
  });
}

/**
 * Prefetch multiple queries in parallel.
 */
export async function prefetchQueries(
  queryClient: QueryClient,
  queries: Array<{
    queryKey: readonly unknown[];
    queryFn: () => Promise<unknown>;
    staleTime?: number;
  }>
): Promise<void> {
  await Promise.all(
    queries.map((q) =>
      queryClient.prefetchQuery({
        queryKey: q.queryKey,
        queryFn: q.queryFn,
        staleTime: q.staleTime ?? CACHE_TTL_MS.STANDARD,
      })
    )
  );
}
