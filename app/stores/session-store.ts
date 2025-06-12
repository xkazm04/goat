import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BacklogGroup, BacklogItem } from '@/app/types/backlog-groups';
import { BacklogGroupType, BacklogItemType, GridItemType } from '@/app/types/match';
import { itemGroupsApi } from '@/app/lib/api/item-groups';

// Simple session manager for now
const SessionManager = {
  updateSession: (session: any, updates: any) => ({
    ...session,
    ...updates,
    updatedAt: new Date().toISOString()
  }),
  
  validateSession: (session: any) => {
    return !!(session && session.id && session.listId);
  }
};

interface SessionStoreState {
  // Multi-list sessions
  listSessions: Record<string, any>;
  activeSessionId: string | null;
  
  // Current session state - Enhanced to support new types
  backlogGroups: BacklogGroup[]; // Runtime format (from API)
  selectedBacklogItem: string | null;
  compareList: BacklogItemType[]; // Legacy support
  
  // Actions - Session Management
  createSession: (listId: string, size: number) => void;
  switchToSession: (listId: string) => void;
  saveCurrentSession: () => void;
  loadSession: (listId: string) => void;
  deleteSession: (listId: string) => void;
  syncWithList: (listId: string, category?: string) => void;
  
  // Actions - Enhanced Backlog Management
  setBacklogGroups: (groups: BacklogGroup[] | ((prev: BacklogGroup[]) => BacklogGroup[])) => void;
  addItemToGroup: (groupId: string, item: BacklogItem) => void;
  removeItemFromGroup: (groupId: string, itemId: string) => void;
  loadGroupItems: (groupId: string) => Promise<void>;
  getGroupItems: (groupId: string) => BacklogItem[];
  
  // Actions - Selection
  setSelectedBacklogItem: (id: string | null) => void;
  
  // Actions - Compare List (Legacy)
  toggleCompareItem: (item: BacklogItemType) => void;
  clearCompareList: () => void;
}

export const useSessionStore = create<SessionStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      listSessions: {},
      activeSessionId: null,
      backlogGroups: [], // Always initialize as array
      selectedBacklogItem: null,
      compareList: [],

      // Session Management
      createSession: (listId: string, size: number = 50) => {
        console.log(`Creating session for list ${listId} with size ${size}`);
        
        const session = {
          id: `session-${listId}`,
          listId,
          listSize: size,
          gridItems: Array.from({ length: size }, (_, index) => ({
            id: `grid-${index}`,
            title: '',
            tags: [],
            matched: false,
          })),
          backlogGroups: [],
          selectedBacklogItem: null,
          selectedGridItem: null,
          compareList: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          synced: false
        };
        
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
          backlogGroups: state.backlogGroups.map(group => ({
            id: group.id,
            name: group.name,
            title: group.name,
            items: (group.items || []).map(item => ({
              id: item.id,
              title: item.name || item.title || '',
              description: item.description || '',
              matched: false,
              tags: item.tags || []
            })),
            isOpen: true
          })),
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
          const convertedGroups: BacklogGroup[] = (session.backlogGroups || []).map((group: any) => ({
            id: group.id,
            name: group.title || group.name,
            description: undefined,
            category: 'sports', // Default, will be updated from API
            subcategory: undefined,
            image_url: undefined,
            item_count: (group.items || []).length,
            items: (group.items || []).map((item: any) => ({
              id: item.id,
              name: item.title,
              title: item.title,
              description: item.description,
              category: 'sports', // Default
              subcategory: undefined,
              item_year: undefined,
              item_year_to: undefined,
              image_url: undefined,
              created_at: new Date().toISOString(),
              tags: item.tags || []
            })),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

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
      },

      // Backlog Management
      setBacklogGroups: (groups) => {
        set((state) => {
          let newGroups: BacklogGroup[];
          
          if (typeof groups === 'function') {
            // If it's a function, call it with current state
            const currentGroups = Array.isArray(state.backlogGroups) ? state.backlogGroups : [];
            newGroups = groups(currentGroups);
          } else {
            // If it's a direct value, use it
            newGroups = groups;
          }
          
          // Ensure the result is an array
          if (!Array.isArray(newGroups)) {
            console.error('❌ setBacklogGroups received non-array result:', typeof newGroups, newGroups);
            return state; // Don't update if invalid
          }
          
          console.log(`✅ SessionStore: Setting ${newGroups.length} backlog groups`);
          return { backlogGroups: newGroups };
        });
        
        // Auto-save after setting groups
        setTimeout(() => {
          const currentState = get();
          if (Array.isArray(currentState.backlogGroups)) {
            currentState.saveCurrentSession();
          }
        }, 100);
      },

      addItemToGroup: (groupId: string, item: BacklogItem) => {
        set((state) => {
          // Ensure backlogGroups is an array
          if (!Array.isArray(state.backlogGroups)) {
            console.error('❌ addItemToGroup: backlogGroups is not an array');
            return state;
          }
          
          const updatedGroups = state.backlogGroups.map(group => {
            if (group.id === groupId) {
              // Check if item already exists
              const itemExists = (group.items || []).some(existingItem => existingItem.id === item.id);
              if (!itemExists) {
                return {
                  ...group,
                  items: [...(group.items || []), item],
                  item_count: (group.item_count || 0) + 1
                };
              }
            }
            return group;
          });
          
          return { backlogGroups: updatedGroups };
        });
        
        setTimeout(() => get().saveCurrentSession(), 100);
      },

      removeItemFromGroup: (groupId: string, itemId: string) => {
        set((state) => {
          // Ensure backlogGroups is an array
          if (!Array.isArray(state.backlogGroups)) {
            console.error('❌ removeItemFromGroup: backlogGroups is not an array');
            return state;
          }
          
          console.log(`🗑️ SessionStore: Removing item ${itemId} from group ${groupId}`);
          
          const updatedGroups = state.backlogGroups.map(group => {
            if (group.id === groupId) {
              const updatedItems = (group.items || []).filter(item => item.id !== itemId);
              console.log(`📉 Group ${group.name}: ${(group.items || []).length} → ${updatedItems.length} items`);
              
              return {
                ...group,
                items: updatedItems,
                item_count: updatedItems.length
              };
            }
            return group;
          });
          
          // Clear selection and compare list
          const updatedSelectedBacklogItem = state.selectedBacklogItem === itemId ? null : state.selectedBacklogItem;
          const updatedCompareList = (state.compareList || []).filter(item => item.id !== itemId);
          
          console.log(`✅ SessionStore: Item ${itemId} removed successfully`);
          
          return {
            backlogGroups: updatedGroups,
            compareList: updatedCompareList,
            selectedBacklogItem: updatedSelectedBacklogItem
          };
        });

        // Auto-save after removal
        setTimeout(() => get().saveCurrentSession(), 100);
      },

      // FIXED loadGroupItems method
      loadGroupItems: async (groupId: string): Promise<void> => {
        try {
          console.log(`🔄 SessionStore: Loading items for group ${groupId}...`);
          
          // Use the single group endpoint that includes items
          const groupWithItems = await itemGroupsApi.getGroup(groupId, true);
          
          if (!groupWithItems || !Array.isArray(groupWithItems.items)) {
            console.error('❌ Invalid response from getGroup API:', groupWithItems);
            return;
          }

          // Convert API items to BacklogItem format
          const items: BacklogItem[] = groupWithItems.items.map(item => ({
            id: item.id,
            name: item.name,
            title: item.name, // Legacy compatibility
            description: item.description || '',
            category: item.category,
            subcategory: item.subcategory,
            item_year: item.item_year,
            item_year_to: item.item_year_to,
            image_url: item.image_url,
            created_at: item.created_at,
            tags: [] // Default empty tags
          }));

          console.log(`📦 SessionStore: Converting ${groupWithItems.items.length} API items to BacklogItems`);

          // Update the store with loaded items
          set((state) => {
            if (!Array.isArray(state.backlogGroups)) {
              console.error('❌ backlogGroups is not an array in loadGroupItems');
              return state;
            }

            const updatedGroups = state.backlogGroups.map(group => {
              if (group.id === groupId) {
                console.log(`✅ SessionStore: Updating group ${group.name} with ${items.length} items`);
                return { 
                  ...group, 
                  items, 
                  item_count: items.length 
                };
              }
              return group;
            });

            return { backlogGroups: updatedGroups };
          });

          console.log(`✅ SessionStore: Successfully loaded ${items.length} items for group ${groupId}`);
          
          // Auto-save after loading items
          setTimeout(() => get().saveCurrentSession(), 100);
          
        } catch (error) {
          console.error(`❌ SessionStore: Failed to load items for group ${groupId}:`, error);
          throw error;
        }
      },

      getGroupItems: (groupId: string): BacklogItem[] => {
        const state = get();
        
        // Ensure backlogGroups is an array
        if (!Array.isArray(state.backlogGroups)) {
          console.warn('⚠️ getGroupItems: backlogGroups is not an array:', typeof state.backlogGroups);
          return [];
        }
        
        const group = state.backlogGroups.find(g => g && g.id === groupId);
        const items = group?.items || [];
        
        console.log(`🔍 SessionStore.getGroupItems(${groupId}):`, {
          groupFound: !!group,
          groupName: group?.name,
          itemCount: items.length
        });
        
        return items;
      },

      // Selection
      setSelectedBacklogItem: (id) => set({ selectedBacklogItem: id }),

      // Compare List
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

// New selectors for group management
export const useGroupItems = (groupId: string) => useSessionStore((state) => state.getGroupItems(groupId));
export const useAvailableBacklogItems = () => useSessionStore((state) => {
  if (!Array.isArray(state.backlogGroups)) return [];
  return state.backlogGroups.flatMap(group => group.items || []);
});