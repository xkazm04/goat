import { StateCreator } from 'zustand';
import { SessionStoreState } from './types';
import { SessionManager } from './session-manager';
import { backlogGroupConverter } from './converters';
import { BacklogGroup, BacklogItem } from '@/app/types/backlog-groups';
import { BacklogItemType } from '@/app/types/match';

export const createSessionActions: StateCreator<
  SessionStoreState,
  [],
  [],
  Pick<SessionStoreState, 
    'createSession' | 'switchToSession' | 'saveCurrentSession' | 
    'loadSession' | 'deleteSession' | 'syncWithList'
  >
> = (set, get) => ({
  createSession: (listId: string, size: number = 50) => {
    console.log(`Creating session for list ${listId} with size ${size}`);
    
    const session = SessionManager.createEmptySession(listId, size);
    
    set((state) => ({
      listSessions: {
        ...state.listSessions,
        [listId]: session
      },
      activeSessionId: listId,
      backlogGroups: [], // Start with empty groups, will be loaded via API
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
    
    if (!state.activeSessionId) {
      console.log('⚠️ No active session to save');
      return;
    }
    
    // Ensure backlogGroups is an array before processing
    if (!Array.isArray(state.backlogGroups)) {
      console.error('❌ Cannot save session: backlogGroups is not an array', typeof state.backlogGroups);
      return;
    }

    const currentSession = state.listSessions[state.activeSessionId];
    if (!currentSession) {
      console.warn('⚠️ No current session found to save');
      return;
    }

    const updatedSession = SessionManager.updateSession(currentSession, {
      // Convert BacklogGroup[] to BacklogGroupType[] for session storage
      backlogGroups: backlogGroupConverter.toStorageFormatArray(state.backlogGroups),
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
      // Convert stored BacklogGroupType[] back to BacklogGroup[]
      const convertedGroups = backlogGroupConverter.fromStorageFormatArray(session.backlogGroups || []);

      set({
        activeSessionId: listId,
        backlogGroups: convertedGroups,
        selectedBacklogItem: session.selectedBacklogItem,
        compareList: session.compareList || []
      });
      
      console.log(`✅ SessionStore: Loaded session ${listId} with ${convertedGroups.length} groups`);
    } else {
      // Initialize new session with empty groups
      set({
        activeSessionId: listId,
        backlogGroups: [], // Always start with empty array
        selectedBacklogItem: null,
        compareList: []
      });
      
      console.log(`🆕 SessionStore: Initialized new session ${listId}`);
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
      // Don't set default groups here anymore, let BacklogGroups component handle it via API
      console.log(`Session ${listId} ready, groups will be loaded via API`);
    }
  },
});