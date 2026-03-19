import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GridItemType, BacklogItemType, BacklogGroupType } from '@/types/match';
import { ListSession, SessionProgress } from './item-store/types';
import {
  createEmptySession,
  updateSessionTimestamp,
  markSessionSynced,
  validateSession,
  calculateProgress,
  hasUnsavedChanges,
  getSessionMetadata,
} from './item-store/session-manager';
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
import { saveSessionToOffline, getOfflineSession } from '@/lib/offline/sessionStoreIntegration';
import { reconcileSessionSources } from '@/lib/storage/storage-registry';
import { useSelectionCursor } from './selection-cursor';
import { sessionLogger } from '@/lib/logger';
import { GRID_LIMITS } from '@/lib/grid/constants';
import { DEBOUNCE } from '@/lib/timing';

interface SessionStoreState {
  // Hydration readiness flag - true once persist middleware has rehydrated from storage
  _hydrated: boolean;

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

// Monotonic version counter for normalizedData changes.
// Bumped by bumpNormalizedVersion() every time normalizedData is actually mutated.
// The denormalization cache checks this counter instead of object identity,
// avoiding false cache misses from Zustand producing new references on every set().
let normalizedVersion = 0;

function bumpNormalizedVersion(): number {
  return ++normalizedVersion;
}

// Cache for denormalized backlog groups to avoid repeated transformations
let denormalizedCache: { version: number; result: BacklogGroup[] } = {
  version: -1,
  result: []
};

function getCachedBacklogGroups(normalizedData: NormalizedBacklogData): BacklogGroup[] {
  if (denormalizedCache.version !== normalizedVersion) {
    denormalizedCache.version = normalizedVersion;
    denormalizedCache.result = denormalizeToBacklogGroup(normalizedData);
  }
  return denormalizedCache.result;
}

// Cache for denormalized BacklogGroupType[] used in session persist.
// During drag sequences only grid positions change, not normalizedData,
// so we skip the O(n*m) denormalization when the version hasn't bumped.
let denormalizedTypeCache: { version: number; result: BacklogGroupType[] } = {
  version: -1,
  result: []
};

function getCachedBacklogGroupTypes(normalizedData: NormalizedBacklogData): BacklogGroupType[] {
  if (denormalizedTypeCache.version !== normalizedVersion) {
    denormalizedTypeCache.version = normalizedVersion;
    denormalizedTypeCache.result = denormalizeToBacklogGroupType(normalizedData);
  }
  return denormalizedTypeCache.result;
}

// PERFORMANCE OPTIMIZATION: Debounced auto-save to coalesce multiple rapid operations
// into a single save, reducing localStorage thrashing and UI lag during bulk operations
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingSaveFunction: (() => void) | null = null;

function debouncedSaveSession(getSaveFunction: () => void) {
  // Clear any pending save
  if (saveTimeout !== null) {
    clearTimeout(saveTimeout);
  }
  // Store the save function so it can be flushed on beforeunload
  pendingSaveFunction = getSaveFunction;
  // Schedule new save with trailing delay
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    pendingSaveFunction = null;
    getSaveFunction();
  }, DEBOUNCE.SESSION_SYNC);
}

/**
 * Flush any pending debounced session save immediately.
 * Called on beforeunload to prevent data loss when the user closes the tab
 * before the debounce timer fires.
 */
export function flushPendingSessionSave(): void {
  if (saveTimeout !== null) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  if (pendingSaveFunction) {
    const fn = pendingSaveFunction;
    pendingSaveFunction = null;
    fn();
  }
}

export const useSessionStore = create<SessionStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      _hydrated: false,
      listSessions: {},
      activeSessionId: null,
      normalizedData: createEmptyNormalizedData(),
      // backlogGroups is derived from normalizedData via cached getter
      get backlogGroups(): BacklogGroup[] {
        return getCachedBacklogGroups(get().normalizedData);
      },
      // Selection is now derived from the authoritative SelectionCursor store
      get selectedBacklogItem(): string | null {
        return useSelectionCursor.getState().itemId;
      },

      // Session Management
      createSession: (listId: string, size: number = 150) => {
        sessionLogger.debug(`Creating session for list ${listId} with size ${size}`);

        const session = createEmptySession(listId, size);

        useSelectionCursor.getState().clear();
        bumpNormalizedVersion();
        set((state) => ({
          listSessions: {
            ...state.listSessions,
            [listId]: session
          },
          activeSessionId: listId,
          normalizedData: createEmptyNormalizedData(),
        }));
      },

      switchToSession: (listId: string) => {
        const state = get();
        
        if (state.activeSessionId && state.activeSessionId !== listId) {
          // Flush any pending debounced save before switching, so ranking
          // changes are persisted under the old activeSessionId.
          flushPendingSessionSave();
          get().saveCurrentSession();
        }

        get().loadSession(listId);
      },

      saveCurrentSession: () => {
        const state = get();
        if (!state.activeSessionId) return;

        const currentSession = state.listSessions[state.activeSessionId];
        if (!currentSession) return;

        // PERFORMANCE OPTIMIZATION: Use cached denormalization — skips O(n*m)
        // work when normalizedData hasn't changed (e.g. during drag sequences
        // where only grid positions change)
        const backlogGroupsForStorage = getCachedBacklogGroupTypes(state.normalizedData);

        const updatedSession = updateSessionTimestamp({
          ...currentSession,
          backlogGroups: backlogGroupsForStorage,
          selectedBacklogItem: useSelectionCursor.getState().itemId,
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
        const zustandSession = state.listSessions[listId] ?? null;

        // Reconcile Zustand persist (localStorage) with offline-db (goat-offline-db).
        // See src/lib/storage/storage-registry.ts for the dual-write architecture.
        let session: ListSession | null = zustandSession;
        try {
          const offlineSession = await getOfflineSession(listId);
          session = reconcileSessionSources(zustandSession, offlineSession);

          if (session !== zustandSession && session !== null) {
            sessionLogger.debug(`Using newer offline session for ${listId}`);
          }
        } catch (error) {
          sessionLogger.warn('Failed to load offline session:', error);
        }

        if (session && validateSession(session)) {
          // PERFORMANCE OPTIMIZATION: Migrate legacy format to normalized format
          // This conversion happens once on load, then normalized data is used for all operations
          const normalizedData = migrateFromLegacyFormat(session.backlogGroups || []);

          // Restore selection cursor from the persisted session
          useSelectionCursor.getState().select(session.selectedBacklogItem, 'auto');
          bumpNormalizedVersion();
          set({
            activeSessionId: listId,
            normalizedData,
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
          get().createSession(listId, GRID_LIMITS.MAX_SIZE);
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
        bumpNormalizedVersion();
        set({ normalizedData });
        // Debounced auto-save to coalesce rapid operations
        debouncedSaveSession(() => get().saveCurrentSession());
      },

      toggleBacklogGroup: (groupId: string) => {
        bumpNormalizedVersion();
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
        bumpNormalizedVersion();
        set((state) => {
          // PERFORMANCE OPTIMIZATION: O(1) item addition
          const updatedData = NormalizedOps.addItem(state.normalizedData, groupId, item);
          return { normalizedData: updatedData };
        });

        debouncedSaveSession(() => get().saveCurrentSession());
      },

      removeItemFromGroup: (groupId: string, itemId: string) => {
        bumpNormalizedVersion();
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

          // Clear selection cursor if removed item was selected
          if (useSelectionCursor.getState().itemId === itemId) {
            useSelectionCursor.getState().clear();
          }

          sessionLogger.debug(`Item ${itemId} removed successfully`);

          return {
            normalizedData: updatedData,
          };
        });

        debouncedSaveSession(() => get().saveCurrentSession());
      },

      // NEW: Update items for a specific group
      updateGroupItems: (groupId: string, items: BacklogItem[]) => {
        bumpNormalizedVersion();
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

      // Selection Management — delegates to the authoritative SelectionCursor
      setSelectedBacklogItem: (id) => {
        useSelectionCursor.getState().select(id, 'auto');
      },

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
        
        return calculateProgress(gridItems);
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
        
        return hasUnsavedChanges(session);
      },

      getSessionMetadata: (listId) => {
        const state = get();
        const sessionId = listId || state.activeSessionId;
        if (!sessionId) return null;
        
        const session = state.listSessions[sessionId];
        if (!session) return null;
        
        return getSessionMetadata(session);
      },

      // Integration hooks
      updateSessionGridItems: (gridItems) => {
        let savedSession: ListSession | null = null;

        set((s) => {
          if (!s.activeSessionId) return s;

          const currentSession = s.listSessions[s.activeSessionId];
          if (!currentSession) return s;

          const updatedSession = {
            ...currentSession,
            gridItems,
            updatedAt: new Date().toISOString(),
          };

          savedSession = updatedSession;

          return {
            listSessions: {
              ...s.listSessions,
              [s.activeSessionId]: updatedSession
            }
          };
        });

        // OFFLINE SYNC: Save grid changes to IndexedDB
        if (savedSession) {
          saveSessionToOffline(savedSession);
        }
      },

      getActiveSession: () => {
        const state = get();
        if (!state.activeSessionId) return null;
        return state.listSessions[state.activeSessionId] || null;
      },

      // Reset and Sync
      resetStore: () => {
        // Clear the cache when resetting
        bumpNormalizedVersion();
        denormalizedCache = { version: -1, result: [] };
        denormalizedTypeCache = { version: -1, result: [] };
        useSelectionCursor.getState().clear();
        set({
          listSessions: {},
          activeSessionId: null,
          normalizedData: createEmptyNormalizedData(),
        });
      },

      syncWithBackend: async (listId) => {
        sessionLogger.debug(`Syncing session ${listId} with backend...`);
        
        try {
          const state = get();
          
          if (!state.listSessions[listId]) {
            get().createSession(listId, GRID_LIMITS.MAX_SIZE);
          }
          
          const session = state.listSessions[listId];
          if (session) {
            const syncedSession = markSessionSynced(session);
            
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
      partialize: (state) => {
        // Cap persisted sessions to the 20 most recent to prevent localStorage bloat
        const MAX_PERSISTED_SESSIONS = 20;
        const keys = Object.keys(state.listSessions);
        let sessions = state.listSessions;
        if (keys.length > MAX_PERSISTED_SESSIONS) {
          const sorted = keys
            .map(k => ({ key: k, mod: new Date(state.listSessions[k]?.updatedAt || 0).getTime() }))
            .sort((a, b) => b.mod - a.mod)
            .slice(0, MAX_PERSISTED_SESSIONS);
          sessions = {} as typeof state.listSessions;
          for (const { key } of sorted) {
            sessions[key] = state.listSessions[key];
          }
        }
        return {
          listSessions: sessions,
          activeSessionId: state.activeSessionId,
          // NOTE: _hydrated is intentionally excluded -- it must reset to false on page load
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hydrated = true;
          sessionLogger.debug('Session store rehydrated successfully');
        }
      }
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
export const useSessionSelection = () => useSelectionCursor((state) => ({
  selectedBacklogItem: state.itemId
}));
export const useSessionProgress = () => useSessionStore((state) => state.getSessionProgress());
export const useSessionMetadata = () => useSessionStore((state) => state.getSessionMetadata());

// Hydration readiness selector
export const useSessionHydrated = () => useSessionStore((state) => state._hydrated);

// New selectors for group management
export const useGroupItems = (groupId: string) => useSessionStore((state) => state.getGroupItems(groupId));
export const useAvailableBacklogItems = () => useSessionStore((state) => state.getAvailableBacklogItems());