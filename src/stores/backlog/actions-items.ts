import { BacklogState, PendingChange } from './types';
import { BacklogItem } from '@/types/backlog-groups';
import { backlogLogger } from '@/lib/logger';
import { replaceGroupInIndex } from './item-index';
import { syncCacheFromGroups } from './cache-utils';
import { useSelectionCursor } from '../selection-cursor';

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

      const groupIndex = state.groups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) return;

      const group = state.groups[groupIndex];
      const itemExists = group.items?.some(existingItem => existingItem.id === item.id);
      if (itemExists) {
        backlogLogger.warn(`Item ${item.id} already exists in group ${group.name}`);
        return;
      }

      if (!group.items) group.items = [];
      const prevCount = group.items.length;
      group.items.push(item);
      group.item_count = group.items.length;
      // Maintain loaded groups counter: group went from empty to non-empty
      if (prevCount === 0) state._loadedGroupsCount++;
      backlogLogger.debug(`Added item to group ${group.name}: ${prevCount} → ${group.items.length}`);

      // Update item index: add new item mapping
      state._itemIndex.set(item.id, groupIndex);

      // Sync cache from state.groups (single reference copy, not re-iteration)
      syncCacheFromGroups(state, groupId);

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

      const groupIndex = state.groups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) return;

      const group = state.groups[groupIndex];
      if (!group.items) {
        backlogLogger.warn(`Item ${itemId} not found in group ${groupId}`);
        return;
      }

      const itemIndex = group.items.findIndex(i => i.id === itemId);
      if (itemIndex === -1) {
        backlogLogger.warn(`Item ${itemId} not found in group ${groupId}`);
        backlogLogger.debug(`Group ${groupId} contains items:`, group.items.map(i => ({ id: i.id, name: i.name })));
        return;
      }

      const originalCount = group.items.length;
      group.items.splice(itemIndex, 1);
      group.item_count = group.items.length;
      // Maintain loaded groups counter: group went from non-empty to empty
      if (group.items.length === 0 && originalCount > 0) state._loadedGroupsCount--;
      backlogLogger.debug(`Removed item from group ${group.name}: ${originalCount} → ${group.items.length}`);

      // Update item index: remove deleted item
      state._itemIndex.delete(itemId);

      // Sync cache from state.groups (single reference copy, not re-iteration)
      syncCacheFromGroups(state, groupId);

      backlogLogger.debug(`Item removal persisted to cache`);

      // Clear selection cursor if the removed item was selected
      if (useSelectionCursor.getState().itemId === itemId) {
        useSelectionCursor.getState().clear();
      }
      // Clear deprecated local shadows
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

      const groupIndex = state.groups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) return;

      // Incremental index update: remove old entries, add new ones — O(old+new) not O(all)
      const oldItems = state.groups[groupIndex].items;
      const hadItems = oldItems && oldItems.length > 0;
      replaceGroupInIndex(state._itemIndex, groupIndex, oldItems, items);

      state.groups[groupIndex].items = items;
      state.groups[groupIndex].item_count = items.length;

      // Maintain loaded groups counter
      const hasItems = items.length > 0;
      if (!hadItems && hasItems) state._loadedGroupsCount++;
      else if (hadItems && !hasItems) state._loadedGroupsCount--;

      // Sync cache from state.groups
      syncCacheFromGroups(state, groupId);
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

  // Select item — cursor is the single source of truth
  selectItem: (itemId: string | null) => {
    if (itemId) {
      useSelectionCursor.getState().select(itemId, 'click');
    } else {
      useSelectionCursor.getState().clear();
    }
    // Keep deprecated local shadow in sync for storage compat
    set(state => {
      state.selectedItemId = itemId;
    });
  },

  // Set active item (deprecated — hover/preview state should be component-local)
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

      const groupIndex = state.groups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) return;

      const group = state.groups[groupIndex];
      if (!group.items) return;

      const itemIndex = group.items.findIndex(i => i.id === itemId);
      if (itemIndex === -1) return;

      Object.assign(group.items[itemIndex], updates);

      // Sync cache from state.groups
      syncCacheFromGroups(state, groupId);
    });
  },

  // Get matched items count
  getMatchedItemsCount: () => {
    const state = get();
    const searchTerm = state.searchTerm.toLowerCase().trim();

    if (!searchTerm) {
      return state.groups.reduce((count, group) => count + (group.items?.length || 0), 0);
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