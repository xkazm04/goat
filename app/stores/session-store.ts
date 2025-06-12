import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GridItemType, BacklogItemType } from '@/app/types/match';
import { ListSession, SessionProgress } from './item-store/types';
import { SessionManager } from './item-store/session-manager';
import { BacklogGroup, BacklogItem } from '@/app/types/backlog-groups';

interface SessionStoreState {
  // Multi-list sessions
  listSessions: Record<string, ListSession>;
  activeSessionId: string | null;
  
  // Current session state - Updated to support both old and new types
  backlogGroups: BacklogGroup[]; // Changed from BacklogGroupType[] to BacklogGroup[]
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
  
  // Actions - Compare List (Legacy)
  toggleCompareItem: (item: BacklogItemType) => void;
  clearCompareList: () => void;
  
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
          backlogGroups: [], // Ensure this is always an array
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
          // Convert BacklogGroup[] to BacklogGroupType[] for session storage
          // Add null check here
          backlogGroups: (state.backlogGroups || []).map(group => ({
            id: group.id,
            name: group.name,
            items: (group.items || []).map(item => ({
              id: item.id,
              title: item.name || item.title || '',
              description: item.description || '',
              matched: false,
              tags: item.tags || []
            })),
            isOpen: true // Default to open
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
          // Add null check here too
          const convertedGroups: BacklogGroup[] = (session.backlogGroups || []).map(group => ({
            id: group.id,
            name: group.title || group.name || '',
            description: undefined,
            category: 'sports', // Default, will be updated from API
            subcategory: undefined,
            image_url: undefined,
            item_count: (group.items || []).length,
            items: (group.items || []).map(item => ({
              id: item.id,
              name: item.title || '',
              title: item.title || '',
              description: item.description || '',
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
          // Don't set default groups here anymore, let BacklogGroups component handle it via API
          console.log(`Session ${listId} ready, groups will be loaded via API`);
        }
      },

      // Enhanced Backlog Management
      setBacklogGroups: (groups: BacklogGroup[]) => {
        set({ backlogGroups: groups });
        // Auto-save after a short delay
        setTimeout(() => get().saveCurrentSession(), 100);
      },

      toggleBacklogGroup: (groupId: string) => {
        set((state) => {
          const updatedGroups = state.backlogGroups.map(group => {
            if (group.id === groupId) {
              // For BacklogGroup, we don't have isOpen property, but we can track it in session
              return group; // Keep the group as-is for now
            }
            return group;
          });
          
          return { backlogGroups: updatedGroups };
        });
        
        setTimeout(() => get().saveCurrentSession(), 100);
      },

      addItemToGroup: (groupId: string, item: BacklogItem) => {
        set((state) => {
          const updatedGroups = state.backlogGroups.map(group => {
            if (group.id === groupId) {
              // Check if item already exists
              const itemExists = group.items.some(existingItem => existingItem.id === item.id);
              if (!itemExists) {
                return {
                  ...group,
                  items: [...group.items, item],
                  item_count: group.item_count + 1
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
          console.log(`🗑️ SessionStore: Removing item ${itemId} from group ${groupId}`);
          
          // Find the group and item
          const targetGroup = state.backlogGroups.find(group => group.id === groupId);
          if (!targetGroup) {
            console.warn(`⚠️ Group ${groupId} not found`);
            return state;
          }
          
          const itemExists = targetGroup.items.some(item => item.id === itemId);
          if (!itemExists) {
            console.warn(`⚠️ Item ${itemId} not found in group ${groupId}`);
            return state;
          }
          
          const updatedGroups = state.backlogGroups.map(group => {
            if (group.id === groupId) {
              const updatedItems = group.items.filter(item => item.id !== itemId);
              console.log(`📉 Group ${group.name}: ${group.items.length} → ${updatedItems.length} items`);
              
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
          const updatedCompareList = state.compareList.filter(item => item.id !== itemId);
          
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

      // NEW: Update items for a specific group
      updateGroupItems: (groupId: string, items: BacklogItem[]) => {
        set((state) => {
          console.log(`🔄 SessionStore: Updating ${items.length} items for group ${groupId}`);
          
          const updatedGroups = state.backlogGroups.map(group => {
            if (group.id === groupId) {
              return {
                ...group,
                items: items,
                item_count: items.length
              };
            }
            return group;
          });
          
          return { backlogGroups: updatedGroups };
        });

        // Auto-save after update
        setTimeout(() => get().saveCurrentSession(), 100);
      },

      getGroupItems: (groupId: string): BacklogItem[] => {
        const state = get();
        const group = state.backlogGroups.find(g => g.id === groupId);
        return group?.items || [];
      },

      // NEW: Local search function
      searchGroups: (searchTerm: string): BacklogGroup[] => {
        const state = get();
        if (!searchTerm.trim()) {
          return state.backlogGroups;
        }

        const lowerSearchTerm = searchTerm.toLowerCase().trim();
        
        return state.backlogGroups.filter(group => {
          // Search in group name
          const nameMatch = group.name.toLowerCase().includes(lowerSearchTerm);
          
          // Search in group description
          const descriptionMatch = group.description?.toLowerCase().includes(lowerSearchTerm);
          
          // Search in items within the group
          const itemsMatch = group.items.some(item => 
            item.name.toLowerCase().includes(lowerSearchTerm) ||
            item.description?.toLowerCase().includes(lowerSearchTerm) ||
            item.tags?.some(tag => tag.toLowerCase().includes(lowerSearchTerm))
          );
          
          return nameMatch || descriptionMatch || itemsMatch;
        });
      },

      // NEW: Local category filtering function
      getGroupsByCategory: (category: string, subcategory?: string): BacklogGroup[] => {
        const state = get();
        
        return state.backlogGroups.filter(group => {
          const categoryMatch = group.category === category;
          const subcategoryMatch = !subcategory || group.subcategory === subcategory;
          
          return categoryMatch && subcategoryMatch;
        });
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
      getAvailableBacklogItems: (): BacklogItem[] => {
        const state = get();
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

// Enhanced Selector hooks with new types
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