import { BacklogState } from './types';
import { BacklogItem, BacklogGroup } from '@/types/backlog-groups';
import { backlogLogger } from '@/lib/logger';
import { syncCacheFromGroups } from './cache-utils';
import { useSelectionCursor } from '../selection-cursor';

// Type for immer-compatible set function
type ImmerSet = (fn: (state: BacklogState) => void) => void;

// Helper to find item across all groups
const findItemInGroups = (groups: BacklogGroup[], itemId: string): BacklogItem | null => {
  for (const group of groups) {
    if (group.items && Array.isArray(group.items)) {
      const item = group.items.find(item => item.id === itemId);
      if (item) return item;
    }
  }
  return null;
};

export const createUtilActions = (
  set: ImmerSet,
  get: () => BacklogState
) => ({
  // Search functionality
  searchGroups: (searchTerm: string) => {
    const state = get();
    if (!searchTerm.trim()) {
      return state.groups;
    }

    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    
    return state.groups.filter(group => {
      const nameMatch = group.name.toLowerCase().includes(lowerSearchTerm);
      const descriptionMatch = group.description?.toLowerCase().includes(lowerSearchTerm);
      const itemsMatch = group.items?.some(item => 
        item.name?.toLowerCase().includes(lowerSearchTerm) ||
        item.description?.toLowerCase().includes(lowerSearchTerm) ||
        item.tags?.some(tag => tag.toLowerCase().includes(lowerSearchTerm))
      );
      
      return nameMatch || descriptionMatch || itemsMatch;
    });
  },

  // Filter by category
  filterGroupsByCategory: (category: string, subcategory?: string) => {
    const state = get();
    
    return state.groups.filter(group => {
      const categoryMatch = group.category === category;
      const subcategoryMatch = !subcategory || group.subcategory === subcategory;
      
      return categoryMatch && subcategoryMatch;
    });
  },

  // Get item by ID - O(1) via index map
  getItemById: (itemId: string): BacklogItem | null => {
    const state = get();
    const groupIdx = state._itemIndex.get(itemId);
    if (groupIdx !== undefined) {
      const group = state.groups[groupIdx];
      if (group?.items) {
        const item = group.items.find(i => i.id === itemId);
        if (item) return item;
      }
    }
    // Fallback: linear scan (index may be stale)
    const item = findItemInGroups(state.groups, itemId);
    if (!item) {
      backlogLogger.warn(`Item ${itemId} not found in any group`);
    }
    return item;
  },

  /**
   * Authoritative setter for the `item.used` flag.
   *
   * Called during grid sync to mark items as placed (used=true) or available (used=false).
   * The flag propagates to CollectionItem and NormalizedItem via transformers,
   * and is consumed by `useCollectionFiltering` and `ConfigurableCollectionItem`
   * to hide/dim placed items in the backlog panel.
   *
   * O(1) via index map for main groups, with linear-scan fallback.
   */
  markItemAsUsed: (itemId: string, used: boolean) => {
    set(state => {
      backlogLogger.debug(`Marking item ${itemId} as ${used ? 'used' : 'unused'}`);

      // Fast path: use index to find the exact group
      const groupIdx = state._itemIndex.get(itemId);
      let targetGroupId: string | undefined;

      if (groupIdx !== undefined) {
        const group = state.groups[groupIdx];
        if (group?.items) {
          const itemIdx = group.items.findIndex(i => i.id === itemId);
          if (itemIdx !== -1) {
            group.items[itemIdx].used = used;
            targetGroupId = group.id;
          }
        }
      }

      // Fallback: linear scan if index miss
      if (!targetGroupId) {
        for (const group of state.groups) {
          if (!group.items) continue;
          const item = group.items.find(i => i.id === itemId);
          if (item) {
            item.used = used;
            targetGroupId = group.id;
            break;
          }
        }
      }

      if (!targetGroupId) {
        backlogLogger.warn(`Item ${itemId} not found for used status update`);
        return;
      }

      // Sync cache from state.groups (single reference, not re-iteration)
      syncCacheFromGroups(state, targetGroupId);
    });
  },

  // Set search term
  setSearchTerm: (searchTerm: string) => {
    set(state => {
      state.searchTerm = searchTerm;
    });
  },

  // Clear all data
  clearAllData: () => {
    // Clear the authoritative cursor first (outside immer)
    useSelectionCursor.getState().clear();
    set(state => {
      state.groups = [];
      state._itemIndex = new Map();
      state._loadedGroupsCount = 0;
      state.selectedGroupId = null;
      state.selectedItemId = null;
      state.activeItemId = null;
      state.searchTerm = '';
      state.cache = {};
      state.error = null;
      state.loadingProgress = {
        totalGroups: 0,
        loadedGroups: 0,
        isLoading: false,
        percentage: 0
      };
    });
  },

  // Clear cache
  clearCache: async (category?: string) => {
    set(state => {
      if (category) {
        // Clear only specific category cache
        const keysToDelete = Object.keys(state.cache).filter(key => key.startsWith(`${category}-`));
        keysToDelete.forEach(key => {
          delete state.cache[key];
        });
      } else {
        // Clear all cache
        state.cache = {};
        state.lastSyncTimestamp = 0;
      }
    });
  },

  // Get stats
  getStats: () => {
    const state = get();
    const totalGroups = state.groups.length;
    const groupsWithItems = state._loadedGroupsCount;
    const totalItems = state.groups.reduce((sum, group) => sum + (group.item_count || 0), 0);

    return {
      totalGroups,
      groupsWithItems,
      totalItems,
      cacheKeys: Object.keys(state.cache),
      isLoading: state.isLoading,
      hasError: !!state.error
    };
  },
});

export type UtilActions = ReturnType<typeof createUtilActions>;