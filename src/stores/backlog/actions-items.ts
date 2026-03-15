import { BacklogState, PendingChange } from './types';
import { BacklogItem } from '@/types/backlog-groups';
import { backlogLogger } from '@/lib/logger';
import { rebuildItemIndex } from './item-index';
import { updateGroupInAllCaches } from './cache-utils';

// Type for immer-compatible set function
type ImmerSet = (fn: (state: BacklogState) => void) => void;

export const createItemActions = (
  set: ImmerSet,
  get: () => BacklogState
) => ({
  // Add item to group
  addItemToGroup: (groupId: string, item: BacklogItem) => {
    set(state => {
      backlogLogger.debug(`Adding item ${item.id} to group ${groupId}`);
      
      const updatedGroups = state.groups.map(group => {
        if (group.id === groupId) {
          // Check if item already exists
          const itemExists = group.items?.some(existingItem => existingItem.id === item.id);
          if (!itemExists) {
            const updatedItems = [...(group.items || []), item];
            backlogLogger.debug(`Added item to group ${group.name}: ${group.items?.length || 0} → ${updatedItems.length}`);
            
            return {
              ...group,
              items: updatedItems,
              item_count: updatedItems.length
            };
          } else {
            backlogLogger.warn(`Item ${item.id} already exists in group ${group.name}`);
          }
        }
        return group;
      });
      
      state.groups = updatedGroups;

      // Update item index: add new item mapping
      const gi = updatedGroups.findIndex(g => g.id === groupId);
      if (gi !== -1) state._itemIndex.set(item.id, gi);

      // Update cache to persist the change
      updateGroupInAllCaches(state.cache, groupId, group => {
        if (group.items?.some(existingItem => existingItem.id === item.id)) return group;
        const updatedItems = [...(group.items || []), item];
        return { ...group, items: updatedItems, item_count: updatedItems.length };
      });
      
      // Add to pending changes if offline
      if (state.isOfflineMode) {
        const pendingChange: PendingChange = {
          type: 'add',
          groupId,
          item,
          timestamp: Date.now()
        };
        state.pendingChanges.push(pendingChange);
      }
    });
  },

  // FIXED: Remove item from group with proper persistence
  removeItemFromGroup: (groupId: string, itemId: string) => {
    set(state => {
      backlogLogger.debug(`Removing item ${itemId} from group ${groupId}`);
      
      let itemFound = false;

      const updatedGroups = state.groups.map(group => {
        if (group.id === groupId) {
          const originalCount = group.items?.length || 0;
          const updatedItems = (group.items || []).filter(item => {
            if (item.id === itemId) {
              itemFound = true;
              return false; // Remove this item
            }
            return true; // Keep other items
          });
          
          if (itemFound) {
            backlogLogger.debug(`Removed item from group ${group.name}: ${originalCount} → ${updatedItems.length}`);
            
            return {
              ...group,
              items: updatedItems,
              item_count: updatedItems.length
            };
          }
        }
        return group;
      });
      
      if (!itemFound) {
        backlogLogger.warn(`Item ${itemId} not found in group ${groupId}`);
        // Debug: List all items in the group
        const targetGroup = state.groups.find(g => g.id === groupId);
        if (targetGroup && targetGroup.items) {
          backlogLogger.debug(`Group ${groupId} contains items:`, targetGroup.items.map(i => ({ id: i.id, name: i.name })));
        }
        return;
      }
      
      state.groups = updatedGroups;

      // Update item index: remove deleted item
      state._itemIndex.delete(itemId);

      // CRITICAL: Update ALL relevant caches to persist removal
      updateGroupInAllCaches(state.cache, groupId, group => {
        const updatedItems = (group.items || []).filter(i => i.id !== itemId);
        return { ...group, items: updatedItems, item_count: updatedItems.length };
      });
      
      backlogLogger.debug(`Item removal persisted to cache`);
      
      // Clear selections if the removed item was selected
      if (state.selectedItemId === itemId) {
        state.selectedItemId = null;
      }
      if (state.activeItemId === itemId) {
        state.activeItemId = null;
      }
      
      // Add to pending changes if offline
      if (state.isOfflineMode) {
        const pendingChange: PendingChange = {
          type: 'remove',
          groupId,
          itemId,
          timestamp: Date.now()
        };
        state.pendingChanges.push(pendingChange);
      }
    });
  },

  // Update group items
  updateGroupItems: (groupId: string, items: BacklogItem[]) => {
    set(state => {
      backlogLogger.debug(`Updating group ${groupId} with ${items.length} items`);
      
      const updatedGroups = state.groups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            items: items,
            item_count: items.length
          };
        }
        return group;
      });
      
      state.groups = updatedGroups;

      // Rebuild item index after bulk update
      state._itemIndex = rebuildItemIndex(updatedGroups);

      // Update cache as well
      updateGroupInAllCaches(state.cache, groupId, group => ({
        ...group, items, item_count: items.length
      }));
    });
  },

  // Get group items
  getGroupItems: (groupId: string) => {
    const state = get();
    const group = state.groups.find(g => g.id === groupId);
    return group?.items || [];
  },

  // Select group
  selectGroup: (groupId: string | null) => {
    set(state => {
      state.selectedGroupId = groupId;
    });
  },

  // Select item
  selectItem: (itemId: string | null) => {
    set(state => {
      state.selectedItemId = itemId;
    });
  },

  // Set active item
  setActiveItem: (itemId: string | null) => {
    set(state => {
      state.activeItemId = itemId;
    });
  },

  // Toggle group selection
  toggleGroupSelection: (groupId: string) => {
    const state = get();
    const newSelection = state.selectedGroupId === groupId ? null : groupId;
    get().selectGroup(newSelection);
  },

  // Update item in group
  updateItemInGroup: (groupId: string, itemId: string, updates: Partial<BacklogItem>) => {
    set(state => {
      backlogLogger.debug(`Updating item ${itemId} in group ${groupId}`);

      const updatedGroups = state.groups.map(group => {
        if (group.id === groupId && group.items) {
          const updatedItems = group.items.map(item => {
            if (item.id === itemId) {
              return { ...item, ...updates };
            }
            return item;
          });

          return { ...group, items: updatedItems };
        }
        return group;
      });

      state.groups = updatedGroups;

      // Update cache as well
      updateGroupInAllCaches(state.cache, groupId, group => {
        if (!group.items) return group;
        const updatedItems = group.items.map(i => i.id === itemId ? { ...i, ...updates } : i);
        return { ...group, items: updatedItems };
      }, { markLoaded: false });
    });
  },

  // Get matched items count
  getMatchedItemsCount: () => {
    const state = get();
    const searchTerm = state.searchTerm.toLowerCase().trim();

    if (!searchTerm) {
      return state.groups.reduce((count, group) => count + (group.item_count || 0), 0);
    }

    let count = 0;
    state.groups.forEach(group => {
      if (group.items) {
        group.items.forEach(item => {
          if (
            item.name?.toLowerCase().includes(searchTerm) ||
            item.description?.toLowerCase().includes(searchTerm) ||
            item.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
          ) {
            count++;
          }
        });
      }
    });

    return count;
  },

  // Check if item is used - O(1) via index map
  isItemUsed: (itemId: string) => {
    const state = get();
    const groupIdx = state._itemIndex.get(itemId);
    if (groupIdx !== undefined) {
      const group = state.groups[groupIdx];
      if (group?.items) {
        const item = group.items.find(i => i.id === itemId);
        if (item) return item.used || false;
      }
    }
    // Fallback: linear scan
    for (const group of state.groups) {
      if (group.items) {
        const item = group.items.find(i => i.id === itemId);
        if (item) return item.used || false;
      }
    }
    return false;
  },

  // Clear cache
  clearCache: (category?: string) => {
    set(state => {
      if (category) {
        // Clear specific category caches
        Object.keys(state.cache).forEach(key => {
          if (key.startsWith(category)) {
            delete state.cache[key];
          }
        });
        backlogLogger.debug(`Cleared cache for category: ${category}`);
      } else {
        // Clear all caches
        state.cache = {};
        backlogLogger.debug(`Cleared all cache`);
      }
    });
  }
});

export type ItemActions = ReturnType<typeof createItemActions>;