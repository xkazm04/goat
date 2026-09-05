/**
 * useVisibleCollectionItems - Derived State Hook
 *
 * This hook makes the Collection-Grid relationship first-class by explicitly
 * deriving visible collection items from the formula:
 *
 *   VisibleCollectionItems = AllItems - GridPlacedItems
 *
 * The Collection isn't just a browse panel - it's the "remaining work" queue.
 * Users ranking a Top 50 see "these 23 items still need a spot" rather than
 * "everything filtered". This mental model shift makes the UI feel intentional.
 *
 * Key concepts:
 * - placedItemIds: Set of item IDs that are currently placed in the grid
 * - visibleItems: Items available for ranking (not yet placed)
 * - placementStats: Statistics about placement progress
 */

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';

import { useGridStore, GridStoreState } from '@/stores/grid-store';

import { CollectionItem } from '../types';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Extract placed item IDs from grid state.
 *
 * This is the single source of truth for determining which backlog items
 * are currently placed in the grid. Used by both useVisibleCollectionItems
 * and usePlacedItemIds to ensure consistent behavior.
 *
 * @param state - The grid store state
 * @returns Array of backlog item IDs that are currently placed in the grid
 */
export function getPlacedItemIdsFromGrid(state: GridStoreState): string[] {
  const matchedItems = state.gridItems.filter(item => item.context.matched);
  return matchedItems
    .map(item => item.item?.id)
    .filter((id): id is string => Boolean(id));
}

/**
 * Create a stable string representation of placed item IDs for change detection.
 * Sorting ensures the string is deterministic regardless of grid position order.
 *
 * @param ids - Array of placed item IDs
 * @returns Comma-separated sorted string for comparison
 */
function createPlacedIdsString(ids: string[]): string {
  return ids.slice().sort().join(',');
}

export interface PlacementStats {
  /** Total items available in the collection */
  totalItems: number;
  /** Number of items placed in the grid */
  placedCount: number;
  /** Number of items still available to place */
  remainingCount: number;
  /** Completion percentage (0-100) */
  completionPercentage: number;
  /** Whether all items have been placed */
  isComplete: boolean;
  /** Whether any items have been placed */
  hasStarted: boolean;
}

/**
 * Compute placement statistics from one page of the collection plus the grid's
 * own state.
 *
 * `completionPercentage` is a ratio over the GRID, so both of its terms are
 * counted over the grid. The collection page cannot serve as the denominator:
 * `placedCount` counts every matched cell in the grid, including items from
 * pages this panel is not showing, so a page-sized denominator yields a ratio
 * whose numerator and denominator have different predicates - and then needs a
 * clamp to hide it. The grid store owns the real capacity; `fallbackGridSize`
 * covers only the frame before the store has reported one.
 *
 * Exported so the invariant can be pinned in a test rather than trusted.
 */
export function computePlacementStats(args: {
  /** Items on the current collection page (`items.length`) */
  pageItemCount: number;
  /** Matched cells across the whole grid (`placedItemIds.size`) */
  placedCount: number;
  /** Page items not yet placed (`visibleItems.length`) */
  remainingCount: number;
  /** The grid's real capacity, from the store that owns it */
  gridCapacity: number;
  /** Used only when the store has not reported a capacity yet */
  fallbackGridSize?: number;
}): PlacementStats {
  const { pageItemCount, placedCount, remainingCount, gridCapacity, fallbackGridSize } = args;

  const completionTarget = gridCapacity > 0 ? gridCapacity : (fallbackGridSize ?? 0);
  const completionPercentage = completionTarget > 0
    ? Math.round((placedCount / completionTarget) * 100)
    : 0;

  // With both terms counted over the grid, placedCount <= completionTarget holds
  // by construction and no clamp is needed. If that ever stops being true the two
  // numbers cannot both be right, and which one is wrong is not knowable here -
  // so say so loudly rather than clamping the evidence away.
  if (isDev && completionTarget > 0 && placedCount > completionTarget) {
    console.warn(
      `[useVisibleCollectionItems] placedCount (${placedCount}) exceeds grid capacity ` +
      `(${completionTarget}). These cannot both be correct; completionPercentage is not ` +
      `meaningful until one of them is traced.`
    );
  }

  return {
    totalItems: pageItemCount,
    placedCount,
    remainingCount,
    completionPercentage,
    isComplete: completionTarget > 0 && placedCount >= completionTarget,
    hasStarted: placedCount > 0,
  };
}

export interface UseVisibleCollectionItemsOptions {
  /** All items from the collection (before filtering by placement) */
  items: CollectionItem[];
  /**
   * Optional fallback for the completion denominator, used only before the grid
   * store has reported a capacity. The grid store is the authority; do not pass
   * a page size here, because completion is a ratio over the grid and a
   * page-sized denominator does not share a predicate with placedCount.
   */
  maxGridSize?: number;
}

export interface UseVisibleCollectionItemsResult {
  /** Items not yet placed in the grid (available for ranking) */
  visibleItems: CollectionItem[];
  /** Set of item IDs currently placed in the grid */
  placedItemIds: Set<string>;
  /** Statistics about placement progress */
  placementStats: PlacementStats;
  /** Check if a specific item is placed in the grid */
  isItemPlaced: (itemId: string) => boolean;
}

/**
 * Hook for deriving visible collection items based on grid placement state.
 *
 * This creates a first-class derived state that represents:
 * "What items are still available for the user to rank?"
 *
 * Usage:
 * ```tsx
 * const { visibleItems, placementStats } = useVisibleCollectionItems({
 *   items: allCollectionItems,
 *   maxGridSize: 10, // Top 10 list
 * });
 *
 * // visibleItems = items not yet in grid
 * // placementStats.remainingCount = how many slots still need items
 * ```
 */
export function useVisibleCollectionItems(
  options: UseVisibleCollectionItemsOptions
): UseVisibleCollectionItemsResult {
  const { items, maxGridSize } = options;

  // Track placed item IDs with stable reference updates
  const [placedItemIds, setPlacedItemIds] = useState<Set<string>>(new Set());
  // The grid's own capacity, read from the store that owns the grid. placedCount
  // is counted over the grid, so the completion denominator has to be too.
  const [gridCapacity, setGridCapacity] = useState<number>(0);
  const prevKeyRef = useRef<string>('');

  // Subscribe to grid store changes and update only when the placed IDs or the
  // grid's capacity actually change. Capacity is part of the key because a
  // resize moves the completion denominator without touching any placed ID.
  useEffect(() => {
    const readKey = (state: GridStoreState) => {
      const ids = getPlacedItemIdsFromGrid(state);
      return { ids, key: `${createPlacedIdsString(ids)}|${state.maxGridSize}`, capacity: state.maxGridSize };
    };

    const unsubscribe = useGridStore.subscribe((state) => {
      const { ids, key, capacity } = readKey(state);

      // Only update if something actually changed (prevents infinite loops)
      if (key !== prevKeyRef.current) {
        prevKeyRef.current = key;
        setPlacedItemIds(new Set(ids));
        setGridCapacity(capacity);
      }
    });

    // Initialize on mount
    const { ids, key, capacity } = readKey(useGridStore.getState());
    prevKeyRef.current = key;
    setPlacedItemIds(new Set(ids));
    setGridCapacity(capacity);

    return unsubscribe;
  }, []);

  // Derive visible items: All items - Placed items
  const visibleItems = useMemo(() => {
    return items.filter(item => !placedItemIds.has(item.id));
  }, [items, placedItemIds]);

  // Calculate placement statistics
  const placementStats = useMemo((): PlacementStats => computePlacementStats({
    pageItemCount: items.length,
    placedCount: placedItemIds.size,
    remainingCount: visibleItems.length,
    gridCapacity,
    fallbackGridSize: maxGridSize,
  }), [items.length, placedItemIds.size, visibleItems.length, gridCapacity, maxGridSize]);

  // Utility function to check if a specific item is placed
  const isItemPlaced = useCallback(
    (itemId: string) => placedItemIds.has(itemId),
    [placedItemIds]
  );

  return {
    visibleItems,
    placedItemIds,
    placementStats,
    isItemPlaced,
  };
}

/**
 * Standalone hook to get only the placed item IDs from the grid.
 * Useful when you don't need the full visible items computation.
 *
 * Uses the shared getPlacedItemIdsFromGrid utility to ensure consistent
 * behavior with useVisibleCollectionItems.
 */
export function usePlacedItemIds(): Set<string> {
  const [placedItemIds, setPlacedItemIds] = useState<Set<string>>(new Set());
  const prevIdsStringRef = useRef<string>('');

  useEffect(() => {
    const unsubscribe = useGridStore.subscribe((state) => {
      const ids = getPlacedItemIdsFromGrid(state);
      const idsString = createPlacedIdsString(ids);

      if (idsString !== prevIdsStringRef.current) {
        prevIdsStringRef.current = idsString;
        setPlacedItemIds(new Set(ids));
      }
    });

    // Initialize
    const state = useGridStore.getState();
    const ids = getPlacedItemIdsFromGrid(state);
    prevIdsStringRef.current = createPlacedIdsString(ids);
    setPlacedItemIds(new Set(ids));

    return unsubscribe;
  }, []);

  return placedItemIds;
}
