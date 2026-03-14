"use client";

import { useMemo } from "react";
import { CollectionGroup, CollectionItem } from "@/app/features/Collection/types";
import { filterItemsByQuery } from "../components/CollectionSearch";

interface FilteringResult {
  /** Groups with used items already filtered out */
  availableGroups: CollectionGroup[];
  /** Per-group available counts */
  groupAvailableCounts: Record<string, number>;
  /** Total available items across all groups */
  totalItemCount: number;
  /** Display groups: filtered by active tab + search query */
  displayGroups: CollectionGroup[];
  /** Count of items after search filter */
  filteredItemCount: number;
  /** Flat array of filtered items for quick-select */
  flatFilteredItems: CollectionItem[];
}

/**
 * Centralized filtering hook for collection items.
 * Filters out used items, applies tab/search filters, and calculates counts.
 */
export function useCollectionFiltering(
  groups: CollectionGroup[],
  activeTab: string | 'all',
  searchQuery: string
): FilteringResult {
  return useMemo(() => {
    // Step 1: Filter out used items from ALL groups ONCE
    const groupsWithAvailable = groups.map(group => {
      const availableItems = (group.items || []).filter(item => !item.used);
      return { ...group, items: availableItems };
    });

    // Step 2: Calculate per-group counts
    const countsMap: Record<string, number> = {};
    let total = 0;
    groupsWithAvailable.forEach(group => {
      const count = group.items?.length || 0;
      countsMap[group.id] = count;
      total += count;
    });

    // Step 3: Filter by active tab
    const selectedGroups = activeTab === 'all'
      ? groupsWithAvailable
      : groupsWithAvailable.filter(g => g.id === activeTab);

    // Step 4: Apply search filter
    const searchFilteredGroups = selectedGroups.map(group => {
      const matchingItems = searchQuery
        ? filterItemsByQuery(group.items || [], searchQuery)
        : group.items || [];
      return { ...group, items: matchingItems };
    });

    // Step 5: Calculate filtered item count
    const filtered = searchFilteredGroups.reduce((sum, g) => sum + (g.items?.length || 0), 0);

    // Step 6: Flatten all filtered items
    const flatItems: CollectionItem[] = [];
    searchFilteredGroups.forEach(group => {
      if (group.items) flatItems.push(...group.items);
    });

    return {
      availableGroups: groupsWithAvailable,
      groupAvailableCounts: countsMap,
      totalItemCount: total,
      displayGroups: searchFilteredGroups,
      filteredItemCount: filtered,
      flatFilteredItems: flatItems,
    };
  }, [groups, activeTab, searchQuery]);
}
