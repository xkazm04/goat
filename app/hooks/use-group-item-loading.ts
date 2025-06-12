import { useCallback, useRef, useMemo } from 'react';
import { useHierarchyStore, useBacklogGroups } from '@/app/stores/hierarchy-store';
import { itemGroupsApi } from '@/app/lib/api/item-groups';

export function useGroupItemLoading() {
  const { 
    loadGroupItems: hierarchyLoadGroupItems,
    getCache,
    setCache
  } = useHierarchyStore();
  
  const backlogGroups = useBacklogGroups();
  
  // Track loading state to prevent duplicate requests
  const loadingGroupsRef = useRef(new Set<string>());
  
  // Cache loaded group IDs for quick lookup
  const loadedGroupIds = useMemo(() => {
    return new Set(
      backlogGroups
        .filter(group => group && group.items && Array.isArray(group.items) && group.items.length > 0)
        .map(group => group.id)
        .filter(id => id)
    );
  }, [backlogGroups]);

  // Updated to use hierarchy store and single API call per group
  const loadGroupItems = useCallback(async (groupId: string) => {
    if (!groupId || typeof groupId !== 'string') {
      return [];
    }

    // Check if already loaded
    if (loadedGroupIds.has(groupId)) {
      const group = backlogGroups.find(g => g.id === groupId);
      return group?.items || [];
    }

    // Check cache first
    const cacheKey = `group_items_${groupId}`;
    const cachedItems = getCache(cacheKey);
    if (cachedItems) {
      hierarchyLoadGroupItems(groupId, cachedItems);
      return cachedItems;
    }

    // Prevent duplicate loading
    if (loadingGroupsRef.current.has(groupId)) {
      return [];
    }

    try {
      // Mark as loading
      loadingGroupsRef.current.add(groupId);
      
      // Single API call per group - get group with items
      const groupWithItems = await itemGroupsApi.getGroup(groupId, true);
      const items = groupWithItems.items || [];
      
      // Cache the items for 10 minutes
      setCache(cacheKey, items, 10 * 60 * 1000);
      
      // Update hierarchy store
      hierarchyLoadGroupItems(groupId, items);
      
      return items;
      
    } catch (error) {
      throw error;
    } finally {
      loadingGroupsRef.current.delete(groupId);
    }
  }, [loadedGroupIds, backlogGroups, getCache, setCache, hierarchyLoadGroupItems]);

  const isGroupLoaded = useCallback((groupId: string): boolean => {
    if (!groupId || typeof groupId !== 'string') {
      return false;
    }
    return loadedGroupIds.has(groupId);
  }, [loadedGroupIds]);

  const isGroupLoading = useCallback((groupId: string): boolean => {
    if (!groupId || typeof groupId !== 'string') {
      return false;
    }
    return loadingGroupsRef.current.has(groupId);
  }, []);

  // Get loaded item count for a group
  const getLoadedItemCount = useCallback((groupId: string): number => {
    if (!groupId || typeof groupId !== 'string') {
      return 0;
    }
    const group = backlogGroups.find(g => g.id === groupId);
    return group?.items?.length || 0;
  }, [backlogGroups]);

  return {
    loadGroupItems,
    isGroupLoaded,
    isGroupLoading,
    getLoadedItemCount,
    loadedGroupIds: Array.from(loadedGroupIds)
  };
}