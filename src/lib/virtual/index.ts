/**
 * Virtual Scrolling Module
 *
 * High-performance virtualized scrolling for large collections.
 * Provides components and utilities for efficient rendering of
 * thousands of items with smooth 60fps scrolling.
 *
 * @module virtual
 */

// Main virtual list component
export {
  VirtualCollectionList,
  MemoizedVirtualCollectionList,
} from './VirtualCollectionList';

export type {
  VirtualItemData,
  SizeEstimation,
  ScrollBehavior,
  PerformanceOptions,
  PerformanceMetrics,
  VirtualListRef,
  VirtualCollectionListProps,
} from './VirtualCollectionList';

// Infinite loader component
export {
  InfiniteLoader,
  useInfiniteLoader,
} from './InfiniteLoader';

export type {
  InfiniteLoaderState,
  LoadMoreFunction,
  InfiniteLoaderRef,
  InfiniteLoaderProps,
  UseInfiniteLoaderOptions,
  UseInfiniteLoaderReturn,
} from './InfiniteLoader';

// Scroll position management
export {
  ScrollPositionManager,
  getScrollPositionManager,
  createScrollHandlers,
} from './ScrollPositionManager';

export type {
  ScrollPosition,
  RestoreOptions,
  ScrollPositionManagerConfig,
  UseScrollPositionOptions,
} from './ScrollPositionManager';

// Skeleton loaders
export {
  Skeleton,
  SkeletonCard,
  SkeletonListItem,
  SkeletonCompact,
  SkeletonGrid,
  SkeletonList,
  SkeletonText,
  SkeletonAvatar,
} from './SkeletonLoader';

export type {
  SkeletonVariant,
  SkeletonAnimation,
  SkeletonProps,
  SkeletonItemConfig,
  SkeletonListProps,
} from './SkeletonLoader';

// Performance monitoring
export {
  PerformanceMonitor,
  usePerformanceMetrics,
  PerformanceProvider,
} from './PerformanceMonitor';

export type {
  PerformanceMetrics as MonitorPerformanceMetrics,
  PerformanceThresholds,
  PerformanceMonitorProps,
} from './PerformanceMonitor';

/**
 * Quick start example:
 *
 * ```tsx
 * import {
 *   VirtualCollectionList,
 *   InfiniteLoader,
 *   useInfiniteLoader,
 * } from '@/lib/virtual';
 *
 * function MyList() {
 *   const { items, isLoading, hasMore, loadMore } = useInfiniteLoader({
 *     fetchPage: async (page) => {
 *       const response = await fetch(`/api/items?page=${page}`);
 *       const data = await response.json();
 *       return { items: data.items, hasMore: data.hasMore };
 *     },
 *   });
 *
 *   return (
 *     <div className="h-[600px]">
 *       <VirtualCollectionList
 *         items={items.map(item => ({ id: item.id, data: item }))}
 *         height={600}
 *         renderItem={(item) => <ItemCard item={item.data} />}
 *         scrollRestoreKey="my-list"
 *       />
 *       <InfiniteLoader
 *         onLoadMore={loadMore}
 *         hasMore={hasMore}
 *         isLoading={isLoading}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
