'use client';

/**
 * useVirtualScroll Hook
 * Provides virtualized scrolling capabilities with scroll position persistence,
 * performance monitoring, and infinite loading support.
 */

import {
  useRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual';
import {
  ScrollPositionManager,
  getScrollPositionManager,
  ScrollPosition,
} from '@/lib/virtual/ScrollPositionManager';

/**
 * Item interface for virtualization
 */
export interface VirtualScrollItem<T = unknown> {
  id: string;
  data: T;
}

/**
 * Performance metrics for virtual scroll
 */
export interface VirtualScrollMetrics {
  /** Items currently in DOM */
  renderedCount: number;
  /** Total items in list */
  totalCount: number;
  /** First visible item index */
  startIndex: number;
  /** Last visible item index */
  endIndex: number;
  /** Current scroll offset */
  scrollOffset: number;
  /** Total scrollable height */
  totalHeight: number;
  /** Scroll percentage (0-100) */
  scrollPercentage: number;
  /** Frames per second (if monitoring enabled) */
  fps?: number;
}

/**
 * Options for useVirtualScroll hook
 */
export interface UseVirtualScrollOptions<T> {
  /** Items to virtualize */
  items: VirtualScrollItem<T>[];
  /** Estimated item height */
  estimateSize?: number;
  /** Fixed item height (if all items same size) */
  fixedSize?: number;
  /** Overscan count (items to render outside viewport) */
  overscan?: number;
  /** Gap between items */
  gap?: number;
  /** Horizontal scrolling */
  horizontal?: boolean;
  /** Enable scroll position persistence */
  persistScroll?: boolean;
  /** Unique key for scroll persistence */
  scrollKey?: string;
  /** Enable performance monitoring */
  enableMetrics?: boolean;
  /** Callback when metrics update */
  onMetricsUpdate?: (metrics: VirtualScrollMetrics) => void;
  /** Callback when visible range changes */
  onVisibleRangeChange?: (startIndex: number, endIndex: number) => void;
  /** Callback when scroll position changes */
  onScroll?: (offset: number) => void;
  /** Initial scroll offset */
  initialOffset?: number;
}

/**
 * Return type for useVirtualScroll hook
 */
export interface UseVirtualScrollReturn<T> {
  /** Ref to attach to scroll container */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Virtualizer instance */
  virtualizer: unknown;
  /** Virtual items to render */
  virtualItems: VirtualItem[];
  /** Total height of virtual list */
  totalSize: number;
  /** Scroll to specific index */
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto'; smooth?: boolean }) => void;
  /** Scroll to specific offset */
  scrollToOffset: (offset: number, smooth?: boolean) => void;
  /** Get item at index */
  getItem: (index: number) => VirtualScrollItem<T> | undefined;
  /** Current scroll position */
  scrollOffset: number;
  /** Performance metrics */
  metrics: VirtualScrollMetrics;
  /** Is user currently scrolling */
  isScrolling: boolean;
  /** Save current scroll position */
  saveScrollPosition: () => void;
  /** Restore scroll position */
  restoreScrollPosition: () => boolean;
  /** Force remeasure all items */
  remeasure: () => void;
}

/**
 * useVirtualScroll Hook
 *
 * A comprehensive hook for implementing virtualized scrolling with
 * performance monitoring, scroll persistence, and infinite loading support.
 *
 * Features:
 * - Efficient virtualization via @tanstack/react-virtual
 * - Scroll position persistence across navigation
 * - Performance metrics tracking
 * - Scroll-to-index/offset functionality
 * - Variable height item support
 */
export function useVirtualScroll<T>(
  options: UseVirtualScrollOptions<T>
): UseVirtualScrollReturn<T> {
  const {
    items,
    estimateSize = 80,
    fixedSize,
    overscan = 5,
    gap = 0,
    horizontal = false,
    persistScroll = false,
    scrollKey,
    enableMetrics = false,
    onMetricsUpdate,
    onVisibleRangeChange,
    onScroll,
    initialOffset = 0,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollManagerRef = useRef<ScrollPositionManager | null>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  const [scrollOffset, setScrollOffset] = useState(initialOffset);
  const [isScrolling, setIsScrolling] = useState(false);
  const [fps, setFps] = useState(60);

  // Initialize scroll manager
  useEffect(() => {
    if (persistScroll) {
      scrollManagerRef.current = getScrollPositionManager();
    }
  }, [persistScroll]);

  // Size estimation function
  const estimateSizeFn = useCallback(
    (index: number) => {
      const baseSize = fixedSize ?? estimateSize;
      return baseSize + gap;
    },
    [fixedSize, estimateSize, gap]
  );

  // Create virtualizer
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => containerRef.current,
    estimateSize: estimateSizeFn,
    overscan,
    horizontal,
    initialOffset,
  });

  // Get virtual items
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Calculate metrics
  const metrics: VirtualScrollMetrics = useMemo(() => {
    const startIndex = virtualItems.length > 0 ? virtualItems[0].index : 0;
    const endIndex = virtualItems.length > 0 ? virtualItems[virtualItems.length - 1].index : 0;

    return {
      renderedCount: virtualItems.length,
      totalCount: items.length,
      startIndex,
      endIndex,
      scrollOffset,
      totalHeight: totalSize,
      scrollPercentage: totalSize > 0 ? Math.round((scrollOffset / totalSize) * 100) : 0,
      fps: enableMetrics ? fps : undefined,
    };
  }, [virtualItems, items.length, scrollOffset, totalSize, enableMetrics, fps]);

  // Scroll to index
  const scrollToIndex = useCallback(
    (index: number, opts?: { align?: 'start' | 'center' | 'end' | 'auto'; smooth?: boolean }) => {
      virtualizer.scrollToIndex(index, {
        align: opts?.align ?? 'start',
        behavior: opts?.smooth ? 'smooth' : 'auto',
      });
    },
    [virtualizer]
  );

  // Scroll to offset
  const scrollToOffset = useCallback(
    (offset: number, smooth = false) => {
      virtualizer.scrollToOffset(offset, {
        behavior: smooth ? 'smooth' : 'auto',
      });
    },
    [virtualizer]
  );

  // Get item at index
  const getItem = useCallback(
    (index: number) => items[index],
    [items]
  );

  // Save scroll position
  const saveScrollPosition = useCallback(() => {
    if (persistScroll && scrollKey && scrollManagerRef.current) {
      const firstVisible = virtualItems[0]?.index ?? 0;
      scrollManagerRef.current.save(scrollKey, scrollOffset, {
        firstVisibleIndex: firstVisible,
        totalItems: items.length,
      });
    }
  }, [persistScroll, scrollKey, scrollOffset, virtualItems, items.length]);

  // Restore scroll position
  const restoreScrollPosition = useCallback(() => {
    if (!persistScroll || !scrollKey || !scrollManagerRef.current || !containerRef.current) {
      return false;
    }

    return scrollManagerRef.current.restore(scrollKey, containerRef.current, {
      onRestore: (position) => {
        setScrollOffset(position.offset);
      },
    });
  }, [persistScroll, scrollKey]);

  // Force remeasure
  const remeasure = useCallback(() => {
    virtualizer.measure();
  }, [virtualizer]);

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const offset = horizontal ? container.scrollLeft : container.scrollTop;
      setScrollOffset(offset);
      onScroll?.(offset);

      // Track scrolling state
      isScrollingRef.current = true;
      setIsScrolling(true);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
        setIsScrolling(false);

        // Save position when scrolling stops
        if (persistScroll && scrollKey && scrollManagerRef.current) {
          saveScrollPosition();
        }
      }, 150);

      // FPS tracking
      if (enableMetrics) {
        frameCountRef.current++;
        const now = performance.now();
        const elapsed = now - frameTimeRef.current;

        if (elapsed >= 1000) {
          const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
          setFps(Math.min(currentFps, 60));
          frameCountRef.current = 0;
          frameTimeRef.current = now;
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [horizontal, onScroll, persistScroll, scrollKey, saveScrollPosition, enableMetrics]);

  // Notify visible range changes
  useEffect(() => {
    if (virtualItems.length > 0 && onVisibleRangeChange) {
      const start = virtualItems[0].index;
      const end = virtualItems[virtualItems.length - 1].index;
      onVisibleRangeChange(start, end);
    }
  }, [virtualItems, onVisibleRangeChange]);

  // Update metrics callback
  useEffect(() => {
    if (enableMetrics && onMetricsUpdate) {
      onMetricsUpdate(metrics);
    }
  }, [enableMetrics, metrics, onMetricsUpdate]);

  // Restore scroll on mount
  useEffect(() => {
    if (persistScroll && scrollKey) {
      // Delay to ensure DOM is ready
      const timer = setTimeout(() => {
        restoreScrollPosition();
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [persistScroll, scrollKey, restoreScrollPosition]);

  // Save scroll on unmount
  useEffect(() => {
    return () => {
      if (persistScroll && scrollKey && scrollManagerRef.current) {
        const offset = containerRef.current?.[horizontal ? 'scrollLeft' : 'scrollTop'] ?? 0;
        const firstVisible = virtualItems[0]?.index ?? 0;
        scrollManagerRef.current.save(scrollKey, offset, {
          firstVisibleIndex: firstVisible,
          totalItems: items.length,
        });
      }
    };
  }, [persistScroll, scrollKey, horizontal, virtualItems, items.length]);

  return {
    containerRef,
    virtualizer,
    virtualItems,
    totalSize,
    scrollToIndex,
    scrollToOffset,
    getItem,
    scrollOffset,
    metrics,
    isScrolling,
    saveScrollPosition,
    restoreScrollPosition,
    remeasure,
  };
}

/**
 * Hook for simple infinite scroll without full virtualization
 */
export interface UseSimpleInfiniteScrollOptions {
  /** Whether there are more items */
  hasMore: boolean;
  /** Function to load more */
  onLoadMore: () => void;
  /** Whether currently loading */
  isLoading?: boolean;
  /** Threshold from bottom to trigger (px) */
  threshold?: number;
  /** Whether enabled */
  enabled?: boolean;
}

export function useSimpleInfiniteScroll(
  options: UseSimpleInfiniteScrollOptions
): React.RefObject<HTMLDivElement | null> {
  const {
    hasMore,
    onLoadMore,
    isLoading = false,
    threshold = 200,
    enabled = true,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !hasMore) return;

    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (loadingRef.current || isLoading) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (distanceFromBottom < threshold) {
        loadingRef.current = true;
        onLoadMore();
        // Reset after a short delay
        setTimeout(() => {
          loadingRef.current = false;
        }, 100);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [enabled, hasMore, onLoadMore, isLoading, threshold]);

  return containerRef;
}

export default useVirtualScroll;
