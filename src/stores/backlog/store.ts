import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { createIndexedDBStorage } from '@/lib/storage/indexed-db-storage';
import { createSafeStorage } from '@/lib/storage/create-safe-storage';
import { BacklogState, SerializedBacklogCache } from './types';
import { createDataActions } from './actions-data';
import { createItemActions } from './actions-items';
import { createOfflineActions } from './actions-offline';
import { createUtilActions } from './actions-utils';
import { arrayToSet, setToArray } from '../../lib/set-utils';
import { backlogLogger } from '@/lib/logger';

// Enable MapSet support for Immer
enableMapSet();

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

// Create store with safeguards for SSR
export const useBacklogStore = create<BacklogState>()(
  persist(
    immer((set, get) => {
      // Cast set to work with immer middleware properly
      const immerSet = set as any;

      return {
        // Initial state
        groups: [],
        selectedGroupId: null,
        selectedItemId: null,
        activeItemId: null,
        searchTerm: '',
        isLoading: false,
        loadingGroupIds: new Set<string>(),
        error: null,
        isOfflineMode: false,
        pendingChanges: [],
        cache: {},
        lastSyncTimestamp: 0,

        loadingProgress: {
          totalGroups: 0,
          loadedGroups: 0,
          isLoading: false,
          percentage: 0
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
        
        // Create a serialization-friendly version of the state
        const serializedCache: SerializedBacklogCache = {};
        
        // Convert each cache entry
        Object.keys(state.cache).forEach(key => {
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
        
        // Log cache size for debugging
        backlogLogger.debug(`Persisting cache: ${Object.keys(serializedCache).length} keys, ${JSON.stringify(serializedCache).length} bytes`);
        
        return {
          selectedGroupId: state.selectedGroupId,
          selectedItemId: state.selectedItemId,
          cache: serializedCache,
          pendingChanges: state.pendingChanges,
          lastSyncTimestamp: state.lastSyncTimestamp,
          isOfflineMode: state.isOfflineMode,
          // Also persist groups to have immediate data on load
          groups: state.groups
        };
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
        }
      }
    }
  )
);

// Expose debug helpers to window for troubleshooting
if (typeof window !== 'undefined') {
  (window as any).__backlogStore = {
    getState: () => useBacklogStore.getState(),
    clearCache: () => useBacklogStore.getState().clearCache(),
    forceRefresh: () => useBacklogStore.getState().forceRefreshAll(),
    debugImages: (limit?: number) => useBacklogStore.getState().debugImageUrls(limit),
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