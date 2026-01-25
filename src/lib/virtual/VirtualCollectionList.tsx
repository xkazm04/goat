'use client';

/**
 * VirtualCollectionList
 * Main virtualized list component for high-performance rendering of large collections.
 * Uses @tanstack/react-virtual for efficient virtualization.
 */

import React, {
  memo,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import { useVirtualizer, VirtualItem as TanstackVirtualItem } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Generic item interface for virtualization
 */
export interface VirtualItemData<T = unknown> {
  id: string;
  data: T;
}

/**
 * Size estimation options
 */
export interface SizeEstimation {
  /** Fixed item height (if all items are same size) */
  fixedHeight?: number;
  /** Estimated height for variable-size items */
  estimateHeight?: number;
  /** Function to estimate item height based on item data */
  estimateItemHeight?: <T>(item: VirtualItemData<T>, index: number) => number;
}

/**
 * Scroll behavior options
 */
export interface ScrollBehavior {
  /** Overscan count (items rendered outside viewport) */
  overscan?: number;
  /** Enable smooth scrolling */
  smooth?: boolean;
  /** Scroll padding at top/bottom */
  padding?: number;
  /** Scroll to item alignment */
  scrollToAlignment?: 'start' | 'center' | 'end' | 'auto';
}

/**
 * Performance options
 */
export interface PerformanceOptions {
  /** Debounce scroll events (ms) */
  scrollDebounce?: number;
  /** Enable performance monitoring */
  enableMonitoring?: boolean;
  /** Callback for performance metrics */
  onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Frames per second */
  fps: number;
  /** Number of visible items */
  visibleCount: number;
  /** Total DOM nodes in list */
  domNodeCount: number;
  /** Time to render last frame (ms) */
  renderTime: number;
  /** Scroll position */
  scrollOffset: number;
}

/**
 * Virtual list ref interface
 */
export interface VirtualListRef {
  /** Scroll to specific index */
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto'; behavior?: 'auto' | 'smooth' }) => void;
  /** Scroll to specific offset */
  scrollToOffset: (offset: number, options?: { behavior?: 'auto' | 'smooth' }) => void;
  /** Get current scroll offset */
  getScrollOffset: () => number;
  /** Get virtualizer instance for advanced usage */
  getVirtualizer: () => unknown;
  /** Force re-measure all items */
  remeasure: () => void;
}

/**
 * Props for the VirtualCollectionList component
 */
export interface VirtualCollectionListProps<T> {
  /** Items to render */
  items: VirtualItemData<T>[];
  /** Render function for each item */
  renderItem: (item: VirtualItemData<T>, index: number, virtualRow: TanstackVirtualItem) => React.ReactNode;
  /** Size estimation options */
  sizeEstimation?: SizeEstimation;
  /** Scroll behavior options */
  scrollBehavior?: ScrollBehavior;
  /** Performance options */
  performance?: PerformanceOptions;
  /** Container height (required for virtualization) */
  height: number | string;
  /** Container width */
  width?: number | string;
  /** Custom class name */
  className?: string;
  /** Class name for inner scroll container */
  innerClassName?: string;
  /** Called when scroll position changes */
  onScroll?: (offset: number) => void;
  /** Called when visible range changes */
  onVisibleRangeChange?: (start: number, end: number) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Empty state content */
  emptyContent?: React.ReactNode;
  /** Loading skeleton component */
  loadingSkeleton?: React.ReactNode;
  /** Gap between items */
  gap?: number;
  /** Enable horizontal mode */
  horizontal?: boolean;
  /** Initial scroll offset */
  initialScrollOffset?: number;
  /** Restore scroll key (for position persistence) */
  scrollRestoreKey?: string;
}

/**
 * Default configuration values
 */
const DEFAULT_SIZE_ESTIMATION: SizeEstimation = {
  estimateHeight: 80,
};

const DEFAULT_SCROLL_BEHAVIOR: ScrollBehavior = {
  overscan: 5,
  smooth: true,
  padding: 0,
  scrollToAlignment: 'start',
};

const DEFAULT_PERFORMANCE: PerformanceOptions = {
  scrollDebounce: 16,
  enableMonitoring: false,
};

/**
 * VirtualCollectionList Component
 *
 * A high-performance virtualized list that only renders items currently
 * visible in the viewport, plus a configurable overscan.
 *
 * Features:
 * - Renders only visible items (< 50 DOM nodes for any list size)
 * - Variable height item support
 * - Smooth scrolling
 * - Scroll position persistence
 * - Performance monitoring
 * - Scroll-to-item functionality
 */
function VirtualCollectionListInner<T>(
  props: VirtualCollectionListProps<T>,
  ref: React.ForwardedRef<VirtualListRef>
) {
  const {
    items,
    renderItem,
    sizeEstimation = DEFAULT_SIZE_ESTIMATION,
    scrollBehavior = DEFAULT_SCROLL_BEHAVIOR,
    performance = DEFAULT_PERFORMANCE,
    height,
    width = '100%',
    className,
    innerClassName,
    onScroll,
    onVisibleRangeChange,
    isLoading = false,
    emptyContent,
    loadingSkeleton,
    gap = 0,
    horizontal = false,
    initialScrollOffset = 0,
    scrollRestoreKey,
  } = props;

  const parentRef = useRef<HTMLDivElement>(null);
  const lastScrollOffset = useRef(initialScrollOffset);
  const frameRef = useRef<number>(0);
  const lastFrameTime = useRef(window.performance.now());
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    visibleCount: 0,
    domNodeCount: 0,
    renderTime: 0,
    scrollOffset: 0,
  });

  // Merged options
  const mergedSizeEstimation = { ...DEFAULT_SIZE_ESTIMATION, ...sizeEstimation };
  const mergedScrollBehavior = { ...DEFAULT_SCROLL_BEHAVIOR, ...scrollBehavior };
  const mergedPerformance = { ...DEFAULT_PERFORMANCE, ...performance };

  // Estimate size function
  const estimateSize = useCallback(
    (index: number) => {
      if (mergedSizeEstimation.fixedHeight) {
        return mergedSizeEstimation.fixedHeight + gap;
      }
      if (mergedSizeEstimation.estimateItemHeight && items[index]) {
        return mergedSizeEstimation.estimateItemHeight(items[index], index) + gap;
      }
      return (mergedSizeEstimation.estimateHeight || 80) + gap;
    },
    [mergedSizeEstimation, items, gap]
  );

  // Create virtualizer
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: mergedScrollBehavior.overscan || 5,
    horizontal,
    paddingStart: mergedScrollBehavior.padding || 0,
    paddingEnd: mergedScrollBehavior.padding || 0,
    initialOffset: initialScrollOffset,
  });

  // Get virtual items
  const virtualItems = virtualizer.getVirtualItems();

  // Expose imperative methods
  useImperativeHandle(ref, () => ({
    scrollToIndex: (index, options) => {
      virtualizer.scrollToIndex(index, {
        align: options?.align || mergedScrollBehavior.scrollToAlignment,
        behavior: options?.behavior || (mergedScrollBehavior.smooth ? 'smooth' : 'auto'),
      });
    },
    scrollToOffset: (offset, options) => {
      virtualizer.scrollToOffset(offset, {
        behavior: options?.behavior || (mergedScrollBehavior.smooth ? 'smooth' : 'auto'),
      });
    },
    getScrollOffset: () => virtualizer.scrollOffset ?? 0,
    getVirtualizer: () => virtualizer,
    remeasure: () => virtualizer.measure(),
  }));

  // Handle scroll events
  useEffect(() => {
    const scrollElement = parentRef.current;
    if (!scrollElement) return;

    let scrollTimer: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      if (scrollTimer) clearTimeout(scrollTimer);

      scrollTimer = setTimeout(() => {
        const offset = horizontal ? scrollElement.scrollLeft : scrollElement.scrollTop;
        lastScrollOffset.current = offset;
        onScroll?.(offset);

        // Performance monitoring
        if (mergedPerformance.enableMonitoring) {
          const now = window.performance.now();
          const deltaTime = now - lastFrameTime.current;
          lastFrameTime.current = now;

          const fps = Math.round(1000 / deltaTime);
          const visibleCount = virtualItems.length;
          const domNodeCount = scrollElement.querySelectorAll('[data-virtual-item]').length;

          const newMetrics: PerformanceMetrics = {
            fps: Math.min(fps, 60),
            visibleCount,
            domNodeCount,
            renderTime: deltaTime,
            scrollOffset: offset,
          };

          setMetrics(newMetrics);
          mergedPerformance.onPerformanceUpdate?.(newMetrics);
        }

        // Save scroll position for restoration
        if (scrollRestoreKey) {
          try {
            sessionStorage.setItem(`virtual-scroll-${scrollRestoreKey}`, String(offset));
          } catch {
            // sessionStorage might be unavailable
          }
        }
      }, mergedPerformance.scrollDebounce);
    };

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, [
    horizontal,
    onScroll,
    virtualItems.length,
    mergedPerformance,
    scrollRestoreKey,
  ]);

  // Restore scroll position
  useEffect(() => {
    if (!scrollRestoreKey || !parentRef.current) return;

    try {
      const savedOffset = sessionStorage.getItem(`virtual-scroll-${scrollRestoreKey}`);
      if (savedOffset) {
        const offset = parseInt(savedOffset, 10);
        if (!isNaN(offset) && offset > 0) {
          // Use requestAnimationFrame to ensure DOM is ready
          requestAnimationFrame(() => {
            virtualizer.scrollToOffset(offset);
          });
        }
      }
    } catch {
      // sessionStorage might be unavailable
    }
  }, [scrollRestoreKey, virtualizer]);

  // Notify visible range changes
  useEffect(() => {
    if (virtualItems.length > 0 && onVisibleRangeChange) {
      const start = virtualItems[0].index;
      const end = virtualItems[virtualItems.length - 1].index;
      onVisibleRangeChange(start, end);
    }
  }, [virtualItems, onVisibleRangeChange]);

  // Calculate total size
  const totalSize = virtualizer.getTotalSize();

  // Render loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'overflow-auto',
          className
        )}
        style={{ height, width }}
      >
        {loadingSkeleton || (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 bg-gray-800/50 rounded animate-pulse"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Render empty state
  if (items.length === 0) {
    return (
      <div
        className={cn(
          'overflow-auto flex items-center justify-center',
          className
        )}
        style={{ height, width }}
      >
        {emptyContent || (
          <div className="text-gray-500 text-sm">No items to display</div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn(
        'overflow-auto',
        horizontal ? 'overflow-x-auto overflow-y-hidden' : 'overflow-y-auto overflow-x-hidden',
        className
      )}
      style={{ height, width }}
      data-testid="virtual-collection-list"
    >
      <div
        className={cn('relative', innerClassName)}
        style={{
          [horizontal ? 'width' : 'height']: `${totalSize}px`,
          [horizontal ? 'height' : 'width']: '100%',
        }}
      >
        <AnimatePresence mode="popLayout">
          {virtualItems.map((virtualRow) => {
            const item = items[virtualRow.index];
            if (!item) return null;

            return (
              <motion.div
                key={item.id}
                data-virtual-item
                data-index={virtualRow.index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-0"
                style={{
                  [horizontal ? 'left' : 'top']: `${virtualRow.start}px`,
                  [horizontal ? 'height' : 'width']: '100%',
                  [horizontal ? 'width' : 'height']: `${virtualRow.size - gap}px`,
                }}
              >
                {renderItem(item, virtualRow.index, virtualRow)}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Performance overlay (dev mode) */}
      {mergedPerformance.enableMonitoring && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-xs text-white p-2 rounded font-mono z-50">
          <div>FPS: {metrics.fps}</div>
          <div>Visible: {metrics.visibleCount}</div>
          <div>DOM: {metrics.domNodeCount}</div>
          <div>Render: {metrics.renderTime.toFixed(1)}ms</div>
        </div>
      )}
    </div>
  );
}

/**
 * Forwarded ref component with generics support
 */
export const VirtualCollectionList = forwardRef(VirtualCollectionListInner) as <T>(
  props: VirtualCollectionListProps<T> & { ref?: React.ForwardedRef<VirtualListRef> }
) => React.ReactElement;

/**
 * Memoized version for performance
 */
export const MemoizedVirtualCollectionList = memo(VirtualCollectionList) as typeof VirtualCollectionList;

export default VirtualCollectionList;
