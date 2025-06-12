import { useCallback, useRef, useMemo } from 'react';
import { useSessionStore } from '@/app/stores/session-store';

export function useGroupItemLoading() {
  const { 
    backlogGroups, 
    loadGroupItems: sessionLoadGroupItems,
    getGroupItems 
  } = useSessionStore();
  
  // Track loading state to prevent duplicate requests
  const loadingGroupsRef = useRef(new Set<string>());
  
  // FIXED: Better type checking for backlogGroups
  const safeBacklogGroups = useMemo(() => {
    if (!Array.isArray(backlogGroups)) {
      console.warn('⚠️ backlogGroups is not an array in useGroupItemLoading:', typeof backlogGroups);
      return [];
    }
    return backlogGroups;
  }, [backlogGroups]);
  
  // Cache loaded group IDs for quick lookup
  const loadedGroupIds = useMemo(() => {
    return new Set(
      safeBacklogGroups
        .filter(group => group && group.items && Array.isArray(group.items) && group.items.length > 0)
        .map(group => group.id)
        .filter(id => id) // Remove any undefined IDs
    );
  }, [safeBacklogGroups]);

  // FIXED: Use session store's loadGroupItems method
  const loadGroupItems = useCallback(async (groupId: string) => {
    // Type guard for groupId
    if (!groupId || typeof groupId !== 'string') {
      console.error('❌ Invalid groupId provided:', groupId);
      return [];
    }

    // Quick check: already loaded
    if (loadedGroupIds.has(groupId)) {
      const existingItems = getGroupItems(groupId);
      console.log(`✅ Group ${groupId} already loaded with ${existingItems.length} items`);
      return existingItems;
    }

    // Prevent duplicate loading
    if (loadingGroupsRef.current.has(groupId)) {
      console.log(`⏳ Group ${groupId} is already being loaded, skipping...`);
      return [];
    }

    try {
      console.log(`🔄 Loading items for group ${groupId}...`);
      
      // Mark as loading
      loadingGroupsRef.current.add(groupId);
      
      // Use session store's method which properly updates the store
      await sessionLoadGroupItems(groupId);
      
      // Get the loaded items from the store
      const loadedItems = getGroupItems(groupId);
      console.log(`✅ Loaded ${loadedItems.length} items for group ${groupId}`);
      
      return loadedItems;
      
    } catch (error) {
      console.error(`❌ Failed to load items for group ${groupId}:`, error);
      throw error;
    } finally {
      // Always remove from loading set when done
      loadingGroupsRef.current.delete(groupId);
    }
  }, [loadedGroupIds, sessionLoadGroupItems, getGroupItems]);

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

  // Get loaded item count for a group - SAFE VERSION
  const getLoadedItemCount = useCallback((groupId: string): number => {
    if (!groupId || typeof groupId !== 'string') {
      return 0;
    }
    const items = getGroupItems(groupId);
    return items.length;
  }, [getGroupItems]);

  return {
    loadGroupItems,
    isGroupLoaded,
    isGroupLoading,
    getLoadedItemCount,
    loadedGroupIds: Array.from(loadedGroupIds), // For debugging
    // Debug info
    backlogGroupsType: Array.isArray(safeBacklogGroups) ? 'array' : typeof safeBacklogGroups,
    backlogGroupsLength: safeBacklogGroups.length
  };
}