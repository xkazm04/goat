import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SessionStoreState } from './types';
import { createSessionActions } from './actions';
import { createBacklogActions } from './backlog-actions';
import { createUtilityActions } from './utils';

export const useSessionStore = create<SessionStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      listSessions: {},
      activeSessionId: null,
      backlogGroups: [], // Always initialize as array
      selectedBacklogItem: null,
      compareList: [],

      // Merge all action creators
      ...createSessionActions(set, get),
      ...createBacklogActions(set, get),
      ...createUtilityActions(set, get),
    }),
    {
      name: 'session-store',
      partialize: (state) => ({
        listSessions: state.listSessions,
        activeSessionId: state.activeSessionId,
        // Don't persist backlogGroups directly, they're stored in listSessions
      })
    }
  )
);

// Enhanced Selector hooks
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

// New selectors for group management
export const useGroupItems = (groupId: string) => useSessionStore((state) => state.getGroupItems(groupId));
export const useAvailableBacklogItems = () => useSessionStore((state) => state.getAvailableBacklogItems());

// Export types for use in other files
export * from './types';
export { SessionManager } from './session-manager';
export { backlogGroupConverter } from './converters';