/**
 * Hook for managing collection filters and selections
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { CollectionGroup, CollectionFilter } from '../types';

// Easter egg keywords that trigger the spotlight effect
const EASTER_EGG_KEYWORDS = ['wizard', 'magic', 'secret', 'hidden'];
const SPOTLIGHT_DURATION = 5000; // 5 seconds

export function useCollectionFilters(groups: CollectionGroup[]) {
  const [filter, setFilter] = useState<CollectionFilter>({
    searchTerm: '',
    selectedGroupIds: new Set(groups.map(g => g.id)),
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Easter egg state: tracks which item is currently spotlighted
  const [spotlightItemId, setSpotlightItemId] = useState<string | null>(null);
  const spotlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter groups based on search term
  const filteredGroups = useMemo(() => {
    if (!filter.searchTerm) return groups;

    const searchLower = filter.searchTerm.toLowerCase();
    return groups.filter(group => 
      group.name.toLowerCase().includes(searchLower) ||
      group.items?.some(item => 
        item.title.toLowerCase().includes(searchLower)
      )
    );
  }, [groups, filter.searchTerm]);

  // Get selected groups
  const selectedGroups = useMemo(() => {
    return filteredGroups.filter(g => filter.selectedGroupIds.has(g.id));
  }, [filteredGroups, filter.selectedGroupIds]);

  // Get filtered items from selected groups
  const filteredItems = useMemo(() => {
    const allItems = selectedGroups.flatMap(group => 
      (group.items || []).map(item => ({ ...item, groupId: group.id }))
    );

    if (!filter.searchTerm) return allItems;

    const searchLower = filter.searchTerm.toLowerCase();
    return allItems.filter(item =>
      item.title.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower)
    );
  }, [selectedGroups, filter.searchTerm]);

  const toggleGroup = useCallback((groupId: string) => {
    setFilter(prev => {
      const newSet = new Set(prev.selectedGroupIds);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return { ...prev, selectedGroupIds: newSet };
    });
  }, []);

  const selectAll = useCallback(() => {
    setFilter(prev => ({
      ...prev,
      selectedGroupIds: new Set(filteredGroups.map(g => g.id))
    }));
  }, [filteredGroups]);

  const deselectAll = useCallback(() => {
    setFilter(prev => ({
      ...prev,
      selectedGroupIds: new Set()
    }));
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    setFilter(prev => ({ ...prev, searchTerm: term }));
  }, []);

  const setCategory = useCallback((category?: string) => {
    setFilter(prev => ({ ...prev, selectedCategory: category }));
  }, []);

  // Easter egg detection: Check if search term matches a keyword
  useEffect(() => {
    const searchLower = filter.searchTerm.toLowerCase().trim();

    // Check if the search term matches any easter egg keyword
    const isEasterEgg = EASTER_EGG_KEYWORDS.some(keyword =>
      searchLower === keyword
    );

    if (isEasterEgg && filteredItems.length > 0) {
      // Clear any existing timeout
      if (spotlightTimeoutRef.current) {
        clearTimeout(spotlightTimeoutRef.current);
      }

      // Select a random item from the filtered items
      const randomIndex = Math.floor(Math.random() * filteredItems.length);
      const randomItem = filteredItems[randomIndex];
      setSpotlightItemId(randomItem.id);

      // Clear the spotlight after the duration
      spotlightTimeoutRef.current = setTimeout(() => {
        setSpotlightItemId(null);
      }, SPOTLIGHT_DURATION);
    } else if (!isEasterEgg && spotlightItemId) {
      // Clear spotlight if search term changes away from easter egg
      if (spotlightTimeoutRef.current) {
        clearTimeout(spotlightTimeoutRef.current);
      }
      setSpotlightItemId(null);
    }

    // Cleanup on unmount
    return () => {
      if (spotlightTimeoutRef.current) {
        clearTimeout(spotlightTimeoutRef.current);
      }
    };
  }, [filter.searchTerm, filteredItems, spotlightItemId]);

  return {
    filter,
    filteredGroups,
    selectedGroups,
    filteredItems,
    toggleGroup,
    selectAll,
    deselectAll,
    setSearchTerm,
    setCategory,
    spotlightItemId // Expose the spotlighted item ID
  };
}




