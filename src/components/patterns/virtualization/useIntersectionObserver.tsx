/**
 * useIntersectionObserver Hook
 *
 * Wrapper around the Intersection Observer API for detecting
 * when elements enter/exit the viewport.
 *
 * @example
 * ```tsx
 * const { ref, isIntersecting } = useIntersectionObserver({
 *   threshold: 0.1,
 *   rootMargin: '200px',
 * });
 *
 * return (
 *   <div ref={ref}>
 *     {isIntersecting ? <Content /> : <Placeholder />}
 *   </div>
 * );
 * ```
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import type { UseIntersectionObserverReturn } from './types';

// =============================================================================
// Configuration Types
// =============================================================================

export interface IntersectionObserverConfig {
  /** Element to use as viewport for checking visibility */
  root?: Element | null;
  /** Margin around the root */
  rootMargin?: string;
  /** Threshold(s) at which to trigger callback */
  threshold?: number | number[];
  /** Only trigger once when intersecting */
  triggerOnce?: boolean;
  /** Initial state before observation */
  initialIsIntersecting?: boolean;
  /** Callback when intersection changes */
  onChange?: (isIntersecting: boolean, entry: IntersectionObserverEntry) => void;
}

const DEFAULT_CONFIG: IntersectionObserverConfig = {
  root: null,
  rootMargin: '0px',
  threshold: 0,
  triggerOnce: false,
  initialIsIntersecting: false,
};

// =============================================================================
// useIntersectionObserver Hook
// =============================================================================

export function useIntersectionObserver(
  config: IntersectionObserverConfig = {}
): UseIntersectionObserverReturn {
  const mergedConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config]
  );

  const ref = useRef<HTMLDivElement>(null);
  // Without IntersectionObserver the element counts as visible from the first
  // render (decided once; the server assumes the API exists, as every current
  // browser does) rather than being flipped by a setState inside the effect.
  const [isIntersecting, setIsIntersecting] = useState(
    () =>
      (mergedConfig.initialIsIntersecting ?? false) ||
      (typeof window !== 'undefined' && !('IntersectionObserver' in window))
  );
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const hasTriggeredRef = useRef(false);

  // Latest-callback ref so the observer is not re-created per render. Written
  // from an effect, not during render (react-hooks/refs).
  const onChangeRef = useRef(mergedConfig.onChange);
  useEffect(() => {
    onChangeRef.current = mergedConfig.onChange;
  }, [mergedConfig.onChange]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Don't observe if triggerOnce and already triggered
    if (mergedConfig.triggerOnce && hasTriggeredRef.current) return;

    // No IntersectionObserver: already visible via the initial state above.
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [observerEntry] = entries;
        const newIsIntersecting = observerEntry.isIntersecting;

        setIsIntersecting(newIsIntersecting);
        setEntry(observerEntry);

        // Call onChange callback
        onChangeRef.current?.(newIsIntersecting, observerEntry);

        // Handle triggerOnce
        if (newIsIntersecting && mergedConfig.triggerOnce) {
          hasTriggeredRef.current = true;
          observer.disconnect();
        }
      },
      {
        root: mergedConfig.root,
        rootMargin: mergedConfig.rootMargin,
        threshold: mergedConfig.threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [
    mergedConfig.root,
    mergedConfig.rootMargin,
    mergedConfig.threshold,
    mergedConfig.triggerOnce,
  ]);

  return {
    ref,
    isIntersecting,
    entry,
  };
}

// =============================================================================
// useInView Hook (Simpler API)
// =============================================================================

export interface UseInViewConfig {
  /** Margin around the root */
  rootMargin?: string;
  /** Threshold at which to trigger */
  threshold?: number;
  /** Only trigger once */
  once?: boolean;
}

export interface UseInViewReturn {
  ref: React.RefObject<HTMLDivElement | null>;
  inView: boolean;
}

export function useInView(config: UseInViewConfig = {}): UseInViewReturn {
  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin: config.rootMargin,
    threshold: config.threshold,
    triggerOnce: config.once,
  });

  return {
    ref,
    inView: isIntersecting,
  };
}

// =============================================================================
// LazyLoadTrigger Component
// =============================================================================

export interface LazyLoadTriggerProps {
  /** Callback when trigger becomes visible */
  onVisible: () => void;
  /** Enable/disable trigger */
  enabled?: boolean;
  /** Show loading state */
  isLoading?: boolean;
  /** Loading message */
  loadingMessage?: string;
  /** Intersection root margin */
  rootMargin?: string;
  /** Test ID for testing */
  testId?: string;
  /** Custom class name */
  className?: string;
}

export function LazyLoadTrigger({
  onVisible,
  enabled = true,
  isLoading = false,
  loadingMessage = 'Loading more items...',
  rootMargin = '200px',
  testId,
  className,
}: LazyLoadTriggerProps) {
  // Latest-callback ref so a non-memoised prop cannot re-fire the effect below.
  // Written from an effect, not during render (react-hooks/refs).
  const onVisibleRef = useRef(onVisible);
  useEffect(() => {
    onVisibleRef.current = onVisible;
  }, [onVisible]);

  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin,
    threshold: 0.1,
  });

  useEffect(() => {
    if (isIntersecting && enabled && !isLoading) {
      onVisibleRef.current();
    }
  }, [isIntersecting, enabled, isLoading]);

  if (!enabled) return null;

  return (
    <div
      ref={ref}
      data-testid={testId}
      className={className}
      style={{ minHeight: 1 }}
    >
      {isLoading && (
        <div className="flex items-center justify-center py-4 text-sm text-zinc-500">
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
          {loadingMessage}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// useVisibleItems Hook
// =============================================================================

export interface UseVisibleItemsConfig {
  /** Number of items */
  itemCount: number;
  /** Estimated item height */
  itemHeight: number;
  /** Container height */
  containerHeight: number;
  /** Overscan items */
  overscan?: number;
}

export interface UseVisibleItemsReturn {
  startIndex: number;
  endIndex: number;
  visibleCount: number;
  scrollHandler: (scrollTop: number) => void;
}

export function useVisibleItems(
  config: UseVisibleItemsConfig
): UseVisibleItemsReturn {
  const { itemCount, itemHeight, containerHeight, overscan = 5 } = config;

  const [scrollTop, setScrollTop] = useState(0);

  const visibleCount = useMemo(() => {
    return Math.ceil(containerHeight / itemHeight) + overscan * 2;
  }, [containerHeight, itemHeight, overscan]);

  const startIndex = useMemo(() => {
    const rawStart = Math.floor(scrollTop / itemHeight) - overscan;
    return Math.max(0, rawStart);
  }, [scrollTop, itemHeight, overscan]);

  const endIndex = useMemo(() => {
    const rawEnd = startIndex + visibleCount;
    return Math.min(itemCount - 1, rawEnd);
  }, [startIndex, visibleCount, itemCount]);

  const scrollHandler = useCallback((newScrollTop: number) => {
    setScrollTop(newScrollTop);
  }, []);

  return {
    startIndex,
    endIndex,
    visibleCount,
    scrollHandler,
  };
}

export default useIntersectionObserver;
