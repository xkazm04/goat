/**
 * Intelligent Prefetching System
 *
 * A comprehensive prefetching system for anticipating user actions and
 * pre-loading data before it's needed.
 *
 * ## Components
 *
 * - **PrefetchManager**: Central orchestrator for all prefetching
 * - **RoutePreloader**: Route-aware prefetching on navigation
 * - **HoverPrefetcher**: Hover-triggered prefetching
 * - **ScrollPrefetcher**: Intersection observer based prefetching
 * - **BandwidthDetector**: Network-aware prefetch throttling
 * - **PriorityQueue**: Request prioritization and management
 * - **PredictionEngine**: User behavior analysis for predictions
 *
 * ## Usage
 *
 * ### Setup (in app layout or provider)
 * ```tsx
 * import { usePrefetchInitializer, useRoutePrefetch } from '@/hooks/use-prefetch';
 * import { usePathname } from 'next/navigation';
 *
 * function PrefetchProvider({ children }) {
 *   usePrefetchInitializer();
 *   const pathname = usePathname();
 *   useRoutePrefetch(pathname);
 *   return children;
 * }
 * ```
 *
 * ### Hover prefetch
 * ```tsx
 * import { useListCardPrefetch } from '@/hooks/use-hover-prefetch';
 *
 * function ListCard({ listId }) {
 *   const ref = useListCardPrefetch(listId);
 *   return <div ref={ref}>...</div>;
 * }
 * ```
 *
 * ### Scroll prefetch
 * ```tsx
 * import { usePaginationPrefetch } from '@/hooks/use-scroll-prefetch';
 *
 * function InfiniteList({ page, hasMore }) {
 *   const triggerRef = usePaginationPrefetch({
 *     id: `page-${page + 1}`,
 *     targets: [/* next page targets *\/],
 *   });
 *
 *   return (
 *     <>
 *       {items}
 *       {hasMore && <div ref={triggerRef}>Loading...</div>}
 *     </>
 *   );
 * }
 * ```
 *
 * ### Analytics
 * ```tsx
 * import { usePrefetchAnalytics } from '@/hooks/use-prefetch';
 *
 * function DebugPanel() {
 *   const analytics = usePrefetchAnalytics();
 *   return <pre>{JSON.stringify(analytics, null, 2)}</pre>;
 * }
 * ```
 */

// Core components
export { PrefetchManager, type PrefetchConfig, type PrefetchTarget, type PrefetchAnalytics } from './PrefetchManager';
export { RoutePreloader, ROUTE_CONFIGS, type RouteConfig } from './RoutePreloader';
export { HoverPrefetcher, type HoverPrefetchConfig, type HoverTargetType } from './HoverPrefetcher';
export { ScrollPrefetcher, type ScrollPrefetchConfig, type ScrollTriggerType } from './ScrollPrefetcher';

// Infrastructure components
export { BandwidthDetector, type ConnectionType, type PrefetchStrategy, type NetworkConditions } from './BandwidthDetector';
export { PriorityQueue, prefetchQueue, type PrefetchPriority, type PrefetchRequest } from './PriorityQueue';
export { PredictionEngine, type UserBehaviorEvent, type PredictionResult } from './PredictionEngine';
