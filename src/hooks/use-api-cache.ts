/**
 * React Hook for API Cache
 *
 * Provides a React-friendly interface to the API cache with:
 * - Cache metrics monitoring
 * - Cache invalidation helpers
 * - Integration with TanStack Query
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getGlobalAPICache,
  getCacheInvalidationManager,
  cacheInvalidation,
  type CacheMetrics,
} from '@/lib/cache';

export interface UseCacheMetricsOptions {
  /** Polling interval in ms (default: 5000) */
  pollingInterval?: number;
  /** Enable auto-polling (default: false) */
  autoPolling?: boolean;
}

/**
 * Hook for monitoring cache metrics
 */
export function useCacheMetrics(options: UseCacheMetricsOptions = {}) {
  const { pollingInterval = 5000, autoPolling = false } = options;
  const [metrics, setMetrics] = useState<CacheMetrics | null>(null);

  const refreshMetrics = useCallback(() => {
    const cache = getGlobalAPICache();
    setMetrics(cache.getMetrics());
  }, []);

  // Initial fetch
  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  // Auto-polling
  useEffect(() => {
    if (!autoPolling) return;

    const interval = setInterval(refreshMetrics, pollingInterval);
    return () => clearInterval(interval);
  }, [autoPolling, pollingInterval, refreshMetrics]);

  const efficiencyReport = useMemo(() => {
    const cache = getGlobalAPICache();
    return cache.getEfficiencyReport();
  }, [metrics]);

  return {
    metrics,
    efficiencyReport,
    refreshMetrics,
  };
}

/**
 * Hook for cache invalidation operations
 */
export function useCacheInvalidation() {
  const invalidateList = useCallback((listId: string) => {
    return cacheInvalidation.onListUpdated(listId);
  }, []);

  const invalidateCategory = useCallback((category: string) => {
    return cacheInvalidation.forCategory(category);
  }, []);

  const invalidateUser = useCallback((userId: string) => {
    return cacheInvalidation.onUserDataChanged(userId);
  }, []);

  const invalidateAll = useCallback(() => {
    return cacheInvalidation.forceRefresh();
  }, []);

  const resetMetrics = useCallback(() => {
    const cache = getGlobalAPICache();
    cache.resetMetrics();
  }, []);

  return {
    invalidateList,
    invalidateCategory,
    invalidateUser,
    invalidateAll,
    resetMetrics,
  };
}

/**
 * Hook for prefetching data into cache
 */
export function useCachePrefetch() {
  const prefetch = useCallback(
    async <T>(key: string, fetcher: () => Promise<T>, ttl?: number) => {
      const cache = getGlobalAPICache();
      await cache.prefetch(key, fetcher, { ttl });
    },
    []
  );

  const prefetchMultiple = useCallback(
    async <T>(
      items: Array<{ key: string; fetcher: () => Promise<T>; ttl?: number }>
    ) => {
      const cache = getGlobalAPICache();
      await Promise.all(
        items.map(({ key, fetcher, ttl }) =>
          cache.prefetch(key, fetcher, { ttl })
        )
      );
    },
    []
  );

  return {
    prefetch,
    prefetchMultiple,
  };
}

/**
 * Hook for checking cache status
 */
export function useCacheStatus(key: string) {
  const [status, setStatus] = useState<{
    exists: boolean;
    entry: ReturnType<ReturnType<typeof getGlobalAPICache>['peek']> | undefined;
  }>({ exists: false, entry: undefined });

  useEffect(() => {
    const cache = getGlobalAPICache();
    const exists = cache.has(key);
    const entry = exists ? cache.peek(key) : undefined;
    setStatus({ exists, entry });
  }, [key]);

  return status;
}

/**
 * Combined hook for full cache management
 */
export function useAPICache() {
  const { metrics, efficiencyReport, refreshMetrics } = useCacheMetrics();
  const {
    invalidateList,
    invalidateCategory,
    invalidateUser,
    invalidateAll,
    resetMetrics,
  } = useCacheInvalidation();
  const { prefetch, prefetchMultiple } = useCachePrefetch();

  const getCache = useCallback(() => getGlobalAPICache(), []);
  const getInvalidationManager = useCallback(
    () => getCacheInvalidationManager(),
    []
  );

  return {
    // Metrics
    metrics,
    efficiencyReport,
    refreshMetrics,
    resetMetrics,

    // Invalidation
    invalidateList,
    invalidateCategory,
    invalidateUser,
    invalidateAll,

    // Prefetching
    prefetch,
    prefetchMultiple,

    // Direct access
    getCache,
    getInvalidationManager,
  };
}
