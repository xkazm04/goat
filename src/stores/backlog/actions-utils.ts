import { BacklogState } from './types';
import { BacklogItem, BacklogGroup } from '@/types/backlog-groups';
import { backlogLogger } from '@/lib/logger';
import { rebuildItemIndex } from './item-index';

// Type for immer-compatible set function
type ImmerSet = (fn: (state: BacklogState) => void) => void;

// Helper to update item in groups array
const updateItemInGroups = <T extends BacklogGroup>(
  groups: T[],
  itemId: string,
  updater: (item: BacklogItem) => BacklogItem
): { groups: T[]; found: boolean } => {
  let found = false;
  const updatedGroups = groups.map(group => {
    if (!group.items || !Array.isArray(group.items)) return group;

    const updatedItems = group.items.map(item => {
      if (item.id === itemId) {
        found = true;
        return updater(item);
      }
      return item;
    });

    return updatedItems !== group.items ? { ...group, items: updatedItems } : group;
  }) as T[];

  return { groups: updatedGroups, found };
};

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

  // Mark item as used/unused - O(1) via index map for main groups
  markItemAsUsed: (itemId: string, used: boolean) => {
    set(state => {
      backlogLogger.debug(`Marking item ${itemId} as ${used ? 'used' : 'unused'}`);

      const updater = (item: BacklogItem) => ({ ...item, used });

      // Fast path: use index to find the exact group
      const groupIdx = state._itemIndex.get(itemId);
      let found = false;

      if (groupIdx !== undefined) {
        const group = state.groups[groupIdx];
        if (group?.items) {
          const itemIdx = group.items.findIndex(i => i.id === itemId);
          if (itemIdx !== -1) {
            found = true;
            const updatedItems = [...group.items];
            updatedItems[itemIdx] = updater(updatedItems[itemIdx]);
            state.groups[groupIdx] = { ...group, items: updatedItems };

            // Update matching cache entry using group's category
            const cacheKey = `${group.category}-${group.subcategory || ''}`;
            if (state.cache[cacheKey]?.groups) {
              const { groups: updatedCacheGroups } = updateItemInGroups(
                state.cache[cacheKey].groups,
                itemId,
                updater
              );
              state.cache[cacheKey].groups = updatedCacheGroups;
              state.cache[cacheKey].lastUpdated = Date.now();
            }
          }
        }
      }

      // Fallback: linear scan if index miss
      if (!found) {
        const { groups: updatedGroups, found: scanFound } = updateItemInGroups(state.groups, itemId, updater);
        if (!scanFound) {
          backlogLogger.warn(`Item ${itemId} not found for used status update`);
          return;
        }
        state.groups = updatedGroups;
        // Update all caches on fallback
        Object.keys(state.cache).forEach(cacheKey => {
          if (state.cache[cacheKey]?.groups) {
            const { groups: updatedCacheGroups, found: cacheFound } = updateItemInGroups(
              state.cache[cacheKey].groups,
              itemId,
              updater
            );
            if (cacheFound) {
              state.cache[cacheKey].groups = updatedCacheGroups;
              state.cache[cacheKey].lastUpdated = Date.now();
            }
          }
        });
      }
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
    set(state => {
      state.groups = [];
      state._itemIndex = new Map();
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
    const groupsWithItems = state.groups.filter(g => g.items && g.items.length > 0).length;
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