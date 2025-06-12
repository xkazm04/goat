import { StateCreator } from 'zustand';
import { SessionStoreState } from './types';
import { SessionManager } from './session-manager';
import { BacklogItem } from '@/app/types/backlog-groups';
import { GridItemType } from '@/app/types/match';

export const createUtilityActions: StateCreator<
  SessionStoreState,
  [],
  [],
  Pick<SessionStoreState, 
    'getAvailableBacklogItems' | 'getSessionProgress' | 'getAllSessions' | 
    'hasUnsavedChanges' | 'getSessionMetadata' | 'updateSessionGridItems' |
    'getActiveSession' | 'resetStore' | 'syncWithBackend'
  >
> = (set, get) => ({
  getAvailableBacklogItems: (): BacklogItem[] => {
    const state = get();
    if (!Array.isArray(state.backlogGroups)) {
      return [];
    }
    return state.backlogGroups.flatMap(group => 
      group.items.filter(item => {
        // For BacklogItem, we don't have matched property, so return all items
        // You might want to check against gridItems to see what's already placed
        return true;
      })
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

  updateSessionGridItems: (gridItems: GridItemType[]) => {
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
  },
});