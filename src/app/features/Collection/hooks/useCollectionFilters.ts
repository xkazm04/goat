/**
 * Hook for managing collection filters and selections
 */

import { useState, useMemo, useCallback } from 'react';
import { CollectionGroup, CollectionFilter } from '../types';

export function useCollectionFilters(groups: CollectionGroup[]) {
  const [filter, setFilter] = useState<CollectionFilter>({
    searchTerm: '',
    selectedGroupIds: new Set(groups.map(g => g.id)),
    sortBy: 'name',
    sortOrder: 'asc'
  });

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

  return {
    filter,
    filteredGroups,
    selectedGroups,
    filteredItems,
    toggleGroup,
    selectAll,
    deselectAll,
    setSearchTerm,
    setCategory
  };
}

