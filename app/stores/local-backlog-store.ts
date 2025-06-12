import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BacklogGroup, BacklogItem } from '@/app/types/backlog-groups';
import { LocalDataManager, LocalSessionData, LocalGroupState } from '@/app/lib/local-data/local-data-manager';
import { itemGroupsApi } from '@/app/lib/api/item-groups';

interface LocalBacklogStoreState {
  // Current session data
  currentListId: string | null;
  sessionData: LocalSessionData | null;
  
  // UI state
  loadingGroups: Set<string>;
  syncInProgress: boolean;
  lastError: string | null;

  // Actions - Session Management
  initializeSession: (listId: string, apiGroups?: any[]) => Promise<void>;
  switchSession: (listId: string) => Promise<void>;
  clearSession: () => void;

  // Actions - Group Management
  loadGroupItems: (groupId: string) => Promise<void>;
  toggleGroupExpansion: (groupId: string) => void;
  refreshGroupFromApi: (groupId: string) => Promise<void>;

  // Actions - Item Management
  removeItemLocally: (groupId: string, itemId: string) => void;
  addItemLocally: (groupId: string, item: BacklogItem) => void;
  restoreRemovedItem: (groupId: string, itemId: string) => void;

  // Actions - Sync
  syncWithApi: (force?: boolean) => Promise<void>;
  
  // Getters
  getGroups: () => BacklogGroup[];
  getGroup: (groupId: string) => LocalGroupState | undefined;
  getAvailableItems: (groupId: string) => BacklogItem[];
  getRemovedItemsCount: (groupId: string) => number;
  isGroupLoading: (groupId: string) => boolean;
}

export const useLocalBacklogStore = create<LocalBacklogStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentListId: null,
      sessionData: null,
      loadingGroups: new Set(),
      syncInProgress: false,
      lastError: null,

      // Initialize session for a list
      initializeSession: async (listId: string, apiGroups?: any[]) => {
        try {
          console.log(`🚀 Initializing local session for list ${listId}`);
          
          // Load existing or create new session data
          let sessionData = LocalDataManager.getSessionData(listId);
          
          // Initialize from API groups if provided
          if (apiGroups && apiGroups.length > 0) {
            sessionData = LocalDataManager.initializeFromApi(sessionData, apiGroups);
          }

          set({ 
            currentListId: listId, 
            sessionData,
            lastError: null
          });

          console.log(`✅ Session initialized with ${sessionData.groups.size} groups`);
          
        } catch (error) {
          console.error('Failed to initialize session:', error);
          set({ lastError: `Failed to initialize: ${error}` });
        }
      },

      // Switch to different list session
      switchSession: async (listId: string) => {
        const { currentListId, sessionData } = get();
        
        if (currentListId === listId) {
          console.log(`Already in session for ${listId}`);
          return;
        }

        // Save current session
        if (currentListId && sessionData) {
          LocalDataManager.saveSessionData(sessionData);
        }

        // Load new session
        await get().initializeSession(listId);
      },

      // Clear current session
      clearSession: () => {
        const { currentListId, sessionData } = get();
        
        if (currentListId && sessionData) {
          LocalDataManager.saveSessionData(sessionData);
        }

        set({
          currentListId: null,
          sessionData: null,
          loadingGroups: new Set(),
          syncInProgress: false,
          lastError: null
        });
      },

      // Load items for a specific group
      loadGroupItems: async (groupId: string) => {
        const { sessionData } = get();
        if (!sessionData) return;

        const group = sessionData.groups.get(groupId);
        if (!group) {
          console.warn(`Group ${groupId} not found`);
          return;
        }

        if (group.isLoaded) {
          console.log(`Group ${group.name} already loaded`);
          return;
        }

        // Add to loading state
        set(state => ({
          loadingGroups: new Set([...state.loadingGroups, groupId])
        }));

        try {
          console.log(`📥 Loading items for group ${group.name}...`);
          
          // Fetch from API
          const groupWithItems = await itemGroupsApi.getGroup(groupId, true);
          
          // Update local session
          const updatedSessionData = await LocalDataManager.loadGroupItems(
            sessionData,
            groupId,
            groupWithItems.items
          );

          set({ sessionData: updatedSessionData });
          
        } catch (error) {
          console.error(`Failed to load items for group ${groupId}:`, error);
          set({ lastError: `Failed to load group: ${error}` });
        } finally {
          // Remove from loading state
          set(state => {
            const newLoadingGroups = new Set(state.loadingGroups);
            newLoadingGroups.delete(groupId);
            return { loadingGroups: newLoadingGroups };
          });
        }
      },

      // Toggle group expansion
      toggleGroupExpansion: (groupId: string) => {
        const { sessionData } = get();
        if (!sessionData) return;

        const updatedSessionData = LocalDataManager.toggleGroupExpansion(sessionData, groupId);
        set({ sessionData: updatedSessionData });
      },

      // Remove item locally
      removeItemLocally: (groupId: string, itemId: string) => {
        const { sessionData } = get();
        if (!sessionData) return;

        const updatedSessionData = LocalDataManager.removeItemLocally(sessionData, groupId, itemId);
        set({ sessionData: updatedSessionData });
      },

      // Add item locally
      addItemLocally: (groupId: string, item: BacklogItem) => {
        const { sessionData } = get();
        if (!sessionData) return;

        const updatedSessionData = LocalDataManager.addItemLocally(sessionData, groupId, item);
        set({ sessionData: updatedSessionData });
      },

      // Restore previously removed item
      restoreRemovedItem: (groupId: string, itemId: string) => {
        const { sessionData } = get();
        if (!sessionData) return;

        const group = sessionData.groups.get(groupId);
        if (!group || !group.removedItemIds.has(itemId)) return;

        // Create a dummy item to restore (would normally fetch from API)
        const restoredItem: BacklogItem = {
          id: itemId,
          name: `Restored Item ${itemId}`,
          title: `Restored Item ${itemId}`,
          description: 'This item was restored from removed items',
          category: group.category,
          subcategory: group.subcategory,
          created_at: new Date().toISOString(),
          tags: []
        };

        const updatedSessionData = LocalDataManager.addItemLocally(sessionData, groupId, restoredItem);
        set({ sessionData: updatedSessionData });
      },

      // Refresh group from API
      refreshGroupFromApi: async (groupId: string) => {
        const { sessionData } = get();
        if (!sessionData) return;

        const group = sessionData.groups.get(groupId);
        if (!group) return;

        try {
          console.log(`🔄 Refreshing group ${group.name} from API...`);
          
          const groupWithItems = await itemGroupsApi.getGroup(groupId, true);
          
          const updatedSessionData = await LocalDataManager.loadGroupItems(
            sessionData,
            groupId,
            groupWithItems.items
          );

          set({ sessionData: updatedSessionData });
          
        } catch (error) {
          console.error(`Failed to refresh group ${groupId}:`, error);
          set({ lastError: `Failed to refresh: ${error}` });
        }
      },

      // Sync with API
      syncWithApi: async (force = false) => {
        const { sessionData, syncInProgress } = get();
        
        if (!sessionData || (syncInProgress && !force)) return;

        if (!force && !LocalDataManager.needsSync(sessionData)) {
          console.log('⏭️ Sync not needed yet');
          return;
        }

        set({ syncInProgress: true });

        try {
          console.log('🔄 Syncing with API...');
          
          // This would typically fetch latest groups and check for new items
          // For now, just update the sync timestamp
          const updatedSessionData = {
            ...sessionData,
            lastFullSync: new Date().toISOString()
          };

          LocalDataManager.saveSessionData(updatedSessionData);
          set({ sessionData: updatedSessionData });
          
          console.log('✅ Sync completed');
          
        } catch (error) {
          console.error('Sync failed:', error);
          set({ lastError: `Sync failed: ${error}` });
        } finally {
          set({ syncInProgress: false });
        }
      },

      // Getters
      getGroups: () => {
        const { sessionData } = get();
        if (!sessionData) return [];

        return Array.from(sessionData.groups.values()).map(group => ({
          id: group.id,
          name: group.name,
          description: group.description,
          category: group.category,
          subcategory: group.subcategory,
          image_url: group.image_url,
          item_count: LocalDataManager.getAvailableItems(group).length,
          items: LocalDataManager.getAvailableItems(group),
          created_at: group.created_at,
          updated_at: group.updated_at
        }));
      },

      getGroup: (groupId: string) => {
        const { sessionData } = get();
        return sessionData?.groups.get(groupId);
      },

      getAvailableItems: (groupId: string) => {
        const { sessionData } = get();
        if (!sessionData) return [];

        const group = sessionData.groups.get(groupId);
        return group ? LocalDataManager.getAvailableItems(group) : [];
      },

      getRemovedItemsCount: (groupId: string) => {
        const { sessionData } = get();
        if (!sessionData) return 0;

        const group = sessionData.groups.get(groupId);
        return group ? group.removedItemIds.size : 0;
      },

      isGroupLoading: (groupId: string) => {
        const { loadingGroups } = get();
        return loadingGroups.has(groupId);
      }
    }),
    {
      name: 'local-backlog-store',
      partialize: (state) => ({
        currentListId: state.currentListId
        // sessionData is handled by LocalDataManager in localStorage
      })
    }
  )
);

// Selector hooks
export const useCurrentSession = () => useLocalBacklogStore((state) => ({
  listId: state.currentListId,
  sessionData: state.sessionData,
  isLoading: state.loadingGroups.size > 0,
  syncInProgress: state.syncInProgress,
  lastError: state.lastError
}));

export const useLocalGroups = () => useLocalBacklogStore((state) => state.getGroups());

export const useLocalGroup = (groupId: string) => useLocalBacklogStore((state) => ({
  group: state.getGroup(groupId),
  availableItems: state.getAvailableItems(groupId),
  removedCount: state.getRemovedItemsCount(groupId),
  isLoading: state.isGroupLoading(groupId)
}));