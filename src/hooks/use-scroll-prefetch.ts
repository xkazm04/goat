/**
 * useScrollPrefetch Hook
 *
 * React hook for scroll-triggered prefetching using Intersection Observer.
 * Useful for infinite scroll, lazy loading sections, and pagination.
 *
 * @example
 * ```tsx
 * // For pagination trigger
 * const paginationRef = useScrollPrefetch({
 *   type: 'pagination',
 *   id: `page-${page + 1}`,
 *   targets: [/* prefetch targets for next page *\/],
 *   rootMargin: '400px', // Trigger when 400px from viewport
 * });
 *
 * return (
 *   <>
 *     {items.map(item => <ItemCard key={item.id} />)}
 *     <div ref={paginationRef}>Loading...</div>
 *   </>
 * );
 * ```
 */

'use client';

import { useRef, useEffect, useCallback } from 'react';

import { type PrefetchTarget } from '@/lib/prefetch/PrefetchManager';
import {
  ScrollPrefetcher,
  type ScrollPrefetchConfig,
  type ScrollTriggerType,
} from '@/lib/prefetch/ScrollPrefetcher';

export interface UseScrollPrefetchOptions
  extends Omit<ScrollPrefetchConfig, 'type' | 'id' | 'targets'> {
  /** Trigger type */
  type?: ScrollTriggerType;
  /** Unique identifier */
  id: string;
  /** Prefetch targets */
  targets: PrefetchTarget[];
  /** Disable prefetching */
  disabled?: boolean;
}

/**
 * Hook for scroll-triggered prefetching
 * Returns a ref to attach to the trigger element
 */
export function useScrollPrefetch<T extends HTMLElement = HTMLElement>(
  options: UseScrollPrefetchOptions
): React.RefObject<T | null> {
  const elementRef = useRef<T>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || options.disabled) {
      return;
    }

    // Register with ScrollPrefetcher
    cleanupRef.current = ScrollPrefetcher.register(element, {
      type: options.type ?? 'custom',
      id: options.id,
      targets: options.targets,
      rootMargin: options.rootMargin,
      threshold: options.threshold,
      once: options.once,
    });

    return () => {
      cleanupRef.current?.();
    };
  }, [
    options.type,
    options.id,
    options.disabled,
    options.rootMargin,
    options.threshold,
    options.once,
    // Note: targets is not in deps to avoid re-registering on every render
    // If targets need to change, provide a stable reference
  ]);

  return elementRef;
}

/**
 * Hook for pagination prefetch trigger
 * Optimized for infinite scroll use cases
 */
export function usePaginationPrefetch<T extends HTMLElement = HTMLElement>(
  options: {
    id: string;
    targets: PrefetchTarget[];
    /** Root margin (default: 400px to trigger early) */
    rootMargin?: string;
    disabled?: boolean;
  }
): React.RefObject<T | null> {
  return useScrollPrefetch<T>({
    type: 'pagination',
    id: options.id,
    targets: options.targets,
    rootMargin: options.rootMargin ?? '400px',
    threshold: 0,
    once: true, // Only trigger once per page
    disabled: options.disabled,
  });
}

/**
 * Hook for item prefetch as it enters viewport
 * Useful for prefetching detail data
 */
export function useItemPrefetch<T extends HTMLElement = HTMLElement>(
  options: {
    id: string;
    targets: PrefetchTarget[];
    /** Root margin (default: 200px) */
    rootMargin?: string;
    disabled?: boolean;
  }
): React.RefObject<T | null> {
  return useScrollPrefetch<T>({
    type: 'item',
    id: options.id,
    targets: options.targets,
    rootMargin: options.rootMargin ?? '200px',
    threshold: 0,
    once: true,
    disabled: options.disabled,
  });
}

/**
 * Hook for section prefetch when scrolling into view
 * Useful for lazy-loaded page sections
 */
export function useSectionPrefetch<T extends HTMLElement = HTMLElement>(
  options: {
    id: string;
    targets: PrefetchTarget[];
    /** Root margin (default: 100px) */
    rootMargin?: string;
    disabled?: boolean;
  }
): React.RefObject<T | null> {
  return useScrollPrefetch<T>({
    type: 'section',
    id: options.id,
    targets: options.targets,
    rootMargin: options.rootMargin ?? '100px',
    threshold: 0.1, // Trigger when 10% visible
    once: true,
    disabled: options.disabled,
  });
}

/**
 * Hook for callback-based scroll prefetch
 * Allows dynamic target generation
 */
export function useScrollPrefetchCallback(): {
  register: <T extends HTMLElement>(
    element: T,
    config: ScrollPrefetchConfig
  ) => () => void;
  unregister: (element: HTMLElement) => void;
  resetPrefetchedIds: () => void;
} {
  const register = useCallback(
    <T extends HTMLElement>(element: T, config: ScrollPrefetchConfig) => {
      return ScrollPrefetcher.register(element, config);
    },
    []
  );

  const unregister = useCallback((element: HTMLElement) => {
    ScrollPrefetcher.unregister(element);
  }, []);

  const resetPrefetchedIds = useCallback(() => {
    ScrollPrefetcher.resetPrefetchedIds();
  }, []);

  return { register, unregister, resetPrefetchedIds };
}

export default useScrollPrefetch;
