/**
 * useHoverPrefetch Hook
 *
 * React hook for hover-triggered prefetching.
 * Automatically registers elements for hover prefetch and cleans up on unmount.
 *
 * @example
 * ```tsx
 * // For a link to a list
 * const listCardRef = useHoverPrefetch({
 *   type: 'list-card',
 *   id: `list-${listId}`,
 *   href: `/lists/${listId}`,
 * });
 *
 * return <div ref={listCardRef}>List Card</div>;
 * ```
 */

'use client';

import { useRef, useEffect, useCallback } from 'react';
import {
  HoverPrefetcher,
  type HoverPrefetchConfig,
  type HoverTargetType,
} from '@/lib/prefetch/HoverPrefetcher';
import { type PrefetchTarget } from '@/lib/prefetch/PrefetchManager';
import { topListsKeys } from '@/lib/query-keys/top-lists';
import { collectionKeys } from '@/lib/query-keys/collection';
import { goatApi } from '@/lib/api/goat-api';
import { CACHE_TTL_MS } from '@/lib/cache/unified-cache';

export interface UseHoverPrefetchOptions extends Omit<HoverPrefetchConfig, 'targets'> {
  /** Custom targets override */
  targets?: PrefetchTarget[];
  /** Disabled flag */
  disabled?: boolean;
}

/**
 * Hook for hover-triggered prefetching
 * Returns a ref to attach to the element
 */
export function useHoverPrefetch<T extends HTMLElement = HTMLElement>(
  options: UseHoverPrefetchOptions
): React.RefObject<T | null> {
  const elementRef = useRef<T>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || options.disabled) {
      return;
    }

    // Register with HoverPrefetcher
    cleanupRef.current = HoverPrefetcher.register(element, {
      type: options.type,
      id: options.id,
      href: options.href,
      targets: options.targets,
      data: options.data,
    });

    return () => {
      cleanupRef.current?.();
    };
  }, [options.type, options.id, options.href, options.disabled, options.targets, options.data]);

  return elementRef;
}

/**
 * Pre-built hook for list card hover prefetch
 */
export function useListCardPrefetch(
  listId: string,
  options?: { disabled?: boolean }
) {
  return useHoverPrefetch({
    type: 'list-card',
    id: `list-card-${listId}`,
    href: `/lists/${listId}`,
    targets: [
      {
        id: `list-${listId}`,
        queryKey: topListsKeys.list(listId, true),
        queryFn: () => goatApi.lists.get(listId, true),
        staleTime: CACHE_TTL_MS.STANDARD,
        priority: 'high',
        source: 'hover',
        metadata: { dataType: 'list-detail', listId },
      },
    ],
    disabled: options?.disabled,
  });
}

/**
 * Pre-built hook for category hover prefetch
 */
export function useCategoryPrefetch(
  category: string,
  subcategory?: string,
  options?: { disabled?: boolean }
) {
  return useHoverPrefetch({
    type: 'category',
    id: `category-${category}${subcategory ? `-${subcategory}` : ''}`,
    href: `/browse/${category}${subcategory ? `?sub=${subcategory}` : ''}`,
    data: { category, subcategory },
    targets: [
      {
        id: `groups-${category}`,
        queryKey: collectionKeys.groupsList({ category, subcategory }),
        queryFn: () => goatApi.groups.getByCategory(category, { subcategory }),
        staleTime: CACHE_TTL_MS.LONG,
        priority: 'high',
        source: 'hover',
        metadata: { dataType: 'groups', category, subcategory },
      },
    ],
    disabled: options?.disabled,
  });
}

/**
 * Pre-built hook for blueprint hover prefetch
 */
export function useBlueprintPrefetch(
  slug: string,
  options?: { disabled?: boolean }
) {
  return useHoverPrefetch({
    type: 'blueprint',
    id: `blueprint-${slug}`,
    href: `/blueprints/${slug}`,
    targets: [
      {
        id: `blueprint-${slug}`,
        queryKey: ['blueprints', slug],
        queryFn: () => goatApi.blueprints.get(slug),
        staleTime: CACHE_TTL_MS.LONG,
        priority: 'high',
        source: 'hover',
        metadata: { dataType: 'blueprint-detail', slug },
      },
    ],
    disabled: options?.disabled,
  });
}

/**
 * Hook for prefetching links on hover
 * Automatically determines prefetch strategy from href
 */
export function useLinkPrefetch(
  href: string,
  options?: { disabled?: boolean }
) {
  return useHoverPrefetch({
    type: 'link',
    id: `link-${href.replace(/[^a-zA-Z0-9]/g, '-')}`,
    href,
    disabled: options?.disabled,
  });
}

/**
 * Hook to manually trigger prefetch on an element
 */
export function usePrefetchCallback(): {
  triggerPrefetch: (element: HTMLElement) => void;
  prefetchByConfig: (config: HoverPrefetchConfig) => void;
} {
  const triggerPrefetch = useCallback((element: HTMLElement) => {
    HoverPrefetcher.prefetch(element);
  }, []);

  const prefetchByConfig = useCallback((config: HoverPrefetchConfig) => {
    HoverPrefetcher.prefetchByConfig(config);
  }, []);

  return { triggerPrefetch, prefetchByConfig };
}

export default useHoverPrefetch;
