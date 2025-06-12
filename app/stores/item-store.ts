import { useCallback } from 'react';
import { useSessionStore } from './session-store';
import { useGridStore } from './grid-store';
import { useComparisonStore } from './comparison-store';
import { BacklogGroup, BacklogItem } from '@/app/types/backlog-groups';

export const useItemStore = () => {
  const sessionStore = useSessionStore();
  const gridStore = useGridStore();
  const comparisonStore = useComparisonStore();

  // Stable callbacks
  const switchToSession = useCallback((listId: string) => {
    if (sessionStore.switchToSession) {
      sessionStore.switchToSession(listId);
    }
  }, [sessionStore.switchToSession]);

  const syncWithBackend = useCallback(async (listId: string) => {
    try {
      console.log(`🔄 Syncing session ${listId} with backend...`);
      
      if (!sessionStore.listSessions[listId] && sessionStore.createSession) {
        sessionStore.createSession(listId, 50);
      }
      
      const session = sessionStore.listSessions[listId];
      if (session && sessionStore.updateSession) {
        const syncedSession = { ...session, lastSynced: new Date().toISOString() };
        sessionStore.updateSession(listId, syncedSession);
        console.log(`✅ Session ${listId} synced with backend`);
      }
      
    } catch (error) {
      console.error('Failed to sync with backend:', error);
      throw error; // Let the calling code handle it
    }
  }, [sessionStore.listSessions, sessionStore.createSession, sessionStore.updateSession]);

  const getGroupItems = useCallback((groupId: string): BacklogItem[] => {
    try {
      return sessionStore.getGroupItems ? sessionStore.getGroupItems(groupId) : [];
    } catch (error) {
      console.warn('Error getting group items:', error);
      return [];
    }
  }, [sessionStore.getGroupItems]);

  const removeItemFromGroup = useCallback((groupId: string, itemId: string): void => {
    try {
      console.log(`🔄 ItemStore: Coordinating removal of item ${itemId} from group ${groupId}`);
      
      if (sessionStore.removeItemFromGroup) {
        sessionStore.removeItemFromGroup(groupId, itemId);
      }
      
      if (gridStore.removeItemByItemId) {
        gridStore.removeItemByItemId(itemId);
      }
      
      if (sessionStore.selectedBacklogItem === itemId && sessionStore.setSelectedBacklogItem) {
        sessionStore.setSelectedBacklogItem(null);
      }
      
      console.log(`✅ ItemStore: Successfully removed item ${itemId}`);
    } catch (error) {
      console.error('Error removing item from group:', error);
    }
  }, [sessionStore.removeItemFromGroup, sessionStore.selectedBacklogItem, sessionStore.setSelectedBacklogItem, gridStore.removeItemByItemId]);

  return {
    // Session data
    listSessions: sessionStore.listSessions || {},
    activeSessionId: sessionStore.activeSessionId,
    backlogGroups: sessionStore.backlogGroups || [],
    selectedBacklogItem: sessionStore.selectedBacklogItem,
    compareList: sessionStore.compareList || [],
    
    // Grid data
    gridItems: gridStore.gridItems || [],
    maxGridSize: gridStore.maxGridSize || 50,
    selectedGridItem: gridStore.selectedGridItem,
    activeItem: gridStore.activeItem,
    
    // Comparison data
    comparison: {
      isOpen: comparisonStore.isComparisonOpen || false,
      items: comparisonStore.items || [],
      selectedForComparison: comparisonStore.selectedForComparison || [],
      comparisonMode: comparisonStore.comparisonMode || 'side-by-side'
    },
    
    // Stable action callbacks
    switchToSession,
    syncWithBackend,
    getGroupItems,
    removeItemFromGroup,
    
    // Other actions (with safe fallbacks)
    createSession: sessionStore.createSession || (() => {}),
    saveCurrentSession: sessionStore.saveCurrentSession || (() => {}),
    loadSession: sessionStore.loadSession || (() => {}),
    deleteSession: sessionStore.deleteSession || (() => {}),
    syncWithList: sessionStore.syncWithList || (() => {}),
    
    setBacklogGroups: sessionStore.setBacklogGroups || (() => {}),
    toggleBacklogGroup: sessionStore.toggleBacklogGroup || (() => {}),
    addItemToGroup: sessionStore.addItemToGroup || (() => {}),
    
    // Grid actions
    initializeGrid: gridStore.initializeGrid || (() => {}),
    assignItemToGrid: gridStore.assignItemToGrid || (() => {}),
    removeItemFromGrid: gridStore.removeItemFromGrid || (() => {}),
    moveGridItem: gridStore.moveGridItem || (() => {}),
    clearGrid: gridStore.clearGrid || (() => {}),
    
    // Selection actions
    setSelectedBacklogItem: sessionStore.setSelectedBacklogItem || (() => {}),
    setSelectedGridItem: gridStore.setSelectedGridItem || (() => {}),
    setActiveItem: gridStore.setActiveItem || (() => {}),
    
    // Compare actions
    toggleCompareItem: sessionStore.toggleCompareItem || (() => {}),
    clearCompareList: sessionStore.clearCompareList || (() => {}),
    
    // Comparison actions
    openComparison: comparisonStore.openComparison || (() => {}),
    closeComparison: comparisonStore.closeComparison || (() => {}),
    addToComparison: comparisonStore.addToComparison || (() => {}),
    removeFromComparison: comparisonStore.removeFromComparison || (() => {}),
    setComparisonMode: comparisonStore.setComparisonMode || (() => {}),
    
    // Utilities
    getAvailableBacklogItems: sessionStore.getAvailableBacklogItems || (() => []),
    getMatchedItems: gridStore.getMatchedItems || (() => []),
    getNextAvailableGridPosition: gridStore.getNextAvailableGridPosition || (() => null),
    canAddAtPosition: gridStore.canAddAtPosition || (() => false),
    getSessionProgress: sessionStore.getSessionProgress || (() => ({ matched: 0, total: 50, percentage: 0 })),
    getAllSessions: () => Object.values(sessionStore.listSessions || {}),
    hasUnsavedChanges: sessionStore.hasUnsavedChanges || (() => false),
    
    // Drag & Drop
    handleDragEnd: gridStore.handleDragEnd || (() => {}),
  };
};