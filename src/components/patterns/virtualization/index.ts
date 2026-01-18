/**
 * Virtualization Pattern Library
 *
 * Reusable virtualization components for efficiently rendering
 * large lists and grids with lazy loading and intersection observer.
 *
 * @example
 * ```tsx
 * import {
 *   useIntersectionObserver,
 *   useInView,
 *   useLazyLoad,
 *   useVisibleItems,
 *   LazyLoadTrigger,
 * } from '@/components/patterns/virtualization';
 *
 * // Basic intersection observer
 * const { ref, isIntersecting } = useIntersectionObserver({
 *   threshold: 0.1,
 *   rootMargin: '200px',
 * });
 *
 * // Simple in-view detection
 * const { ref, inView } = useInView({ once: true });
 *
 * // Lazy loading with batching
 * const { loadedCount, loadMore, isComplete } = useLazyLoad({
 *   totalItems: items.length,
 *   batchSize: 20,
 * });
 *
 * // Infinite scroll trigger
 * <LazyLoadTrigger
 *   onVisible={fetchNextPage}
 *   enabled={hasNextPage}
 *   isLoading={isFetching}
 * />
 * ```
 */

// Types
export * from './types';

// Hooks
export {
  useIntersectionObserver,
  useInView,
  useVisibleItems,
  LazyLoadTrigger,
  type IntersectionObserverConfig,
  type UseInViewConfig,
  type UseInViewReturn,
  type LazyLoadTriggerProps,
  type UseVisibleItemsConfig,
  type UseVisibleItemsReturn,
} from './useIntersectionObserver';

export { useLazyLoad } from './useLazyLoad';
