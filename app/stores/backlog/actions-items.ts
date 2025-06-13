import { BacklogItem } from '@/app/types/backlog-groups';
import { BacklogState } from './types';
import { StateCreator } from 'zustand';

export const createItemActions = (
  set: StateCreator<BacklogState>['set'],
  get: () => BacklogState
) => ({
  // Item management
  addItemToGroup: (groupId: string, item: BacklogItem) => {
    set(state => {
      // Add to pending changes if offline
      if (state.isOfflineMode) {
        state.pendingChanges.push({
          type: 'add',
          groupId,
          item,
          timestamp: Date.now()
        });
      }
      
      // Find the group
      const groupIndex = state.groups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) {
        console.warn(`⚠️ BacklogStore: Group ${groupId} not found for adding item`);
        return;
      }
      
      // Add item to group
      const group = state.groups[groupIndex];
      if (!group.items) {
        group.items = [];
      }
      
      // Check if item already exists
      const existingItemIndex = group.items.findIndex(i => i.id === item.id);
      if (existingItemIndex !== -1) {
        // Update the existing item
        group.items[existingItemIndex] = {
          ...group.items[existingItemIndex],
          ...item
        };
      } else {
        // Add new item
        group.items.push({
          ...item,
          // If the item doesn't have an image, use the group's image
          image_url: item.image_url || group.image_url || null
        });
        
        // Update item count
        group.item_count = group.items.length;
      }
      
      // Update cache
      const cacheKey = `${group.category}-${group.subcategory || ''}`;
      if (state.cache[cacheKey]) {
        // Find and update the cached group
        const cachedGroupIndex = state.cache[cacheKey].groups.findIndex(g => g.id === groupId);
        if (cachedGroupIndex !== -1) {
          const cachedGroup = state.cache[cacheKey].groups[cachedGroupIndex];
          if (!cachedGroup.items) {
            cachedGroup.items = [];
          }
          
          // Check if item exists in cache
          const cachedItemIndex = cachedGroup.items.findIndex(i => i.id === item.id);
          if (cachedItemIndex !== -1) {
            // Update the existing item
            cachedGroup.items[cachedItemIndex] = {
              ...cachedGroup.items[cachedItemIndex],
              ...item
            };
          } else {
            // Add new item
            cachedGroup.items.push({
              ...item,
              image_url: item.image_url || cachedGroup.image_url || null
            });
          }
          
          // Update item count
          cachedGroup.item_count = cachedGroup.items.length;
        }
        
        // Update lastUpdated
        state.cache[cacheKey].lastUpdated = Date.now();
      }
    });
  },
  
  removeItemFromGroup: (groupId: string, itemId: string) => {
    set(state => {
      // Add to pending changes if offline
      if (state.isOfflineMode) {
        state.pendingChanges.push({
          type: 'remove',
          groupId,
          itemId,
          timestamp: Date.now()
        });
      }
      
      // Find the group
      const groupIndex = state.groups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) {
        console.warn(`⚠️ BacklogStore: Group ${groupId} not found for removing item`);
        return;
      }
      
      // Remove item from group
      const group = state.groups[groupIndex];
      if (!group.items) {
        console.warn(`⚠️ BacklogStore: Group ${groupId} has no items`);
        return;
      }
      
      // Filter out the item
      group.items = group.items.filter(item => item.id !== itemId);
      
      // Update item count
      group.item_count = group.items.length;
      
      // Update cache
      const cacheKey = `${group.category}-${group.subcategory || ''}`;
      if (state.cache[cacheKey]) {
        // Find and update the cached group
        const cachedGroupIndex = state.cache[cacheKey].groups.findIndex(g => g.id === groupId);
        if (cachedGroupIndex !== -1) {
          const cachedGroup = state.cache[cacheKey].groups[cachedGroupIndex];
          if (cachedGroup.items) {
            // Filter out the item
            cachedGroup.items = cachedGroup.items.filter(item => item.id !== itemId);
            
            // Update item count
            cachedGroup.item_count = cachedGroup.items.length;
          }
        }
        
        // Update lastUpdated
        state.cache[cacheKey].lastUpdated = Date.now();
      }
      
      // Clear selection if the removed item was selected
      if (state.selectedItemId === itemId) {
        state.selectedItemId = null;
      }
    });
  },
  
  updateItemInGroup: (groupId: string, itemId: string, updates: Partial<BacklogItem>) => {
    set(state => {
      // Add to pending changes if offline
      if (state.isOfflineMode) {
        state.pendingChanges.push({
          type: 'update',
          groupId,
          itemId,
          item: updates as any,
          timestamp: Date.now()
        });
      }
      
      // Find the group
      const groupIndex = state.groups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) {
        console.warn(`⚠️ BacklogStore: Group ${groupId} not found for updating item`);
        return;
      }
      
      // Update item in group
      const group = state.groups[groupIndex];
      if (!group.items) {
        console.warn(`⚠️ BacklogStore: Group ${groupId} has no items`);
        return;
      }
      
      // Find and update the item
      const itemIndex = group.items.findIndex(item => item.id === itemId);
      if (itemIndex === -1) {
        console.warn(`⚠️ BacklogStore: Item ${itemId} not found in group ${groupId}`);
        return;
      }
      
      // Update the item
      group.items[itemIndex] = {
        ...group.items[itemIndex],
        ...updates
      };
      
      // Update cache
      const cacheKey = `${group.category}-${group.subcategory || ''}`;
      if (state.cache[cacheKey]) {
        // Find and update the cached group
        const cachedGroupIndex = state.cache[cacheKey].groups.findIndex(g => g.id === groupId);
        if (cachedGroupIndex !== -1) {
          const cachedGroup = state.cache[cacheKey].groups[cachedGroupIndex];
          if (cachedGroup.items) {
            // Find and update the item
            const cachedItemIndex = cachedGroup.items.findIndex(item => item.id === itemId);
            if (cachedItemIndex !== -1) {
              // Update the item
              cachedGroup.items[cachedItemIndex] = {
                ...cachedGroup.items[cachedItemIndex],
                ...updates
              };
            }
          }
        }
        
        // Update lastUpdated
        state.cache[cacheKey].lastUpdated = Date.now();
      }
    });
  },
  
  // Mark item as used or unused across all groups
  markItemAsUsed: (itemId: string, isUsed: boolean) => {
    set(state => {
      // Go through all groups
      for (const group of state.groups) {
        if (group.items) {
          // Find the item
          const itemIndex = group.items.findIndex(item => item.id === itemId);
          if (itemIndex !== -1) {
            // Update the item
            group.items[itemIndex] = {
              ...group.items[itemIndex],
              used: isUsed
            };
            
            // Update in cache
            const cacheKey = `${group.category}-${group.subcategory || ''}`;
            if (state.cache[cacheKey]) {
              // Find and update the cached group
              const cachedGroupIndex = state.cache[cacheKey].groups.findIndex(g => g.id === group.id);
              if (cachedGroupIndex !== -1) {
                const cachedGroup = state.cache[cacheKey].groups[cachedGroupIndex];
                if (cachedGroup.items) {
                  // Find and update the item
                  const cachedItemIndex = cachedGroup.items.findIndex(item => item.id === itemId);
                  if (cachedItemIndex !== -1) {
                    // Update the item
                    cachedGroup.items[cachedItemIndex] = {
                      ...cachedGroup.items[cachedItemIndex],
                      used: isUsed
                    };
                  }
                }
              }
              
              // Update lastUpdated
              state.cache[cacheKey].lastUpdated = Date.now();
            }
            
            break; // Item found and updated, no need to continue
          }
        }
      }
    });
  },
});

export type ItemActions = ReturnType<typeof createItemActions>;