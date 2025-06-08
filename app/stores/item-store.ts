import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DragEndEvent } from '@dnd-kit/core';
import { GridItemType, BacklogItemType, BacklogGroupType } from '@/app/types/match';

// Import utilities
import { ListSession, SessionProgress } from './item/types';
import { SessionManager } from './item/session-manager';
import { DefaultDataProvider } from './item/default-data';
import { GridOperations } from './item/grid-operations';

interface ItemStoreState {
  // Multi-list sessions
  listSessions: Record<string, ListSession>;
  activeSessionId: string | null;
  
  // Current session state (derived from activeSessionId)
  gridItems: GridItemType[];
  maxGridSize: number;
  backlogGroups: BacklogGroupType[];
  selectedBacklogItem: string | null;
  selectedGridItem: string | null;
  activeItem: string | null;
  compareList: BacklogItemType[];
  
  // Actions - Session Management
  createSession: (listId: string, size: number) => void;
  switchToSession: (listId: string) => void;
  saveCurrentSession: () => void;
  loadSession: (listId: string) => void;
  deleteSession: (listId: string) => void;
  syncWithList: (listId: string, category?: string) => void; // Fix: Added missing function
  
  // Actions - Grid Management
  initializeGrid: (size: number, listId: string, category?: string) => void;
  assignItemToGrid: (item: BacklogItemType, position: number) => void;
  removeItemFromGrid: (position: number) => void;
  moveGridItem: (fromIndex: number, toIndex: number) => void;
  clearGrid: () => void;
  
  // Actions - Backlog Management
  setBacklogGroups: (groups: BacklogGroupType[]) => void;
  toggleBacklogGroup: (groupId: string) => void;
  addItemToGroup: (groupId: string, title: string, description?: string) => Promise<void>;
  removeItemFromGroup: (itemId: string) => void;
  
  // Actions - Selection
  setSelectedBacklogItem: (id: string | null) => void;
  setSelectedGridItem: (id: string | null) => void;
  setActiveItem: (id: string | null) => void;
  
  // Actions - Compare List
  toggleCompareItem: (item: BacklogItemType) => void;
  clearCompareList: () => void;
  
  // Actions - Drag & Drop
  handleDragEnd: (event: DragEndEvent) => void;
  
  // Utilities
  getAvailableBacklogItems: () => BacklogItemType[];
  getMatchedItems: () => GridItemType[];
  getNextAvailableGridPosition: () => number | null;
  canAddAtPosition: (position: number) => boolean;
  
  // Session utilities
  getSessionProgress: (listId?: string) => SessionProgress;
  getAllSessions: () => ListSession[];
  hasUnsavedChanges: (listId?: string) => boolean;
  getSessionMetadata: (listId?: string) => any;
  
  // Reset and sync
  resetStore: () => void;
  syncWithBackend: (listId: string) => Promise<void>;
}

export const useItemStore = create<ItemStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      listSessions: {},
      activeSessionId: null,
      gridItems: [],
      maxGridSize: 50,
      backlogGroups: [],
      selectedBacklogItem: null,
      selectedGridItem: null,
      activeItem: null,
      compareList: [],

      // Session Management
      createSession: (listId: string, size: number = 50) => {
        console.log(`Creating session for list ${listId} with size ${size}`);
        
        const session = SessionManager.createEmptySession(listId, size);
        
        set((state) => ({
          listSessions: {
            ...state.listSessions,
            [listId]: session
          },
          activeSessionId: listId,
          gridItems: session.gridItems,
          backlogGroups: session.backlogGroups,
          selectedBacklogItem: null,
          selectedGridItem: null,
          compareList: [],
          maxGridSize: size
        }));
      },

      switchToSession: (listId: string) => {
        const state = get();
        
        // Save current session before switching
        if (state.activeSessionId && state.activeSessionId !== listId) {
          get().saveCurrentSession();
        }
        
        // Load target session
        get().loadSession(listId);
      },

      saveCurrentSession: () => {
        const state = get();
        if (!state.activeSessionId) return;
        
        const currentSession = state.listSessions[state.activeSessionId];
        if (!currentSession) return;

        const updatedSession = SessionManager.updateSessionTimestamp({
          ...currentSession,
          gridItems: state.gridItems,
          backlogGroups: state.backlogGroups,
          selectedBacklogItem: state.selectedBacklogItem,
          selectedGridItem: state.selectedGridItem,
          compareList: state.compareList,
        });
        
        set((state) => ({
          listSessions: {
            ...state.listSessions,
            [state.activeSessionId!]: updatedSession
          }
        }));
      },

      loadSession: (listId: string) => {
        const state = get();
        const session = state.listSessions[listId];
        
        if (session && SessionManager.validateSession(session)) {
          set({
            activeSessionId: listId,
            gridItems: session.gridItems,
            backlogGroups: session.backlogGroups,
            selectedBacklogItem: session.selectedBacklogItem,
            selectedGridItem: session.selectedGridItem,
            compareList: session.compareList,
            maxGridSize: session.listSize
          });
        } else {
          // Create new session with default size if it doesn't exist or is invalid
          console.warn(`Session for list ${listId} not found or invalid, creating new session`);
          get().createSession(listId, 50); // Default size
        }
      },

      deleteSession: (listId: string) => {
        set((state) => {
          const { [listId]: deleted, ...remainingSessions } = state.listSessions;
          
          return {
            listSessions: remainingSessions,
            activeSessionId: state.activeSessionId === listId ? null : state.activeSessionId
          };
        });
      },

      // Fix: Added missing syncWithList function
      syncWithList: (listId: string, category: string = 'general') => {
        const state = get();
        
        // Check if session exists
        if (!state.listSessions[listId]) {
          // Create session first
          get().createSession(listId, 50); // Default size, will be updated when list loads
        }
        
        // Switch to session
        if (state.activeSessionId !== listId) {
          get().switchToSession(listId);
        }
        
        // Initialize backlog if empty
        const currentSession = state.listSessions[listId];
        if (currentSession && currentSession.backlogGroups.length === 0) {
          const defaultGroups = DefaultDataProvider.getDefaultBacklogGroups(category);
          
          set((state) => ({
            backlogGroups: defaultGroups
          }));
          
          // Save the updated session
          setTimeout(() => get().saveCurrentSession(), 100);
        }
      },

      // Grid Management
      initializeGrid: (size: number, listId: string, category: string = 'general') => {
        console.log(`Initializing grid for list ${listId} with size ${size} and category ${category}`);
        
        const state = get();
        
        // Check if we need to switch sessions
        if (state.activeSessionId !== listId) {
          get().switchToSession(listId);
        }
        
        // Update session with correct size if different
        const currentSession = state.listSessions[listId];
        if (!currentSession || currentSession.listSize !== size) {
          get().createSession(listId, size);
        }
        
        const gridItems = Array.from({ length: size }, (_, index) => ({
          id: `grid-${index}`,
          title: '',
          tags: [],
          matched: false,
        }));
        
        const defaultGroups = DefaultDataProvider.getDefaultBacklogGroups(category);
        
        set({ 
          gridItems, 
          maxGridSize: size, 
          backlogGroups: defaultGroups,
          selectedBacklogItem: null,
          selectedGridItem: null,
          activeItem: null
        });
        
        // Save the initialized session
        get().saveCurrentSession();
      },

      assignItemToGrid: (item: BacklogItemType, position: number) => {
        const state = get();
        
        const result = GridOperations.assignItemToGrid(
          state.gridItems,
          state.backlogGroups,
          item,
          position
        );
        
        if (result) {
          set({
            gridItems: result.gridItems,
            backlogGroups: result.backlogGroups,
            selectedBacklogItem: null,
            compareList: state.compareList.filter(compareItem => compareItem.id !== item.id)
          });
          
          // Auto-save after assignment
          setTimeout(() => get().saveCurrentSession(), 100);
        }
      },

      removeItemFromGrid: (position: number) => {
        const state = get();
        
        const result = GridOperations.removeItemFromGrid(
          state.gridItems,
          state.backlogGroups,
          position
        );
        
        if (result) {
          set({
            gridItems: result.gridItems,
            backlogGroups: result.backlogGroups
          });
          
          // Auto-save after removal
          setTimeout(() => get().saveCurrentSession(), 100);
        }
      },

      moveGridItem: (fromIndex: number, toIndex: number) => {
        const state = get();
        
        const result = GridOperations.moveGridItem(
          state.gridItems,
          state.backlogGroups,
          fromIndex,
          toIndex
        );
        
        if (result) {
          set({
            gridItems: result.gridItems,
            backlogGroups: result.backlogGroups
          });
          
          // Auto-save after move
          setTimeout(() => get().saveCurrentSession(), 100);
        }
      },

      clearGrid: () => {
        const state = get();
        
        const result = GridOperations.clearGrid(
          state.gridItems,
          state.backlogGroups
        );
        
        set({
          gridItems: result.gridItems,
          backlogGroups: result.backlogGroups,
          selectedBacklogItem: null,
          selectedGridItem: null,
          compareList: []
        });
        
        // Auto-save after clear
        setTimeout(() => get().saveCurrentSession(), 100);
      },

      // Backlog Management
      setBacklogGroups: (groups) => set({ backlogGroups: groups }),

      toggleBacklogGroup: (groupId) => set((state) => ({
        backlogGroups: state.backlogGroups.map(group =>
          group.id === groupId ? { ...group, isOpen: !group.isOpen } : group
        )
      })),

      addItemToGroup: async (groupId, title, description) => {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        set((state) => ({
          backlogGroups: state.backlogGroups.map(group =>
            group.id === groupId 
              ? {
                  ...group,
                  items: [
                    ...group.items,
                    {
                      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      title,
                      description,
                      matched: false,
                      tags: []
                    }
                  ]
                }
              : group
          )
        }));
        
        // Auto-save after adding item
        setTimeout(() => get().saveCurrentSession(), 100);
      },

      removeItemFromGroup: (itemId) => set((state) => {
        const itemToRemove = state.backlogGroups
          .flatMap(group => group.items)
          .find(item => item.id === itemId);
        
        let updatedGridItems = state.gridItems;
        
        if (itemToRemove?.matched && itemToRemove.matchedWith) {
          const gridPosition = parseInt(itemToRemove.matchedWith.replace('grid-', ''));
          updatedGridItems = [...state.gridItems];
          updatedGridItems[gridPosition] = {
            id: `grid-${gridPosition}`,
            title: '',
            tags: [],
            matched: false,
            matchedWith: undefined
          };
        }

        return {
          backlogGroups: state.backlogGroups.map(group => ({
            ...group,
            items: group.items.filter(item => item.id !== itemId)
          })),
          gridItems: updatedGridItems,
          compareList: state.compareList.filter(item => item.id !== itemId),
          selectedBacklogItem: state.selectedBacklogItem === itemId ? null : state.selectedBacklogItem
        };
      }),

      // Selection Management
      setSelectedBacklogItem: (id) => set({ selectedBacklogItem: id }),
      setSelectedGridItem: (id) => set({ selectedGridItem: id }),
      setActiveItem: (id) => set({ activeItem: id }),

      // Compare List Management
      toggleCompareItem: (item) => set((state) => {
        const isInList = state.compareList.some(compareItem => compareItem.id === item.id);
        
        if (isInList) {
          return {
            compareList: state.compareList.filter(compareItem => compareItem.id !== item.id)
          };
        } else {
          return {
            compareList: [...state.compareList, item]
          };
        }
      }),

      clearCompareList: () => set({ compareList: [] }),

      // Drag & Drop Handler
      handleDragEnd: (event) => {
        const { active, over } = event;
        
        if (!over) return;

        const state = get();
        const activeId = active.id.toString();
        const overId = over.id.toString();
        
        // Handle backlog item being dropped on grid
        if (overId.startsWith('grid-')) {
          const position = parseInt(overId.replace('grid-', ''));
          
          const backlogItem = state.backlogGroups
            .flatMap(group => group.items)
            .find(item => item.id === activeId);
          
          if (backlogItem && state.canAddAtPosition(position)) {
            get().assignItemToGrid(backlogItem, position);
          }
        }
        
        // Handle reordering within grid
        if (active.id.toString().startsWith('grid-') && over.id.toString().startsWith('grid-')) {
          const fromIndex = parseInt(active.id.toString().replace('grid-', ''));
          const toIndex = parseInt(over.id.toString().replace('grid-', ''));
          
          if (fromIndex !== toIndex && state.gridItems[fromIndex].matched) {
            get().moveGridItem(fromIndex, toIndex);
          }
        }
      },

      // Utilities
      getAvailableBacklogItems: () => {
        const state = get();
        return GridOperations.getAvailableBacklogItems(state.backlogGroups);
      },

      getMatchedItems: () => {
        const state = get();
        return GridOperations.getMatchedItems(state.gridItems);
      },

      getNextAvailableGridPosition: () => {
        const state = get();
        return GridOperations.getNextAvailablePosition(state.gridItems);
      },

      canAddAtPosition: (position) => {
        const state = get();
        return GridOperations.canAddAtPosition(state.gridItems, position);
      },

      // Session Utilities
      getSessionProgress: (listId) => {
        const state = get();
        const targetSession = listId ? state.listSessions[listId] : null;
        const gridItems = targetSession ? targetSession.gridItems : state.gridItems;
        
        return SessionManager.calculateProgress(gridItems);
      },

      getAllSessions: () => {
        const state = get();
        return Object.values(state.listSessions);
      },

      hasUnsavedChanges: (listId) => {
        const state = get();
        const sessionId = listId || state.activeSessionId;
        if (!sessionId) return false;
        
        const session = state.listSessions[sessionId];
        if (!session) return false;
        
        return SessionManager.hasUnsavedChanges(session);
      },

      getSessionMetadata: (listId) => {
        const state = get();
        const sessionId = listId || state.activeSessionId;
        if (!sessionId) return null;
        
        const session = state.listSessions[sessionId];
        if (!session) return null;
        
        return SessionManager.getSessionMetadata(session);
      },

      // Reset and Sync
      resetStore: () => set({
        listSessions: {},
        activeSessionId: null,
        gridItems: [],
        backlogGroups: [],
        selectedBacklogItem: null,
        selectedGridItem: null,
        activeItem: null,
        compareList: []
      }),

      syncWithBackend: async (listId) => {
        console.log(`Syncing session ${listId} with backend...`);
        
        try {
          // Here you would call your backend API to get list items
          // const listWithItems = await topListsApi.getList(listId, true);
          // Then populate the session with real data
          
          const state = get();
          
          // Ensure session exists
          if (!state.listSessions[listId]) {
            get().createSession(listId, 50); // Default size, will be updated when list loads
          }
          
          // Mark session as synced
          const session = state.listSessions[listId];
          if (session) {
            const syncedSession = SessionManager.markSessionSynced(session);
            
            set((state) => ({
              listSessions: {
                ...state.listSessions,
                [listId]: syncedSession
              }
            }));
          }
          
        } catch (error) {
          console.error('Failed to sync with backend:', error);
        }
      }
    }),
    {
      name: 'item-store',
      partialize: (state) => ({
        listSessions: state.listSessions,
        activeSessionId: state.activeSessionId
      })
    }
  )
);

// Enhanced selector hooks
export const useGridItems = () => useItemStore((state) => state.gridItems);
export const useBacklogGroups = () => useItemStore((state) => state.backlogGroups);
export const useActiveSession = () => useItemStore((state) => ({
  activeSessionId: state.activeSessionId,
  hasSession: !!state.activeSessionId
}));
export const useSelection = () => useItemStore((state) => ({
  selectedBacklogItem: state.selectedBacklogItem,
  selectedGridItem: state.selectedGridItem,
  activeItem: state.activeItem
}));
export const useCompareList = () => useItemStore((state) => state.compareList);
export const useGridUtilities = () => useItemStore((state) => ({
  getAvailableBacklogItems: state.getAvailableBacklogItems,
  getMatchedItems: state.getMatchedItems,
  getNextAvailableGridPosition: state.getNextAvailableGridPosition,
  canAddAtPosition: state.canAddAtPosition
}));
export const useSessionProgress = () => useItemStore((state) => state.getSessionProgress());
export const useSessionMetadata = () => useItemStore((state) => state.getSessionMetadata());