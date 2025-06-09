import { useSessionStore } from './session-store';
import { useGridStore } from './grid-store';
import { useComparisonStore } from './comparison-store';

// Unified hook that provides the same interface as the old useItemStore
export const useItemStore = () => {
  const sessionStore = useSessionStore();
  const gridStore = useGridStore();
  const comparisonStore = useComparisonStore();

  return {
    // Session data
    listSessions: sessionStore.listSessions,
    activeSessionId: sessionStore.activeSessionId,
    backlogGroups: sessionStore.backlogGroups,
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
    
    // Backlog actions
    setBacklogGroups: sessionStore.setBacklogGroups,
    toggleBacklogGroup: sessionStore.toggleBacklogGroup,
    addItemToGroup: sessionStore.addItemToGroup,
    removeItemFromGroup: sessionStore.removeItemFromGroup,
    
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
    getAvailableBacklogItems: sessionStore.getAvailableBacklogItems,
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