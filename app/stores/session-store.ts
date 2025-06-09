import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GridItemType, BacklogItemType, BacklogGroupType } from '@/app/types/match';
import { ListSession, SessionProgress } from './item-store/types';
import { SessionManager } from './item-store/session-manager';
import { DefaultDataProvider } from './item-store/default-data';

interface SessionStoreState {
  // Multi-list sessions
  listSessions: Record<string, ListSession>;
  activeSessionId: string | null;
  
  // Current session state
  backlogGroups: BacklogGroupType[];
  selectedBacklogItem: string | null;
  compareList: BacklogItemType[]; // Legacy support
  
  // Actions - Session Management
  createSession: (listId: string, size: number) => void;
  switchToSession: (listId: string) => void;
  saveCurrentSession: () => void;
  loadSession: (listId: string) => void;
  deleteSession: (listId: string) => void;
  syncWithList: (listId: string, category?: string) => void;
  
  // Actions - Backlog Management
  setBacklogGroups: (groups: BacklogGroupType[]) => void;
  toggleBacklogGroup: (groupId: string) => void;
  addItemToGroup: (groupId: string, title: string, description?: string) => Promise<void>;
  removeItemFromGroup: (itemId: string) => void;
  
  // Actions - Selection
  setSelectedBacklogItem: (id: string | null) => void;
  
  // Actions - Compare List (Legacy)
  toggleCompareItem: (item: BacklogItemType) => void;
  clearCompareList: () => void;
  
  // Utilities
  getAvailableBacklogItems: () => BacklogItemType[];
  getSessionProgress: (listId?: string) => SessionProgress;
  getAllSessions: () => ListSession[];
  hasUnsavedChanges: (listId?: string) => boolean;
  getSessionMetadata: (listId?: string) => any;
  
  // Integration hooks for other stores
  updateSessionGridItems: (gridItems: GridItemType[]) => void;
  getActiveSession: () => ListSession | null;
  
  // Reset and sync
  resetStore: () => void;
  syncWithBackend: (listId: string) => Promise<void>;
}

export const useSessionStore = create<SessionStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      listSessions: {},
      activeSessionId: null,
      backlogGroups: [],
      selectedBacklogItem: null,
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
          backlogGroups: session.backlogGroups,
          selectedBacklogItem: null,
          compareList: []
        }));
      },

      switchToSession: (listId: string) => {
        const state = get();
        
        if (state.activeSessionId && state.activeSessionId !== listId) {
          get().saveCurrentSession();
        }
        
        get().loadSession(listId);
      },

      saveCurrentSession: () => {
        const state = get();
        if (!state.activeSessionId) return;
        
        const currentSession = state.listSessions[state.activeSessionId];
        if (!currentSession) return;

        const updatedSession = SessionManager.updateSessionTimestamp({
          ...currentSession,
          backlogGroups: state.backlogGroups,
          selectedBacklogItem: state.selectedBacklogItem,
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
            backlogGroups: session.backlogGroups,
            selectedBacklogItem: session.selectedBacklogItem,
            compareList: session.compareList
          });
        } else {
          console.warn(`Session for list ${listId} not found, creating new session`);
          get().createSession(listId, 50);
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

      syncWithList: (listId: string, category: string = 'general') => {
        const state = get();
        
        if (!state.listSessions[listId]) {
          get().createSession(listId, 50);
        }
        
        if (state.activeSessionId !== listId) {
          get().switchToSession(listId);
        }
        
        const currentSession = state.listSessions[listId];
        if (currentSession && currentSession.backlogGroups.length === 0) {
          const defaultGroups = DefaultDataProvider.getDefaultBacklogGroups(category);
          
          set({ backlogGroups: defaultGroups });
          setTimeout(() => get().saveCurrentSession(), 100);
        }
      },

      // Backlog Management
      setBacklogGroups: (groups) => set({ backlogGroups: groups }),

      toggleBacklogGroup: (groupId) => {
        set((state) => {
          const updatedGroups = state.backlogGroups.map(group => {
            if (group.id === groupId) {
              return { ...group, isOpen: !group.isOpen };
            }
            return group;
          });
          
          return { backlogGroups: updatedGroups };
        });
        
        setTimeout(() => get().saveCurrentSession(), 100);
      },

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
        
        setTimeout(() => get().saveCurrentSession(), 100);
      },

      removeItemFromGroup: (itemId) => {
        set((state) => ({
          backlogGroups: state.backlogGroups.map(group => ({
            ...group,
            items: group.items.filter(item => item.id !== itemId)
          })),
          compareList: state.compareList.filter(item => item.id !== itemId),
          selectedBacklogItem: state.selectedBacklogItem === itemId ? null : state.selectedBacklogItem
        }));
      },

      // Selection Management
      setSelectedBacklogItem: (id) => set({ selectedBacklogItem: id }),

      // Legacy Compare List
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

      // Utilities
      getAvailableBacklogItems: () => {
        const state = get();
        return state.backlogGroups.flatMap(group => 
          group.items.filter(item => !item.matched)
        );
      },

      getSessionProgress: (listId) => {
        const state = get();
        const targetSession = listId ? state.listSessions[listId] : null;
        const gridItems = targetSession ? targetSession.gridItems : [];
        
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

      // Integration hooks
      updateSessionGridItems: (gridItems) => {
        const state = get();
        if (!state.activeSessionId) return;
        
        const currentSession = state.listSessions[state.activeSessionId];
        if (!currentSession) return;

        const updatedSession = {
          ...currentSession,
          gridItems
        };
        
        set((state) => ({
          listSessions: {
            ...state.listSessions,
            [state.activeSessionId!]: updatedSession
          }
        }));
      },

      getActiveSession: () => {
        const state = get();
        if (!state.activeSessionId) return null;
        return state.listSessions[state.activeSessionId] || null;
      },

      // Reset and Sync
      resetStore: () => set({
        listSessions: {},
        activeSessionId: null,
        backlogGroups: [],
        selectedBacklogItem: null,
        compareList: []
      }),

      syncWithBackend: async (listId) => {
        console.log(`Syncing session ${listId} with backend...`);
        
        try {
          const state = get();
          
          if (!state.listSessions[listId]) {
            get().createSession(listId, 50);
          }
          
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
      name: 'session-store',
      partialize: (state) => ({
        listSessions: state.listSessions,
        activeSessionId: state.activeSessionId
      })
    }
  )
);

// Selector hooks
export const useBacklogGroups = () => useSessionStore((state) => state.backlogGroups);
export const useActiveSession = () => useSessionStore((state) => ({
  activeSessionId: state.activeSessionId,
  hasSession: !!state.activeSessionId
}));
export const useSessionSelection = () => useSessionStore((state) => ({
  selectedBacklogItem: state.selectedBacklogItem
}));
export const useCompareList = () => useSessionStore((state) => state.compareList);
export const useSessionProgress = () => useSessionStore((state) => state.getSessionProgress());
export const useSessionMetadata = () => useSessionStore((state) => state.getSessionMetadata());