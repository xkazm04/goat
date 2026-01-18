import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GridItemType, BacklogItemType } from '@/types/match';
import { ListSession, SessionProgress } from './item-store/types';
import { SessionManager } from './item-store/session-manager';
import { BacklogGroup, BacklogItem } from '@/types/backlog-groups';
import {
  NormalizedBacklogData,
  normalizeBacklogGroups,
  denormalizeToBacklogGroup,
  denormalizeToBacklogGroupType,
  migrateFromLegacyFormat,
  isNormalizedData,
  createEmptyNormalizedData,
  NormalizedOps
} from './item-store/normalized-session';
import { saveSessionToOffline, getOfflineSession } from '@/lib/offline';
import { sessionLogger } from '@/lib/logger';

interface SessionStoreState {
  // Multi-list sessions
  listSessions: Record<string, ListSession>;
  activeSessionId: string | null;

  // Normalized backlog data for efficient storage/retrieval
  normalizedData: NormalizedBacklogData;

  // Current session state - computed lazily from normalizedData
  backlogGroups: BacklogGroup[]; // Computed getter, derived from normalizedData
  selectedBacklogItem: string | null;

  // Actions - Session Management
  createSession: (listId: string, size: number) => void;
  switchToSession: (listId: string) => void;
  saveCurrentSession: () => void;
  loadSession: (listId: string) => void;
  deleteSession: (listId: string) => void;
  syncWithList: (listId: string, category?: string) => void;
  
  // Actions - Enhanced Backlog Management
  setBacklogGroups: (groups: BacklogGroup[]) => void;
  toggleBacklogGroup: (groupId: string) => void;
  addItemToGroup: (groupId: string, item: BacklogItem) => void;
  removeItemFromGroup: (groupId: string, itemId: string) => void;
  updateGroupItems: (groupId: string, items: BacklogItem[]) => void; // NEW
  getGroupItems: (groupId: string) => BacklogItem[];
  
  // NEW: Local search and filtering functions
  searchGroups: (searchTerm: string) => BacklogGroup[];
  getGroupsByCategory: (category: string, subcategory?: string) => BacklogGroup[];
  
  // Actions - Selection
  setSelectedBacklogItem: (id: string | null) => void;

  // Utilities
  getAvailableBacklogItems: () => BacklogItem[];
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

// Cache for denormalized backlog groups to avoid repeated transformations
let denormalizedCache: { data: NormalizedBacklogData | null; result: BacklogGroup[] } = {
  data: null,
  result: []
};

function getCachedBacklogGroups(normalizedData: NormalizedBacklogData): BacklogGroup[] {
  // Only recompute if normalized data has changed (reference check)
  if (denormalizedCache.data !== normalizedData) {
    denormalizedCache.data = normalizedData;
    denormalizedCache.result = denormalizeToBacklogGroup(normalizedData);
  }
  return denormalizedCache.result;
}

// PERFORMANCE OPTIMIZATION: Debounced auto-save to coalesce multiple rapid operations
// into a single save, reducing localStorage thrashing and UI lag during bulk operations
const DEBOUNCE_DELAY_MS = 300;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSaveSession(getSaveFunction: () => void) {
  // Clear any pending save
  if (saveTimeout !== null) {
    clearTimeout(saveTimeout);
  }
  // Schedule new save with trailing delay
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    getSaveFunction();
  }, DEBOUNCE_DELAY_MS);
}

export const useSessionStore = create<SessionStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      listSessions: {},
      activeSessionId: null,
      normalizedData: createEmptyNormalizedData(),
      // backlogGroups is derived from normalizedData via cached getter
      get backlogGroups(): BacklogGroup[] {
        return getCachedBacklogGroups(get().normalizedData);
      },
      selectedBacklogItem: null,

      // Session Management
      createSession: (listId: string, size: number = 150) => {
        sessionLogger.debug(`Creating session for list ${listId} with size ${size}`);

        const session = SessionManager.createEmptySession(listId, size);

        set((state) => ({
          listSessions: {
            ...state.listSessions,
            [listId]: session
          },
          activeSessionId: listId,
          normalizedData: createEmptyNormalizedData(),
          selectedBacklogItem: null
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

        // PERFORMANCE OPTIMIZATION: Use normalized data directly instead of
        // expensive O(n*m) deep mapping transformation
        // The denormalization to BacklogGroupType[] is done lazily only when needed
        const backlogGroupsForStorage = denormalizeToBacklogGroupType(state.normalizedData);

        const updatedSession = SessionManager.updateSessionTimestamp({
          ...currentSession,
          backlogGroups: backlogGroupsForStorage,
          selectedBacklogItem: state.selectedBacklogItem,
          compareList: [], // Legacy field - kept empty for session compatibility
        });

        set((state) => ({
          listSessions: {
            ...state.listSessions,
            [state.activeSessionId!]: updatedSession
          }
        }));

        // OFFLINE SYNC: Also save to IndexedDB for offline persistence
        // This is debounced internally by saveSessionToOffline
        saveSessionToOffline(updatedSession);
      },

      loadSession: async (listId: string) => {
        const state = get();
        let session = state.listSessions[listId];

        // OFFLINE SYNC: Try to load from IndexedDB and merge if needed
        try {
          const offlineSession = await getOfflineSession(listId);

          if (offlineSession) {
            if (!session) {
              // No local session, use offline version
              sessionLogger.debug(`Loading session ${listId} from offline storage`);
              session = offlineSession;
            } else {
              // Both exist - compare timestamps and use the more recent one
              const localTime = new Date(session.updatedAt).getTime();
              const offlineTime = new Date(offlineSession.updatedAt).getTime();

              if (offlineTime > localTime) {
                sessionLogger.debug(`Using newer offline session for ${listId}`);
                session = offlineSession;
              }
            }
          }
        } catch (error) {
          sessionLogger.warn('Failed to load offline session:', error);
        }

        if (session && SessionManager.validateSession(session)) {
          // PERFORMANCE OPTIMIZATION: Migrate legacy format to normalized format
          // This conversion happens once on load, then normalized data is used for all operations
          const normalizedData = migrateFromLegacyFormat(session.backlogGroups || []);

          set({
            activeSessionId: listId,
            normalizedData,
            selectedBacklogItem: session.selectedBacklogItem,
            listSessions: {
              ...state.listSessions,
              [listId]: session
            }
          });
        } else {
          sessionLogger.warn(`Session for list ${listId} not found, creating new session`);
          get().createSession(listId, 150);
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
          sessionLogger.debug(`Session ${listId} ready, groups will be loaded via API`);
        }
      },

      // Enhanced Backlog Management
      setBacklogGroups: (groups: BacklogGroup[]) => {
        // PERFORMANCE OPTIMIZATION: Normalize on input, store in normalized format
        const normalizedData = normalizeBacklogGroups(groups);
        set({ normalizedData });
        // Debounced auto-save to coalesce rapid operations
        debouncedSaveSession(() => get().saveCurrentSession());
      },

      toggleBacklogGroup: (groupId: string) => {
        set((state) => {
          const group = state.normalizedData.groupsById[groupId];
          if (!group) return state;

          return {
            normalizedData: {
              ...state.normalizedData,
              groupsById: {
                ...state.normalizedData.groupsById,
                [groupId]: {
                  ...group,
                  isOpen: !group.isOpen
                }
              }
            }
          };
        });

        debouncedSaveSession(() => get().saveCurrentSession());
      },

      addItemToGroup: (groupId: string, item: BacklogItem) => {
        set((state) => {
          // PERFORMANCE OPTIMIZATION: O(1) item addition
          const updatedData = NormalizedOps.addItem(state.normalizedData, groupId, item);
          return { normalizedData: updatedData };
        });

        debouncedSaveSession(() => get().saveCurrentSession());
      },

      removeItemFromGroup: (groupId: string, itemId: string) => {
        set((state) => {
          sessionLogger.debug(`Removing item ${itemId} from group ${groupId}`);

          // Check if item exists
          const item = state.normalizedData.itemsById[itemId];
          if (!item) {
            sessionLogger.warn(`Item ${itemId} not found`);
            return state;
          }

          const group = state.normalizedData.groupsById[groupId];
          if (!group) {
            sessionLogger.warn(`Group ${groupId} not found`);
            return state;
          }

          // PERFORMANCE OPTIMIZATION: O(n) where n is items in group, not total items
          const updatedData = NormalizedOps.removeItem(state.normalizedData, groupId, itemId);

          // Clear selection if removed item was selected
          const updatedSelectedBacklogItem = state.selectedBacklogItem === itemId ? null : state.selectedBacklogItem;

          sessionLogger.debug(`Item ${itemId} removed successfully`);

          return {
            normalizedData: updatedData,
            selectedBacklogItem: updatedSelectedBacklogItem
          };
        });

        debouncedSaveSession(() => get().saveCurrentSession());
      },

      // NEW: Update items for a specific group
      updateGroupItems: (groupId: string, items: BacklogItem[]) => {
        set((state) => {
          sessionLogger.debug(`Updating ${items.length} items for group ${groupId}`);

          // PERFORMANCE OPTIMIZATION: Efficient bulk update
          const updatedData = NormalizedOps.updateGroupItems(state.normalizedData, groupId, items);

          return { normalizedData: updatedData };
        });

        debouncedSaveSession(() => get().saveCurrentSession());
      },

      getGroupItems: (groupId: string): BacklogItem[] => {
        const state = get();
        // PERFORMANCE OPTIMIZATION: Direct lookup from normalized data
        return NormalizedOps.getGroupItems(state.normalizedData, groupId);
      },

      // NEW: Local search function
      searchGroups: (searchTerm: string): BacklogGroup[] => {
        const state = get();
        // PERFORMANCE OPTIMIZATION: Search on normalized data
        return NormalizedOps.searchGroups(state.normalizedData, searchTerm);
      },

      // NEW: Local category filtering function
      getGroupsByCategory: (category: string, subcategory?: string): BacklogGroup[] => {
        const state = get();
        // PERFORMANCE OPTIMIZATION: Filter on normalized data
        return NormalizedOps.getGroupsByCategory(state.normalizedData, category, subcategory);
      },

      // Selection Management
      setSelectedBacklogItem: (id) => set({ selectedBacklogItem: id }),

      // Utilities
      getAvailableBacklogItems: (): BacklogItem[] => {
        const state = get();
        // PERFORMANCE OPTIMIZATION: Get all items directly from normalized data
        return NormalizedOps.getAllItems(state.normalizedData);
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
          gridItems,
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          listSessions: {
            ...state.listSessions,
            [state.activeSessionId!]: updatedSession
          }
        }));

        // OFFLINE SYNC: Save grid changes to IndexedDB
        saveSessionToOffline(updatedSession);
      },

      getActiveSession: () => {
        const state = get();
        if (!state.activeSessionId) return null;
        return state.listSessions[state.activeSessionId] || null;
      },

      // Reset and Sync
      resetStore: () => {
        // Clear the cache when resetting
        denormalizedCache = { data: null, result: [] };
        set({
          listSessions: {},
          activeSessionId: null,
          normalizedData: createEmptyNormalizedData(),
          selectedBacklogItem: null
        });
      },

      syncWithBackend: async (listId) => {
        sessionLogger.debug(`Syncing session ${listId} with backend...`);
        
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
          sessionLogger.error('Failed to sync with backend:', error);
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

// Enhanced Selector hooks with new types
// Note: backlogGroups is a computed getter, so we use the cached version
export const useBacklogGroups = () => useSessionStore((state) => getCachedBacklogGroups(state.normalizedData));
export const useActiveSession = () => useSessionStore((state) => ({
  activeSessionId: state.activeSessionId,
  hasSession: !!state.activeSessionId
}));
export const useSessionSelection = () => useSessionStore((state) => ({
  selectedBacklogItem: state.selectedBacklogItem
}));
export const useSessionProgress = () => useSessionStore((state) => state.getSessionProgress());
export const useSessionMetadata = () => useSessionStore((state) => state.getSessionMetadata());

// New selectors for group management
export const useGroupItems = (groupId: string) => useSessionStore((state) => state.getGroupItems(groupId));
export const useAvailableBacklogItems = () => useSessionStore((state) => state.getAvailableBacklogItems());