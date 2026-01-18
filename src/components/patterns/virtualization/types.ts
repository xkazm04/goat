/**
 * Virtualization Pattern Library Types
 *
 * Shared types for virtualized lists, grids, and lazy loading patterns.
 * Provides consistent interfaces for performant rendering of large datasets.
 */

// =============================================================================
// Core Virtualization Types
// =============================================================================

export interface VisibleRange {
  startIndex: number;
  endIndex: number;
  startOffset: number;
  endOffset: number;
  overscanStart: number;
  overscanEnd: number;
}

export interface ScrollPosition {
  scrollTop: number;
  scrollLeft?: number;
  timestamp: number;
}

export interface ItemMeasurement {
  index: number;
  height: number;
  offset: number;
  measuredAt: number;
}

// =============================================================================
// Configuration Types
// =============================================================================

export interface VirtualizationConfig {
  /** Estimated height for unmeasured items */
  estimatedItemHeight: number;
  /** Number of extra items to render outside viewport */
  overscanCount: number;
  /** Support variable height items */
  variableHeights: boolean;
  /** Maximum cache size for measurements */
  maxCacheSize: number;
  /** Cache eviction threshold in ms */
  cacheEvictionThreshold: number;
  /** Minimum batch size for rendering */
  minBatchSize: number;
  /** Maximum batch size for rendering */
  maxBatchSize: number;
}

export interface ScrollPredictorConfig {
  /** Number of samples to keep */
  sampleSize: number;
  /** Maximum age of samples in ms */
  maxSampleAge: number;
  /** How far ahead to predict in ms */
  predictionHorizon: number;
  /** Minimum velocity to register (px/s) */
  minVelocityThreshold: number;
  /** Maximum velocity cap (px/s) */
  maxVelocity: number;
  /** Deceleration rate for flick scrolls */
  decelerationRate: number;
  /** Estimated item height for calculations */
  estimatedItemHeight: number;
  /** Number of items to preload ahead */
  preloadAheadCount: number;
}

export interface AdaptiveLoaderConfig {
  /** Device capability tier */
  tier: DeviceTier;
  /** Network condition */
  networkCondition: NetworkCondition;
  /** Memory pressure level */
  memoryPressure: MemoryPressure;
}

// =============================================================================
// Device & Performance Types
// =============================================================================

export type DeviceTier = 'low' | 'medium' | 'high';
export type NetworkCondition = 'slow' | 'medium' | 'fast' | 'offline';
export type MemoryPressure = 'low' | 'medium' | 'high' | 'critical';

export interface DeviceCapabilities {
  cpuCores: number;
  memoryGB: number;
  hasGPU: boolean;
  isMobile: boolean;
  supportsOffscreenCanvas: boolean;
  maxTextureSize: number;
}

export interface AdaptiveStrategy {
  batchSize: number;
  preloadCount: number;
  imageQuality: 'low' | 'medium' | 'high';
  shouldReduceAnimations: boolean;
  shouldUseSimpleSkeleton: boolean;
  shouldUsePlaceholderImages: boolean;
  maxConcurrentLoads: number;
  debounceMs: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  frameDrops: number;
  memoryUsage: number;
  longTaskCount: number;
  renderTime: number;
}

// =============================================================================
// Scroll Prediction Types
// =============================================================================

export type ScrollDirection = -1 | 0 | 1; // -1 = up, 0 = stationary, 1 = down

export interface ScrollPrediction {
  velocity: number;
  direction: ScrollDirection;
  confidence: number;
  isDecelerating: boolean;
  preloadRange: {
    start: number;
    end: number;
  };
}

export interface VelocitySample {
  position: number;
  time: number;
  velocity: number;
}

// =============================================================================
// Component Props Types
// =============================================================================

export interface VirtualizedListProps<T> {
  /** Items to render */
  items: T[];
  /** Total count for infinite scroll */
  totalCount?: number;
  /** Get unique key for item */
  getItemKey: (item: T, index: number) => string;
  /** Render function for items */
  renderItem: (props: VirtualizedItemProps<T>) => React.ReactNode;
  /** Load more callback for infinite scroll */
  onLoadMore?: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Scroll callback */
  onScroll?: (scrollTop: number, direction: ScrollDirection) => void;
  /** Visible range change callback */
  onVisibleRangeChange?: (range: VisibleRange) => void;
  /** Container height */
  height: number | string;
  /** Container width */
  width?: number | string;
  /** Virtualization config */
  config?: Partial<VirtualizedListConfig>;
  /** Header element */
  header?: React.ReactNode;
  /** Footer element */
  footer?: React.ReactNode;
  /** Empty state element */
  emptyState?: React.ReactNode;
  /** Loading component */
  loadingComponent?: React.ReactNode;
  /** Custom class name */
  className?: string;
}

export interface VirtualizedListConfig {
  estimatedItemHeight: number;
  overscanCount: number;
  variableHeights: boolean;
  enablePrediction: boolean;
  enableAdaptiveLoading: boolean;
  skeletonVariant: SkeletonVariant;
  scrollThrottle: number;
  smoothScroll: boolean;
  infiniteScroll: boolean;
  loadMoreThreshold: number;
}

export interface VirtualizedItemProps<T> {
  item: T;
  index: number;
  style: React.CSSProperties;
  isVisible: boolean;
  isPreloading: boolean;
  measureRef: (node: HTMLElement | null) => void;
}

export interface VirtualizedGridProps<T> {
  /** Items to render */
  items: T[];
  /** Render function for items */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Fixed item height */
  itemHeight: number;
  /** Number of columns */
  columns: number;
  /** Gap between items in px */
  gap: number;
  /** Extra rows to render */
  overscan?: number;
  /** Enable scroll velocity prediction */
  enablePrediction?: boolean;
  /** Enable device-aware loading */
  enableAdaptiveLoading?: boolean;
  /** Skeleton variant */
  skeletonVariant?: SkeletonVariant;
  /** Visible range change callback */
  onVisibleRangeChange?: (range: VisibleRange) => void;
  /** Scroll direction change callback */
  onScrollDirectionChange?: (direction: ScrollDirection) => void;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Lazy Loading Types
// =============================================================================

export interface LazyLoadConfig {
  /** Initial items to load */
  initialLoadCount: number;
  /** Items per page */
  pageSize: number;
  /** Items to prefetch ahead */
  prefetchCount: number;
  /** Enable lazy loading */
  enabled: boolean;
}

export interface LazyLoadState<T> {
  visibleItems: T[];
  totalItems: number;
  loadedCount: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadProgress: number;
}

export interface LazyLoadActions {
  loadMore: () => void;
  loadAll: () => void;
  reset: () => void;
}

export interface LazyLoadTriggerProps {
  onVisible: () => void;
  enabled?: boolean;
  isLoading?: boolean;
  loadingMessage?: string;
  rootMargin?: string;
  testId?: string;
}

// =============================================================================
// Skeleton Types
// =============================================================================

export type SkeletonVariant = 'shimmer' | 'simple' | 'fast';

export interface SkeletonConfig {
  variant: SkeletonVariant;
  count: number;
  height?: number | string;
  width?: number | string;
  className?: string;
}

// =============================================================================
// Hook Return Types
// =============================================================================

export interface UseVirtualizedListReturn<T> {
  /** Visible items to render */
  visibleItems: Array<VirtualizedItemProps<T>>;
  /** Total scroll height */
  totalHeight: number;
  /** Current scroll position */
  scrollPosition: ScrollPosition;
  /** Container props */
  containerProps: {
    ref: React.RefObject<HTMLDivElement | null>;
    style: React.CSSProperties;
    onScroll: (e: React.UIEvent) => void;
  };
  /** Inner container props */
  innerProps: {
    style: React.CSSProperties;
  };
  /** Imperative methods */
  scrollTo: (offset: number) => void;
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
  refresh: () => void;
}

export interface UseLazyLoadReturn<T> extends LazyLoadState<T>, LazyLoadActions {}

export interface UseIntersectionObserverReturn {
  ref: React.RefObject<HTMLDivElement | null>;
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
}

export interface UseScrollPredictorReturn {
  prediction: ScrollPrediction;
  addSample: (position: number) => void;
  reset: () => void;
  accuracy: number;
}

export interface UseAdaptiveLoaderReturn {
  strategy: AdaptiveStrategy;
  capabilities: DeviceCapabilities;
  metrics: PerformanceMetrics;
  tier: DeviceTier;
  refresh: () => void;
}
