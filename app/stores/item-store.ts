import { useSessionStore } from './session-store';
import { useGridStore } from './grid-store';
import { useComparisonStore } from './comparison-store';
import { BacklogGroup, BacklogItem } from '@/app/types/backlog-groups';
import { itemGroupsApi } from '@/app/lib/api/item-groups';

export const useItemStore = () => {
  const sessionStore = useSessionStore();
  const gridStore = useGridStore();
  const comparisonStore = useComparisonStore();

  // Initial data loading - fetch once and store locally
  const initializeBacklogData = async (category: string, subcategory?: string): Promise<void> => {
    try {
      console.log(`🚀 ItemStore: Initializing backlog data for ${category}${subcategory ? `/${subcategory}` : ''}`);
      
      // Check if we already have data for this category
      const existingGroups = sessionStore.getGroupsByCategory(category, subcategory);
      if (existingGroups.length > 0) {
        console.log(`✅ ItemStore: Using cached data (${existingGroups.length} groups)`);
        return;
      }

      // Fetch all groups for the category with basic info
      console.log(`🔄 ItemStore: Fetching groups from API...`);
      const groups = await itemGroupsApi.getGroupsByCategory(category, subcategory);
      
      console.log(`📦 ItemStore: Received ${groups.length} groups, storing locally...`);
      
      // Store groups in session store
      sessionStore.setBacklogGroups(groups);
      
      // Prefetch items for first few groups (top 5 most important)
      const topGroups = groups
        .filter(group => group.item_count > 0)
        .sort((a, b) => b.item_count - a.item_count)
        .slice(0, 5);

      console.log(`🎯 ItemStore: Prefetching items for top ${topGroups.length} groups...`);
      
      // Load items for top groups in parallel
      await Promise.allSettled(
        topGroups.map(async (group) => {
          try {
            const groupWithItems = await itemGroupsApi.getGroup(group.id, true);
            sessionStore.updateGroupItems(group.id, groupWithItems.items);
            console.log(`✅ Prefetched ${groupWithItems.items.length} items for ${group.name}`);
          } catch (error) {
            console.warn(`⚠️ Failed to prefetch items for ${group.name}:`, error);
          }
        })
      );

      console.log(`🎉 ItemStore: Initialization complete!`);
      
    } catch (error) {
      console.error(`❌ ItemStore: Failed to initialize backlog data:`, error);
      throw error;
    }
  };

  // Load items for a specific group (lazy loading)
  const loadGroupItems = async (groupId: string): Promise<void> => {
    try {
      // Check if items are already loaded
      const existingItems = sessionStore.getGroupItems(groupId);
      if (existingItems.length > 0) {
        console.log(`✅ ItemStore: Group ${groupId} items already loaded`);
        return;
      }

      console.log(`🔄 ItemStore: Loading items for group ${groupId}...`);
      
      const groupWithItems = await itemGroupsApi.getGroup(groupId, true);
      sessionStore.updateGroupItems(groupId, groupWithItems.items);
      
      console.log(`✅ ItemStore: Loaded ${groupWithItems.items.length} items for group ${groupId}`);
      
    } catch (error) {
      console.error(`❌ ItemStore: Failed to load items for group ${groupId}:`, error);
      throw error;
    }
  };

  const getGroupItems = (groupId: string): BacklogItem[] => {
    return sessionStore.getGroupItems(groupId);
  };

  const setBacklogGroups = (groups: BacklogGroup[]): void => {
    console.log('🔄 ItemStore: Setting backlog groups:', groups.length);
    sessionStore.setBacklogGroups(groups);
  };

  const addItemToGroup = (groupId: string, item: BacklogItem): void => {
    sessionStore.addItemToGroup(groupId, item);
  };

  const removeItemFromGroup = (groupId: string, itemId: string): void => {
    console.log(`🔄 ItemStore: Coordinating removal of item ${itemId} from group ${groupId}`);
    
    sessionStore.removeItemFromGroup(groupId, itemId);
    gridStore.removeItemByItemId(itemId);
    
    if (sessionStore.selectedBacklogItem === itemId) {
      sessionStore.setSelectedBacklogItem(null);
    }
    
    console.log(`✅ ItemStore: Successfully removed item ${itemId}`);
  };

  const toggleBacklogGroup = (groupId: string): void => {
    sessionStore.toggleBacklogGroup(groupId);
  };

  const getAvailableBacklogItems = (): BacklogItem[] => {
    return sessionStore.getAvailableBacklogItems();
  };

  // Local search/filter without API calls
  const searchGroups = (searchTerm: string): BacklogGroup[] => {
    return sessionStore.searchGroups(searchTerm);
  };

  const filterGroupsByCategory = (category: string, subcategory?: string): BacklogGroup[] => {
    return sessionStore.getGroupsByCategory(category, subcategory);
  };

  // Get backlog groups from local store
  const backlogGroups: BacklogGroup[] = sessionStore.backlogGroups;

  return {
    // Session data
    listSessions: sessionStore.listSessions,
    activeSessionId: sessionStore.activeSessionId,
    backlogGroups,
    selectedBacklogItem: sessionStore.selectedBacklogItem,
    compareList: sessionStore.compareList,
    
    // Grid data
    gridItems: gridStore.gridItems,
    maxGridSize: gridStore.maxGridSize,
    selectedGridItem: gridStore.selectedGridItem,
    activeItem: gridStore.activeItem,
    
    // Comparison data
    comparison: {
      isOpen: comparisonStore.isComparisonOpen,
      items: comparisonStore.items,
      selectedForComparison: comparisonStore.selectedForComparison,
      comparisonMode: comparisonStore.comparisonMode
    },
    
    // Session actions
    createSession: sessionStore.createSession,
    switchToSession: sessionStore.switchToSession,
    saveCurrentSession: sessionStore.saveCurrentSession,
    loadSession: sessionStore.loadSession,
    deleteSession: sessionStore.deleteSession,
    syncWithList: sessionStore.syncWithList,
    
    // Enhanced backlog actions - LOCAL ONLY
    initializeBacklogData, // NEW: Single initialization call
    setBacklogGroups,
    toggleBacklogGroup,
    addItemToGroup,
    removeItemFromGroup,
    loadGroupItems, // Lazy loading for individual groups
    getGroupItems,
    searchGroups: sessionStore.searchGroups,
    filterGroupsByCategory: sessionStore.getGroupsByCategory,
    
    // Grid actions
    initializeGrid: gridStore.initializeGrid,
    assignItemToGrid: gridStore.assignItemToGrid,
    removeItemFromGrid: gridStore.removeItemFromGrid,
    moveGridItem: gridStore.moveGridItem,
    clearGrid: gridStore.clearGrid,
    
    // Selection actions
    setSelectedBacklogItem: sessionStore.setSelectedBacklogItem,
    setSelectedGridItem: gridStore.setSelectedGridItem,
    setActiveItem: gridStore.setActiveItem,
    
    // Compare actions
    toggleCompareItem: sessionStore.toggleCompareItem,
    clearCompareList: sessionStore.clearCompareList,
    
    // Comparison actions
    openComparison: comparisonStore.openComparison,
    closeComparison: comparisonStore.closeComparison,
    addToComparison: comparisonStore.addToComparison,
    removeFromComparison: comparisonStore.removeFromComparison,
    toggleComparisonSelection: comparisonStore.toggleComparisonSelection,
    clearComparison: comparisonStore.clearComparison,
    setComparisonMode: comparisonStore.setComparisonMode,
    
    // Drag & Drop
    handleDragEnd: gridStore.handleDragEnd,
    
    // Utilities
    getAvailableBacklogItems,
    getMatchedItems: gridStore.getMatchedItems,
    getNextAvailableGridPosition: gridStore.getNextAvailableGridPosition,
    canAddAtPosition: gridStore.canAddAtPosition,
    
    // Session utilities
    getSessionProgress: sessionStore.getSessionProgress,
    getAllSessions: sessionStore.getAllSessions,
    hasUnsavedChanges: sessionStore.hasUnsavedChanges,
    getSessionMetadata: sessionStore.getSessionMetadata,
    
    // Reset
    resetStore: () => {
      sessionStore.resetStore();
      gridStore.syncWithSession();
      comparisonStore.clearComparison();
    },
    
    syncWithBackend: sessionStore.syncWithBackend
  };
};