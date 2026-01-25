'use client';

/**
 * InfiniteLoader
 * Component for triggering infinite scroll pagination using IntersectionObserver.
 * Integrates seamlessly with VirtualCollectionList for efficient data loading.
 */

import React, {
  memo,
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * Infinite loader state
 */
export interface InfiniteLoaderState {
  /** Whether we're currently loading more items */
  isLoading: boolean;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Any error that occurred during loading */
  error: Error | null;
  /** Number of pages loaded */
  pagesLoaded: number;
  /** Total items loaded so far */
  itemsLoaded: number;
}

/**
 * Load more function signature
 */
export type LoadMoreFunction = () => Promise<{
  items: unknown[];
  hasMore: boolean;
}> | void;

/**
 * Ref interface for imperative control
 */
export interface InfiniteLoaderRef {
  /** Manually trigger load more */
  loadMore: () => void;
  /** Reset the loader state */
  reset: () => void;
  /** Get current state */
  getState: () => InfiniteLoaderState;
}

/**
 * Props for InfiniteLoader component
 */
export interface InfiniteLoaderProps {
  /** Function to load more items */
  onLoadMore: LoadMoreFunction;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Current loading state (controlled) */
  isLoading?: boolean;
  /** Threshold for triggering load (0-1, percentage of element visible) */
  threshold?: number;
  /** Root margin for IntersectionObserver */
  rootMargin?: string;
  /** Whether to enable the loader */
  enabled?: boolean;
  /** Custom loading indicator */
  loadingIndicator?: React.ReactNode;
  /** Custom end-of-list indicator */
  endIndicator?: React.ReactNode;
  /** Error state */
  error?: Error | null;
  /** Retry function when error occurs */
  onRetry?: () => void;
  /** Minimum time between load attempts (ms) */
  debounceMs?: number;
  /** Custom class name */
  className?: string;
  /** Height of the loader trigger area */
  triggerHeight?: number;
}

/**
 * Default loading indicator
 */
function DefaultLoadingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center justify-center gap-2 py-4"
    >
      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
      <span className="text-sm text-gray-400">Loading more items...</span>
    </motion.div>
  );
}

/**
 * Default end-of-list indicator
 */
function DefaultEndIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center py-4"
    >
      <span className="text-sm text-gray-500">No more items to load</span>
    </motion.div>
  );
}

/**
 * Error indicator with retry
 */
function ErrorIndicator({
  error,
  onRetry,
}: {
  error: Error;
  onRetry?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center gap-2 py-4"
    >
      <span className="text-sm text-red-400">
        Failed to load: {error.message}
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-cyan-400 hover:text-cyan-300 underline"
        >
          Retry
        </button>
      )}
    </motion.div>
  );
}

/**
 * InfiniteLoader Component
 *
 * Provides infinite scroll functionality using IntersectionObserver.
 * Place at the bottom of a scrollable container to trigger loading
 * when the user scrolls near the end.
 *
 * Features:
 * - IntersectionObserver-based triggering
 * - Configurable threshold and root margin
 * - Loading/error/end states
 * - Debounced loading to prevent rapid triggers
 * - Imperative API for manual control
 */
function InfiniteLoaderInner(
  props: InfiniteLoaderProps,
  ref: React.ForwardedRef<InfiniteLoaderRef>
) {
  const {
    onLoadMore,
    hasMore,
    isLoading: controlledLoading,
    threshold = 0.1,
    rootMargin = '200px',
    enabled = true,
    loadingIndicator,
    endIndicator,
    error,
    onRetry,
    debounceMs = 300,
    className,
    triggerHeight = 50,
  } = props;

  const triggerRef = useRef<HTMLDivElement>(null);
  const lastLoadTime = useRef(0);
  const [internalLoading, setInternalLoading] = useState(false);
  const [pagesLoaded, setPagesLoaded] = useState(0);
  const [itemsLoaded, setItemsLoaded] = useState(0);

  // Use controlled or internal loading state
  const isLoading = controlledLoading !== undefined ? controlledLoading : internalLoading;

  // Load more handler with debouncing
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoading || !enabled) return;

    const now = Date.now();
    if (now - lastLoadTime.current < debounceMs) return;
    lastLoadTime.current = now;

    setInternalLoading(true);
    try {
      const result = await onLoadMore();
      if (result) {
        setPagesLoaded((p) => p + 1);
        setItemsLoaded((i) => i + result.items.length);
      }
    } catch (err) {
      console.error('InfiniteLoader: Error loading more items', err);
    } finally {
      setInternalLoading(false);
    }
  }, [hasMore, isLoading, enabled, debounceMs, onLoadMore]);

  // Reset function
  const reset = useCallback(() => {
    setPagesLoaded(0);
    setItemsLoaded(0);
    lastLoadTime.current = 0;
    setInternalLoading(false);
  }, []);

  // Expose imperative methods
  useImperativeHandle(ref, () => ({
    loadMore: handleLoadMore,
    reset,
    getState: () => ({
      isLoading,
      hasMore,
      error: error || null,
      pagesLoaded,
      itemsLoaded,
    }),
  }));

  // Set up IntersectionObserver
  useEffect(() => {
    if (!enabled || !hasMore || isLoading) return;

    const trigger = triggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          handleLoadMore();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(trigger);

    return () => {
      observer.disconnect();
    };
  }, [enabled, hasMore, isLoading, threshold, rootMargin, handleLoadMore]);

  // Don't render if disabled
  if (!enabled) return null;

  return (
    <div
      ref={triggerRef}
      className={cn('relative', className)}
      style={{ minHeight: triggerHeight }}
      data-testid="infinite-loader"
    >
      <AnimatePresence mode="wait">
        {error ? (
          <ErrorIndicator key="error" error={error} onRetry={onRetry} />
        ) : isLoading ? (
          <React.Fragment key="loading">
            {loadingIndicator || <DefaultLoadingIndicator />}
          </React.Fragment>
        ) : !hasMore ? (
          <React.Fragment key="end">
            {endIndicator || <DefaultEndIndicator />}
          </React.Fragment>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Forwarded ref version
 */
export const InfiniteLoader = memo(
  forwardRef<InfiniteLoaderRef, InfiniteLoaderProps>(InfiniteLoaderInner)
);

InfiniteLoader.displayName = 'InfiniteLoader';

/**
 * Hook for managing infinite loader state
 */
export interface UseInfiniteLoaderOptions<T> {
  /** Function to fetch a page of items */
  fetchPage: (page: number) => Promise<{ items: T[]; hasMore: boolean }>;
  /** Initial page (default: 1) */
  initialPage?: number;
  /** Whether to load first page automatically */
  loadInitialPage?: boolean;
}

export interface UseInfiniteLoaderReturn<T> {
  /** All loaded items */
  items: T[];
  /** Whether currently loading */
  isLoading: boolean;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Current page number */
  page: number;
  /** Function to load more items (for InfiniteLoader) */
  loadMore: LoadMoreFunction;
  /** Reset to initial state */
  reset: () => void;
  /** Retry last failed request */
  retry: () => void;
}

export function useInfiniteLoader<T>(
  options: UseInfiniteLoaderOptions<T>
): UseInfiniteLoaderReturn<T> {
  const { fetchPage, initialPage = 1, loadInitialPage = true } = options;

  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(initialPage);
  const isInitialized = useRef(false);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return { items: [], hasMore: false };

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchPage(page);
      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setPage((p) => p + 1);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load items'));
      return { items: [], hasMore: true };
    } finally {
      setIsLoading(false);
    }
  }, [fetchPage, page, isLoading, hasMore]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(initialPage);
    setHasMore(true);
    setError(null);
    setIsLoading(false);
    isInitialized.current = false;
  }, [initialPage]);

  const retry = useCallback(() => {
    setError(null);
    loadMore();
  }, [loadMore]);

  // Load initial page
  useEffect(() => {
    if (loadInitialPage && !isInitialized.current) {
      isInitialized.current = true;
      loadMore();
    }
  }, [loadInitialPage, loadMore]);

  return {
    items,
    isLoading,
    hasMore,
    error,
    page,
    loadMore,
    reset,
    retry,
  };
}

export default InfiniteLoader;
