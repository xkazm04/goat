import { useEffect, useRef, useState, RefObject } from 'react';

export interface UseIntersectionObserverOptions {
  /**
   * Root element for intersection detection
   * Defaults to browser viewport
   */
  root?: Element | null;

  /**
   * Margin around root element
   * Can trigger callback before element enters viewport
   */
  rootMargin?: string;

  /**
   * Threshold for triggering callback (0.0 to 1.0)
   */
  threshold?: number | number[];

  /**
   * Whether the observer is enabled
   */
  enabled?: boolean;

  /**
   * Callback when intersection state changes
   */
  onIntersect?: (isIntersecting: boolean) => void;
}

export interface UseIntersectionObserverResult {
  /**
   * Ref to attach to the element to observe
   */
  ref: RefObject<HTMLDivElement | null>;

  /**
   * Whether the element is currently intersecting
   */
  isIntersecting: boolean;

  /**
   * The intersection observer entry
   */
  entry: IntersectionObserverEntry | null;
}

/**
 * Hook for observing element visibility with Intersection Observer API
 *
 * @example
 * ```tsx
 * const { ref, isIntersecting } = useIntersectionObserver({
 *   rootMargin: '200px',
 *   threshold: 0.1,
 *   onIntersect: (isVisible) => {
 *     if (isVisible) {
 *       loadMoreItems();
 *     }
 *   }
 * });
 *
 * return <div ref={ref}>Load trigger</div>;
 * ```
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverResult {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0,
    enabled = true,
    onIntersect
  } = options;

  const targetRef = useRef<HTMLDivElement>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const target = targetRef.current;
    if (!target) return;

    // Create intersection observer
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setEntry(entry);
        setIsIntersecting(entry.isIntersecting);

        // Call callback if provided
        if (onIntersect) {
          onIntersect(entry.isIntersecting);
        }
      },
      {
        root,
        rootMargin,
        threshold
      }
    );

    // Start observing
    observer.observe(target);

    // Cleanup
    return () => {
      observer.unobserve(target);
      observer.disconnect();
    };
  }, [root, rootMargin, threshold, enabled, onIntersect]);

  return {
    ref: targetRef,
    isIntersecting,
    entry
  };
}
