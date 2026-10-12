/**
 * useIntersectionObserver Hook
 *
 * Wrapper around the Intersection Observer API for detecting
 * when elements enter/exit the viewport.
 *
 * This module used to be the entry of a "virtualization pattern library"
 * (types for a VirtualizedList, a ScrollPredictor, an AdaptiveLoader, a second
 * LazyLoadTrigger, useVisibleItems) that was never wired: on 2026-09-05 each of
 * those had 0 consumers — the live LazyLoadTrigger and its hook live in
 * `src/app/features/Collection/{components,hooks}/`. What remains is what is
 * reached: `useInView`, consumed by the landing showcase.
 *
 * @example
 * ```tsx
 * const { ref, inView } = useInView({ rootMargin: '200px', once: true });
 *
 * return (
 *   <div ref={ref}>
 *     {inView ? <Content /> : <Placeholder />}
 *   </div>
 * );
 * ```
 */

import { useState, useEffect, useRef, useMemo } from 'react';

// =============================================================================
// Configuration Types
// =============================================================================

interface IntersectionObserverConfig {
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

interface UseIntersectionObserverReturn {
  ref: React.RefObject<HTMLDivElement | null>;
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
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

function useIntersectionObserver(
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
