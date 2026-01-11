"use client";

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { LAZY_LOAD_CONFIG } from '../constants/lazyLoadConfig';

interface LazyLoadTriggerProps {
  /**
   * Callback when trigger becomes visible.
   *
   * Note: This callback is stored in a ref internally to prevent infinite loops
   * if the parent component passes a non-memoized function. However, for best
   * performance, it's recommended to wrap this callback in useCallback.
   */
  onVisible: () => void;

  /**
   * Whether the trigger is enabled
   */
  enabled?: boolean;

  /**
   * Whether currently loading
   */
  isLoading?: boolean;

  /**
   * Custom loading message
   */
  loadingMessage?: string;

  /**
   * Root margin for intersection observer
   */
  rootMargin?: string;

  /**
   * Test ID for testing
   */
  testId?: string;
}

/**
 * Lazy Load Trigger Component
 *
 * Renders an invisible trigger element that calls onVisible when it enters
 * the viewport. Used to implement infinite scroll / lazy loading.
 *
 * @example
 * ```tsx
 * <LazyLoadTrigger
 *   onVisible={loadMore}
 *   enabled={hasMore}
 *   isLoading={isLoadingMore}
 * />
 * ```
 */
export function LazyLoadTrigger({
  onVisible,
  enabled = true,
  isLoading = false,
  loadingMessage = 'Loading more items...',
  rootMargin = LAZY_LOAD_CONFIG.INTERSECTION_ROOT_MARGIN,
  testId = 'lazy-load-trigger'
}: LazyLoadTriggerProps) {
  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin,
    threshold: LAZY_LOAD_CONFIG.INTERSECTION_THRESHOLD,
    enabled: enabled && !isLoading
  });

  // Store callback in ref to prevent infinite loops from non-memoized callbacks
  // This ensures the useEffect doesn't re-run when parent re-renders with new callback reference
  const onVisibleRef = useRef(onVisible);
  useEffect(() => {
    onVisibleRef.current = onVisible;
  });

  // Trigger load when intersecting
  useEffect(() => {
    if (isIntersecting && enabled && !isLoading) {
      onVisibleRef.current();
    }
  }, [isIntersecting, enabled, isLoading]);

  if (!enabled) return null;

  return (
    <div
      ref={ref}
      className="flex items-center justify-center py-8"
      data-testid={testId}
    >
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{loadingMessage}</span>
        </div>
      )}
    </div>
  );
}
