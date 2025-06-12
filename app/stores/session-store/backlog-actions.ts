import { StateCreator } from 'zustand';
import { SessionStoreState } from './types';
import { BacklogGroup, BacklogItem } from '@/app/types/backlog-groups';
import { BacklogItemType } from '@/app/types/match';
import { itemGroupsApi } from '@/app/lib/api/item-groups';

export const createBacklogActions: StateCreator<
  SessionStoreState,
  [],
  [],
  Pick<SessionStoreState, 
    'setBacklogGroups' | 'toggleBacklogGroup' | 'addItemToGroup' | 
    'removeItemFromGroup' | 'loadGroupItems' | 'getGroupItems' |
    'setSelectedBacklogItem' | 'toggleCompareItem' | 'clearCompareList'
  >
> = (set, get) => ({
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
      
      // Find the group and item
      const targetGroup = state.backlogGroups.find(group => group.id === groupId);
      if (!targetGroup) {
        console.warn(`⚠️ Group ${groupId} not found`);
        return state;
      }
      
      const itemExists = (targetGroup.items || []).some(item => item.id === itemId);
      if (!itemExists) {
        console.warn(`⚠️ Item ${itemId} not found in group ${groupId}`);
        return state;
      }
      
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
    return group?.items || [];
  },

  setSelectedBacklogItem: (id) => set({ selectedBacklogItem: id }),

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
});