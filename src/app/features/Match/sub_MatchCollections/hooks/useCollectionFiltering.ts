"use client";

import { useMemo } from "react";
import { CollectionGroup, CollectionItem } from "@/app/features/Collection/types";
import { filterItemsByQuery } from "@/lib/utils/search";

interface FilteringResult {
  /** Groups with used items already filtered out */
  availableGroups: CollectionGroup[];
  /** Per-group available counts */
  groupAvailableCounts: Record<string, number>;
  /** Total available items across all groups */
  totalItemCount: number;
  /** Display groups: filtered by active tab + search query (includes used items for dimming) */
  displayGroups: CollectionGroup[];
  /** Count of items after search filter */
  filteredItemCount: number;
  /** Flat array of filtered items for quick-select (excludes used items) */
  flatFilteredItems: CollectionItem[];
  /** Per-group count of items matching the search query */
  groupMatchCounts: Record<string, number>;
  /** Set of group IDs whose name matched the search query */
  groupNameMatches: Record<string, boolean>;
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
    // Step 1: Build available-only groups for counts, and all-items groups for display
    const groupsWithAvailable = groups.map(group => {
      const availableItems = (group.items || []).filter(item => !item.used);
      return { ...group, items: availableItems };
    });

    // All-items groups: keep used items but sort them to the end
    const allItemsGroups = groups.map(group => {
      const items = group.items || [];
      const sorted = [...items].sort((a, b) => (a.used ? 1 : 0) - (b.used ? 1 : 0));
      return { ...group, items: sorted };
    });

    // Step 2: Calculate per-group available counts (excludes used)
    const countsMap: Record<string, number> = {};
    let total = 0;
    groupsWithAvailable.forEach(group => {
      const count = group.items?.length || 0;
      countsMap[group.id] = count;
      total += count;
    });

    // Step 3: Filter by active tab (use all-items groups for display)
    const selectedGroups = activeTab === 'all'
      ? allItemsGroups
      : allItemsGroups.filter(g => g.id === activeTab);

    // Step 4: Apply search filter and track match context
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const matchCounts: Record<string, number> = {};
    const nameMatches: Record<string, boolean> = {};

    const searchFilteredGroups = selectedGroups.map(group => {
      if (!normalizedQuery) {
        return { ...group, items: group.items || [] };
      }

      const groupNameMatch = (group.name || '').toLowerCase().includes(normalizedQuery);
      nameMatches[group.id] = groupNameMatch;

      const matchingItems = filterItemsByQuery(group.items || [], searchQuery);
      matchCounts[group.id] = matchingItems.length;

      // If the group name matches, show all items; otherwise only matching items
      const displayItems = groupNameMatch ? (group.items || []) : matchingItems;
      return { ...group, items: displayItems };
    });

    // Step 5: Calculate filtered item count (exclude used from count)
    const filtered = searchFilteredGroups.reduce(
      (sum, g) => sum + (g.items?.filter(i => !i.used)?.length || 0), 0
    );

    // Step 6: Flatten all filtered items (exclude used for quick-select)
    const flatItems: CollectionItem[] = [];
    searchFilteredGroups.forEach(group => {
      if (group.items) flatItems.push(...group.items.filter(i => !i.used));
    });

    return {
      availableGroups: groupsWithAvailable,
      groupAvailableCounts: countsMap,
      totalItemCount: total,
      displayGroups: searchFilteredGroups,
      filteredItemCount: filtered,
      flatFilteredItems: flatItems,
      groupMatchCounts: matchCounts,
      groupNameMatches: nameMatches,
    };
  }, [groups, activeTab, searchQuery]);
}
