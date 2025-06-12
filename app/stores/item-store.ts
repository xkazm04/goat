import { useSessionStore } from './session-store';
import { useGridStore } from './grid-store';
import { useComparisonStore } from './comparison-store';
import { BacklogGroup, BacklogItem } from '@/app/types/backlog-groups';
import { itemGroupsApi } from '@/app/lib/api/item-groups';


export const useItemStore = () => {
  const sessionStore = useSessionStore();
  const gridStore = useGridStore();
  const comparisonStore = useComparisonStore();

  // Enhanced backlog group management methods
  const loadGroupItems = async (groupId: string): Promise<void> => {
    try {
      console.log(`🔄 ItemStore: Loading items for group ${groupId}...`);
      
      // Get group with items from API using the single endpoint
      const groupWithItems = await itemGroupsApi.getGroup(groupId, true);
      
      console.log(`✅ ItemStore: Loaded group ${groupId} with ${groupWithItems.items.length} items`);
      
      // Update session store directly with API data
      await sessionStore.loadGroupItems(groupId);
      
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
    
    // Use session store's setBacklogGroups which handles the new format
    sessionStore.setBacklogGroups(groups);
  };

  const addItemToGroup = (groupId: string, item: BacklogItem): void => {
    sessionStore.addItemToGroup(groupId, item);
  };

  // Update the removeItemFromGroup method
  const removeItemFromGroup = (groupId: string, itemId: string): void => {
    console.log(`🔄 ItemStore: Coordinating removal of item ${itemId} from group ${groupId}`);
    
    // Step 1: Remove from session store (backlog groups)
    sessionStore.removeItemFromGroup(groupId, itemId);
    
    // Step 2: Clean up grid if the item was assigned there
    gridStore.removeItemByItemId(itemId);
    
    // Step 3: Clear selection if this item was selected
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

  // Get backlog groups in new format for components - directly from session store
  const backlogGroups: BacklogGroup[] = sessionStore.backlogGroups;

  return {
    // Session data
    listSessions: sessionStore.listSessions,
    activeSessionId: sessionStore.activeSessionId,
    backlogGroups, // Return in new format
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
    
    // Enhanced backlog actions
    setBacklogGroups,
    toggleBacklogGroup,
    addItemToGroup,
    removeItemFromGroup,
    loadGroupItems,
    getGroupItems,
    
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
    
    // Compare actions (legacy)
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