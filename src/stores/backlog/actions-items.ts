import { BacklogState, PendingChange } from './types';
import { BacklogItem } from '@/types/backlog-groups';

// Type for immer-compatible set function
type ImmerSet = (fn: (state: BacklogState) => void) => void;

export const createItemActions = (
  set: ImmerSet,
  get: () => BacklogState
) => ({
  // Add item to group
  addItemToGroup: (groupId: string, item: BacklogItem) => {
    set(state => {
      console.log(`➕ BacklogStore: Adding item ${item.id} to group ${groupId}`);
      
      const updatedGroups = state.groups.map(group => {
        if (group.id === groupId) {
          // Check if item already exists
          const itemExists = group.items?.some(existingItem => existingItem.id === item.id);
          if (!itemExists) {
            const updatedItems = [...(group.items || []), item];
            console.log(`✅ BacklogStore: Added item to group ${group.name}: ${group.items?.length || 0} → ${updatedItems.length}`);
            
            return {
              ...group,
              items: updatedItems,
              item_count: updatedItems.length
            };
          } else {
            console.log(`⚠️ BacklogStore: Item ${item.id} already exists in group ${group.name}`);
          }
        }
        return group;
      });
      
      state.groups = updatedGroups;
      
      // Update cache to persist the change
      Object.keys(state.cache).forEach(cacheKey => {
        if (state.cache[cacheKey] && state.cache[cacheKey].groups) {
          const updatedCachedGroups = state.cache[cacheKey].groups.map(group => {
            if (group.id === groupId && !group.items?.some(existingItem => existingItem.id === item.id)) {
              const updatedItems = [...(group.items || []), item];
              return {
                ...group,
                items: updatedItems,
                item_count: updatedItems.length
              };
            }
            return group;
          });
          
          state.cache[cacheKey].groups = updatedCachedGroups;
          state.cache[cacheKey].lastUpdated = Date.now();
          state.cache[cacheKey].loadedGroupIds.add(groupId);
        }
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
      console.log(`🗑️ BacklogStore: Removing item ${itemId} from group ${groupId}`);
      
      let itemFound = false;
      let removedItem = null;
      
      const updatedGroups = state.groups.map(group => {
        if (group.id === groupId) {
          const originalCount = group.items?.length || 0;
          const updatedItems = (group.items || []).filter(item => {
            if (item.id === itemId) {
              itemFound = true;
              removedItem = item;
              return false; // Remove this item
            }
            return true; // Keep other items
          });
          
          if (itemFound) {
            console.log(`✅ BacklogStore: Removed item from group ${group.name}: ${originalCount} → ${updatedItems.length}`);
            
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
        console.warn(`⚠️ BacklogStore: Item ${itemId} not found in group ${groupId}`);
        // Debug: List all items in the group
        const targetGroup = state.groups.find(g => g.id === groupId);
        if (targetGroup && targetGroup.items) {
          console.log(`🔍 Group ${groupId} contains items:`, targetGroup.items.map(i => ({ id: i.id, name: i.name })));
        }
        return;
      }
      
      state.groups = updatedGroups;
      
      // CRITICAL: Update ALL relevant caches to persist removal
      Object.keys(state.cache).forEach(cacheKey => {
        if (state.cache[cacheKey] && state.cache[cacheKey].groups) {
          // Update the cached groups as well
          const updatedCachedGroups = state.cache[cacheKey].groups.map(group => {
            if (group.id === groupId) {
              const updatedItems = (group.items || []).filter(item => item.id !== itemId);
              return {
                ...group,
                items: updatedItems,
                item_count: updatedItems.length
              };
            }
            return group;
          });
          
          state.cache[cacheKey].groups = updatedCachedGroups;
          state.cache[cacheKey].lastUpdated = Date.now();
          
          // Also update loadedGroupIds to ensure the group is marked as modified
          state.cache[cacheKey].loadedGroupIds.add(groupId);
        }
      });
      
      console.log(`💾 BacklogStore: Item removal persisted to cache`);
      
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
      console.log(`🔄 BacklogStore: Updating group ${groupId} with ${items.length} items`);
      
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
      
      // Update cache as well
      Object.keys(state.cache).forEach(cacheKey => {
        if (state.cache[cacheKey] && state.cache[cacheKey].groups) {
          const updatedCachedGroups = state.cache[cacheKey].groups.map(group => {
            if (group.id === groupId) {
              return {
                ...group,
                items: items,
                item_count: items.length
              };
            }
            return group;
          });
          
          state.cache[cacheKey].groups = updatedCachedGroups;
          state.cache[cacheKey].lastUpdated = Date.now();
          state.cache[cacheKey].loadedGroupIds.add(groupId);
        }
      });
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
      console.log(`🔄 BacklogStore: Updating item ${itemId} in group ${groupId}`);

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
      Object.keys(state.cache).forEach(cacheKey => {
        if (state.cache[cacheKey] && state.cache[cacheKey].groups) {
          const updatedCachedGroups = state.cache[cacheKey].groups.map(group => {
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

          state.cache[cacheKey].groups = updatedCachedGroups;
          state.cache[cacheKey].lastUpdated = Date.now();
        }
      });
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

  // Check if item is used
  isItemUsed: (itemId: string) => {
    const state = get();

    for (const group of state.groups) {
      if (group.items) {
        const item = group.items.find(i => i.id === itemId);
        if (item) {
          return item.used || false;
        }
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
        console.log(`🧹 BacklogStore: Cleared cache for category: ${category}`);
      } else {
        // Clear all caches
        state.cache = {};
        console.log(`🧹 BacklogStore: Cleared all cache`);
      }
    });
  }
});

export type ItemActions = ReturnType<typeof createItemActions>;