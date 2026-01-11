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
  const matchedItems = state.gridItems.filter(item => item.matched);
  return matchedItems
    .map(item => item.backlogItemId)
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

export interface UseVisibleCollectionItemsOptions {
  /** All items from the collection (before filtering by placement) */
  items: CollectionItem[];
  /** Optional: Max grid size to calculate completion against */
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
  const prevIdsStringRef = useRef<string>('');

  // Subscribe to grid store changes and update placed IDs only when they actually change
  useEffect(() => {
    const unsubscribe = useGridStore.subscribe((state) => {
      const ids = getPlacedItemIdsFromGrid(state);
      const idsString = createPlacedIdsString(ids);

      // Only update if the IDs actually changed (prevents infinite loops)
      if (idsString !== prevIdsStringRef.current) {
        prevIdsStringRef.current = idsString;
        setPlacedItemIds(new Set(ids));
      }
    });

    // Initialize on mount
    const state = useGridStore.getState();
    const ids = getPlacedItemIdsFromGrid(state);
    const idsString = createPlacedIdsString(ids);
    prevIdsStringRef.current = idsString;
    setPlacedItemIds(new Set(ids));

    return unsubscribe;
  }, []);

  // Derive visible items: All items - Placed items
  const visibleItems = useMemo(() => {
    return items.filter(item => !placedItemIds.has(item.id));
  }, [items, placedItemIds]);

  // Calculate placement statistics
  const placementStats = useMemo((): PlacementStats => {
    const totalItems = items.length;
    const placedCount = placedItemIds.size;
    const remainingCount = visibleItems.length;

    // Use grid size for completion calculation if provided
    const completionTarget = maxGridSize ?? totalItems;
    const completionPercentage = completionTarget > 0
      ? Math.round((placedCount / completionTarget) * 100)
      : 0;

    return {
      totalItems,
      placedCount,
      remainingCount,
      completionPercentage: Math.min(completionPercentage, 100), // Cap at 100%
      isComplete: maxGridSize ? placedCount >= maxGridSize : remainingCount === 0,
      hasStarted: placedCount > 0,
    };
  }, [items.length, placedItemIds.size, visibleItems.length, maxGridSize]);

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
