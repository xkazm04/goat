import { enableMapSet } from 'immer';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Enable Immer support for Map and Set mutations (required for loadingGroupIds, _itemIndex, etc.)
enableMapSet();
import { backlogLogger } from '@/lib/logger';
import { createSafeStorage } from '@/lib/storage/create-safe-storage';
import { createIndexedDBStorage } from '@/lib/storage/indexed-db-storage';

import { createDataActions, countLoadedGroups } from './actions-data';
import { createItemActions } from './actions-items';
import { createOfflineActions } from './actions-offline';
import { createUtilActions } from './actions-utils';
import { rebuildItemIndex } from './item-index';
import { BacklogState, SerializedBacklogCache } from './types';
import { arrayToSet, setToArray } from '../../lib/set-utils';

// Helper to check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Configure storage with a safe wrapper - only in browser
const safeStorage = isBrowser
  ? createSafeStorage(() => createIndexedDBStorage('backlog-store'))
  : { 
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {}
    };

// Memoization state for partialize – avoids re-sorting & re-serializing
// the cache on every Zustand persist cycle when nothing changed.
let _prevPartializeInputs: {
  cache: BacklogState['cache'];
  selectedGroupId: string | null;
  selectedItemId: string | null;
  pendingChanges: BacklogState['pendingChanges'];
  syncDiagnostics: BacklogState['syncDiagnostics'];
  lastSyncTimestamp: number;
  isOfflineMode: boolean;
  groups: BacklogState['groups'];
} | null = null;
let _prevPartializeResult: Record<string, unknown> | null = null;

// Create store with safeguards for SSR
export const useBacklogStore = create<BacklogState>()(
  persist(
    immer((set, get) => {
      // Cast set to work with immer middleware properly
      const immerSet = set as any;

      return {
        // Initial state
        groups: [],
        _itemIndex: new Map(),
        _loadedGroupsCount: 0,
        selectedGroupId: null,
        selectedItemId: null,
        activeItemId: null,
        searchTerm: '',
        isLoading: false,
        loadingGroupIds: new Set<string>(),
        error: null,
        _loadingGeneration: 0,
        isOfflineMode: false,
        pendingChanges: [],
        syncDiagnostics: {
          totalQueued: 0,
          failedChanges: [],
          lastSuccessfulSync: 0,
          isSyncing: false,
          dataLossRisk: 'none' as const,
        },
        cache: {},
        lastSyncTimestamp: 0,

        loadingProgress: {
          totalGroups: 0,
          loadedGroups: 0,
          isLoading: false,
          percentage: 0
        },

        loadingErrors: [],

        enrichmentSources: {
          active: false,
          sources: [],
        },

        // Import actions
        ...createDataActions(immerSet, get),
        ...createItemActions(immerSet, get),
        ...createOfflineActions(immerSet, get),
        ...createUtilActions(immerSet, get),
      };
    }),
    {
      name: 'backlog-store',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => {
        // Skip serialization in SSR
        if (!isBrowser) return {};

        // Fast path: if all persisted fields are referentially identical
        // to the previous call, return the cached result (O(1)).
        if (
          _prevPartializeInputs &&
          _prevPartializeResult &&
          _prevPartializeInputs.cache === state.cache &&
          _prevPartializeInputs.selectedGroupId === state.selectedGroupId &&
          _prevPartializeInputs.selectedItemId === state.selectedItemId &&
          _prevPartializeInputs.pendingChanges === state.pendingChanges &&
          _prevPartializeInputs.syncDiagnostics === state.syncDiagnostics &&
          _prevPartializeInputs.lastSyncTimestamp === state.lastSyncTimestamp &&
          _prevPartializeInputs.isOfflineMode === state.isOfflineMode &&
          _prevPartializeInputs.groups === state.groups
        ) {
          return _prevPartializeResult;
        }

        // Create a serialization-friendly version of the state
        const serializedCache: SerializedBacklogCache = {};

        // Only persist the 10 most recently used cache entries to prevent IndexedDB bloat
        const MAX_PERSISTED_CATEGORIES = 10;
        const cacheKeys = Object.keys(state.cache)
          .filter(key => state.cache[key])
          .sort((a, b) => (state.cache[b]?.lastUpdated || 0) - (state.cache[a]?.lastUpdated || 0))
          .slice(0, MAX_PERSISTED_CATEGORIES);

        // Convert each cache entry
        cacheKeys.forEach(key => {
          const cacheEntry = state.cache[key];
          if (cacheEntry) {
            serializedCache[key] = {
              groups: cacheEntry.groups || [],
              loadedAt: cacheEntry.loadedAt || Date.now(),
              loadedGroupIds: setToArray(cacheEntry.loadedGroupIds || new Set()),
              lastUpdated: cacheEntry.lastUpdated || Date.now()
            };
          }
        });

        // Log cache size for debugging (DEV only — avoids JSON.stringify in production)
        if (process.env.NODE_ENV !== 'production') {
          backlogLogger.debug(`Persisting cache: ${Object.keys(serializedCache).length} keys, ${JSON.stringify(serializedCache).length} bytes`);
        }

        const result = {
          selectedGroupId: state.selectedGroupId,
          selectedItemId: state.selectedItemId,
          cache: serializedCache,
          pendingChanges: state.pendingChanges,
          syncDiagnostics: state.syncDiagnostics,
          lastSyncTimestamp: state.lastSyncTimestamp,
          isOfflineMode: state.isOfflineMode,
          // Also persist groups to have immediate data on load
          groups: state.groups
        };

        // Cache inputs and result for next call
        _prevPartializeInputs = {
          cache: state.cache,
          selectedGroupId: state.selectedGroupId,
          selectedItemId: state.selectedItemId,
          pendingChanges: state.pendingChanges,
          syncDiagnostics: state.syncDiagnostics,
          lastSyncTimestamp: state.lastSyncTimestamp,
          isOfflineMode: state.isOfflineMode,
          groups: state.groups,
        };
        _prevPartializeResult = result;

        return result;
      },
      // Only enable persistence on the client side
      skipHydration: !isBrowser,
      
      // Handle rehydration
      onRehydrateStorage: () => (state) => {
        if (!state || !isBrowser) return;
        
        backlogLogger.debug('BacklogStore rehydrated successfully');
        
        // Convert serialized data back to proper structure with Sets
        if (state.cache) {
          const properCache = { ...state.cache };
          
          Object.keys(properCache).forEach(key => {
            const entry = properCache[key];
            if (entry) {
              // Make sure we have all properties with defaults if missing
              const loadedIds = entry.loadedGroupIds;
              // Handle both array (from storage) and Set (already hydrated)
              const loadedGroupIds = Array.isArray(loadedIds)
                ? arrayToSet(loadedIds)
                : (loadedIds instanceof Set ? loadedIds : new Set<string>());

              properCache[key] = {
                groups: entry.groups || [],
                loadedAt: entry.loadedAt || Date.now(),
                loadedGroupIds,
                lastUpdated: entry.lastUpdated || Date.now()
              };
            }
          });
          
          // Update the state with proper Sets
          state.cache = properCache;
          state.loadingGroupIds = new Set<string>();
          
          backlogLogger.debug(`Rehydrated cache has ${Object.keys(properCache).length} categories`);
        }
        
        // Check if we have cached groups
        if (state.groups && state.groups.length > 0) {
          backlogLogger.debug(`Rehydrated with ${state.groups.length} groups from persistence`);
          // Rebuild runtime item index and loaded-groups counter from persisted groups
          state._itemIndex = rebuildItemIndex(state.groups);
          state._loadedGroupsCount = countLoadedGroups(state.groups);
        }
      }
    }
  )
);

// Expose debug helpers to window for troubleshooting (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as any).__backlogStore = {
    getState: () => useBacklogStore.getState(),
    clearCache: () => useBacklogStore.getState().clearCache(),
    clearIndexedDB: async () => {
      try {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name?.includes('backlog')) {
            indexedDB.deleteDatabase(db.name);
            backlogLogger.debug(`Deleted IndexedDB: ${db.name}`);
          }
        }
        backlogLogger.info('IndexedDB cleared. Please refresh the page.');
      } catch (e) {
        backlogLogger.error('Failed to clear IndexedDB:', e);
      }
    }
  };
  backlogLogger.debug('Backlog debug helpers available: window.__backlogStore');
}