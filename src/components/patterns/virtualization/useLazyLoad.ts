/**
 * useLazyLoad Hook
 *
 * Progressive slice-based loading of items for improved initial render.
 * Loads items in batches as user scrolls or requests more.
 *
 * @example
 * ```tsx
 * const {
 *   visibleItems,
 *   hasMore,
 *   loadMore,
 *   loadProgress,
 * } = useLazyLoad(items, {
 *   initialLoadCount: 20,
 *   pageSize: 20,
 * });
 *
 * return (
 *   <div>
 *     {visibleItems.map(item => <Item key={item.id} {...item} />)}
 *     {hasMore && (
 *       <LazyLoadTrigger onVisible={loadMore} />
 *     )}
 *     <ProgressBar value={loadProgress} />
 *   </div>
 * );
 * ```
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { LazyLoadConfig, UseLazyLoadReturn } from './types';

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: LazyLoadConfig = {
  initialLoadCount: 20,
  pageSize: 20,
  prefetchCount: 10,
  enabled: true,
};

// =============================================================================
// useLazyLoad Hook
// =============================================================================

export function useLazyLoad<T>(
  items: T[],
  config: Partial<LazyLoadConfig> = {}
): UseLazyLoadReturn<T> {
  const mergedConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config]
  );

  const [loadedCount, setLoadedCount] = useState(
    mergedConfig.enabled ? mergedConfig.initialLoadCount : items.length
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const rafIdRef = useRef<number | null>(null);

  // Reset when items change significantly
  useEffect(() => {
    if (!mergedConfig.enabled) {
      setLoadedCount(items.length);
      return;
    }

    // Only reset if items array is completely different
    setLoadedCount((prev) => {
      const newInitial = Math.min(mergedConfig.initialLoadCount, items.length);
      // Keep loaded count if we have more items loaded
      return Math.max(newInitial, Math.min(prev, items.length));
    });
  }, [items.length, mergedConfig.enabled, mergedConfig.initialLoadCount]);

  // Calculate visible items
  const visibleItems = useMemo(() => {
    if (!mergedConfig.enabled) return items;
    return items.slice(0, loadedCount);
  }, [items, loadedCount, mergedConfig.enabled]);

  // Calculate state
  const totalItems = items.length;
  const hasMore = loadedCount < totalItems;
  const loadProgress = totalItems > 0
    ? Math.round((loadedCount / totalItems) * 100)
    : 100;

  /**
   * Load more items
   */
  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || !mergedConfig.enabled) return;

    setIsLoadingMore(true);

    // Use RAF for async-like behavior without actual async
    rafIdRef.current = requestAnimationFrame(() => {
      setLoadedCount((prev) => {
        const nextCount = Math.min(
          prev + mergedConfig.pageSize,
          totalItems
        );
        return nextCount;
      });
      setIsLoadingMore(false);
    });
  }, [hasMore, isLoadingMore, totalItems, mergedConfig.enabled, mergedConfig.pageSize]);

  /**
   * Load all remaining items
   */
  const loadAll = useCallback(() => {
    if (!hasMore || !mergedConfig.enabled) return;

    setIsLoadingMore(true);

    rafIdRef.current = requestAnimationFrame(() => {
      setLoadedCount(totalItems);
      setIsLoadingMore(false);
    });
  }, [hasMore, totalItems, mergedConfig.enabled]);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    setLoadedCount(
      mergedConfig.enabled ? mergedConfig.initialLoadCount : items.length
    );
    setIsLoadingMore(false);
  }, [items.length, mergedConfig.enabled, mergedConfig.initialLoadCount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    visibleItems,
    totalItems,
    loadedCount,
    hasMore,
    isLoadingMore,
    loadProgress,
    loadMore,
    loadAll,
    reset,
  };
}

// =============================================================================
// useInfiniteScroll Hook
// =============================================================================

export interface InfiniteScrollConfig {
  /** Threshold in pixels before bottom to trigger load */
  threshold: number;
  /** Enable/disable infinite scroll */
  enabled: boolean;
}

const DEFAULT_INFINITE_CONFIG: InfiniteScrollConfig = {
  threshold: 200,
  enabled: true,
};

export interface UseInfiniteScrollReturn {
  /** Scroll container ref */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** Whether currently loading */
  isLoading: boolean;
  /** Trigger load manually */
  triggerLoad: () => void;
}

export function useInfiniteScroll(
  onLoadMore: () => void | Promise<void>,
  config: Partial<InfiniteScrollConfig> = {}
): UseInfiniteScrollReturn {
  const mergedConfig = useMemo(
    () => ({ ...DEFAULT_INFINITE_CONFIG, ...config }),
    [config]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef(false);

  const triggerLoad = useCallback(async () => {
    if (loadingRef.current || !mergedConfig.enabled) return;

    loadingRef.current = true;
    setIsLoading(true);

    try {
      await onLoadMore();
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [onLoadMore, mergedConfig.enabled]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !mergedConfig.enabled) return;

    const handleScroll = () => {
      if (loadingRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (distanceFromBottom < mergedConfig.threshold) {
        triggerLoad();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [mergedConfig.enabled, mergedConfig.threshold, triggerLoad]);

  return {
    scrollRef,
    isLoading,
    triggerLoad,
  };
}

// =============================================================================
// Utility: Calculate optimal page size
// =============================================================================

/**
 * Calculate optimal page size based on viewport and item height
 */
export function calculateOptimalPageSize(
  viewportHeight: number,
  estimatedItemHeight: number,
  overscan: number = 5
): number {
  const visibleCount = Math.ceil(viewportHeight / estimatedItemHeight);
  return visibleCount + overscan * 2;
}

/**
 * Determine if lazy loading should be used based on item count
 */
export function shouldUseLazyLoading(
  itemCount: number,
  threshold: number = 50
): boolean {
  return itemCount > threshold;
}

/**
 * Determine if virtualization should be used based on item count
 */
export function shouldUseVirtualization(
  itemCount: number,
  threshold: number = 100
): boolean {
  return itemCount > threshold;
}

export default useLazyLoad;
