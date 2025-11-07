import { useState, useMemo, useCallback, useEffect } from 'react';
import { CollectionItem } from '../types';
import { LAZY_LOAD_CONFIG } from '../constants/lazyLoadConfig';

export interface UseCollectionLazyLoadOptions {
  /**
   * All items to be lazy loaded
   */
  items: CollectionItem[];

  /**
   * Initial number of items to load
   */
  initialLoadCount?: number;

  /**
   * Number of items to load per page
   */
  pageSize?: number;

  /**
   * Number of items to prefetch ahead
   */
  prefetchCount?: number;

  /**
   * Whether lazy loading is enabled
   */
  enabled?: boolean;
}

export interface UseCollectionLazyLoadResult {
  /**
   * Currently visible items (loaded slice)
   */
  visibleItems: CollectionItem[];

  /**
   * Total number of items
   */
  totalItems: number;

  /**
   * Number of items currently loaded
   */
  loadedCount: number;

  /**
   * Whether there are more items to load
   */
  hasMore: boolean;

  /**
   * Whether currently loading more items
   */
  isLoadingMore: boolean;

  /**
   * Load next page of items
   */
  loadMore: () => void;

  /**
   * Reset to initial state
   */
  reset: () => void;

  /**
   * Load all remaining items
   */
  loadAll: () => void;

  /**
   * Progress percentage (0-100)
   */
  loadProgress: number;
}

/**
 * Hook for lazy loading collection items in slices
 *
 * Manages progressive loading of items to reduce initial render time
 * and memory usage for large collections.
 *
 * @example
 * ```tsx
 * const { visibleItems, hasMore, loadMore } = useCollectionLazyLoad({
 *   items: allItems,
 *   pageSize: 20,
 *   enabled: allItems.length > 100
 * });
 *
 * return (
 *   <>
 *     {visibleItems.map(item => <Item key={item.id} {...item} />)}
 *     {hasMore && <LoadMoreTrigger onVisible={loadMore} />}
 *   </>
 * );
 * ```
 */
export function useCollectionLazyLoad(
  options: UseCollectionLazyLoadOptions
): UseCollectionLazyLoadResult {
  const {
    items,
    initialLoadCount = LAZY_LOAD_CONFIG.LAZY_LOAD_PAGE_SIZE,
    pageSize = LAZY_LOAD_CONFIG.LAZY_LOAD_PAGE_SIZE,
    prefetchCount = LAZY_LOAD_CONFIG.PREFETCH_COUNT,
    enabled = true
  } = options;

  const [loadedCount, setLoadedCount] = useState(
    enabled ? Math.min(initialLoadCount, items.length) : items.length
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Reset loaded count when items change or enabled state changes
  useEffect(() => {
    if (!enabled) {
      setLoadedCount(items.length);
    } else {
      setLoadedCount(Math.min(initialLoadCount, items.length));
    }
  }, [items.length, enabled, initialLoadCount]);

  // Get visible items slice
  const visibleItems = useMemo(() => {
    if (!enabled) {
      return items;
    }
    return items.slice(0, loadedCount);
  }, [items, loadedCount, enabled]);

  // Calculate if there are more items
  const hasMore = useMemo(() => {
    if (!enabled) return false;
    return loadedCount < items.length;
  }, [loadedCount, items.length, enabled]);

  // Calculate load progress
  const loadProgress = useMemo(() => {
    if (items.length === 0) return 100;
    return Math.round((loadedCount / items.length) * 100);
  }, [loadedCount, items.length]);

  // Load more items
  const loadMore = useCallback(() => {
    if (!enabled || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);

    // Simulate async loading (can be replaced with actual async operation)
    requestAnimationFrame(() => {
      setLoadedCount(prev => {
        const nextCount = Math.min(
          prev + pageSize + prefetchCount,
          items.length
        );
        return nextCount;
      });
      setIsLoadingMore(false);
    });
  }, [enabled, isLoadingMore, hasMore, pageSize, prefetchCount, items.length]);

  // Reset to initial state
  const reset = useCallback(() => {
    setLoadedCount(
      enabled ? Math.min(initialLoadCount, items.length) : items.length
    );
    setIsLoadingMore(false);
  }, [enabled, initialLoadCount, items.length]);

  // Load all remaining items
  const loadAll = useCallback(() => {
    if (!enabled) return;
    setLoadedCount(items.length);
    setIsLoadingMore(false);
  }, [enabled, items.length]);

  return {
    visibleItems,
    totalItems: items.length,
    loadedCount,
    hasMore,
    isLoadingMore,
    loadMore,
    reset,
    loadAll,
    loadProgress
  };
}
