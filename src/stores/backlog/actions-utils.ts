import { BacklogState } from './types';
import { BacklogItem, BacklogGroup } from '@/types/backlog-groups';
import { backlogLogger } from '@/lib/logger';

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

  // Get item by ID across all groups
  getItemById: (itemId: string): BacklogItem | null => {
    const state = get();
    backlogLogger.debug(`Looking for item ${itemId} across ${state.groups.length} groups`);

    const item = findItemInGroups(state.groups, itemId);
    if (item) {
      backlogLogger.debug(`Found item ${itemId}`);
    } else {
      backlogLogger.warn(`Item ${itemId} not found in any group`);
    }
    return item;
  },

  // Mark item as used/unused
  markItemAsUsed: (itemId: string, used: boolean) => {
    set(state => {
      backlogLogger.debug(`Marking item ${itemId} as ${used ? 'used' : 'unused'}`);

      const updater = (item: BacklogItem) => ({ ...item, used });

      // Update main groups
      const { groups: updatedGroups, found } = updateItemInGroups(state.groups, itemId, updater);

      if (!found) {
        backlogLogger.warn(`Item ${itemId} not found for used status update`);
        return;
      }

      backlogLogger.debug(`Updated item ${itemId} used status: ${used}`);
      state.groups = updatedGroups;

      // Update cache as well
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
    // Clear API cache as well
    try {
      const { goatApi } = await import('@/lib/api');
      goatApi.invalidateCache({ tags: category ? [`category-${category}`] : ['groups'] });
    } catch (error) {
      backlogLogger.warn('Failed to invalidate API cache:', error);
    }

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

  // Get API cache performance stats
  getCoalescerStats: async () => {
    try {
      const { goatApi } = await import('@/lib/api');
      const metrics = goatApi.getCacheMetrics();
      return {
        stats: metrics,
        efficiency: {
          hitRate: metrics.hits / Math.max(1, metrics.hits + metrics.misses),
          savedRequests: metrics.hits,
        },
      };
    } catch (error) {
      backlogLogger.warn('Failed to get cache stats:', error);
      return null;
    }
  },

  // Reset cache stats (invalidate all cache)
  resetCoalescerStats: async () => {
    try {
      const { goatApi } = await import('@/lib/api');
      goatApi.invalidateCache({ all: true });
    } catch (error) {
      backlogLogger.warn('Failed to reset cache:', error);
    }
  },

  // Force refresh all data - clears cache and reloads from API
  forceRefreshAll: async (category?: string) => {
    backlogLogger.debug('Force refreshing all data...');
    
    // Clear all caches first
    await get().clearCache(category);
    
    // Clear state
    set(state => {
      state.groups = [];
      state.error = null;
      state.loadingProgress = {
        totalGroups: 0,
        loadedGroups: 0,
        isLoading: false,
        percentage: 0
      };
    });
    
    backlogLogger.info('Cache cleared. Data will be refetched on next request.');
  },

  // Debug helper to check image URLs in current data
  debugImageUrls: (limit: number = 10) => {
    const state = get();
    backlogLogger.debug('Debug: Checking image URLs in backlog store...');
    backlogLogger.debug(`Total groups: ${state.groups.length}`);
    
    let itemCount = 0;
    let withImage = 0;
    let withoutImage = 0;
    const samples: { name: string; image_url: string | null | undefined }[] = [];
    
    for (const group of state.groups) {
      if (!group.items) continue;
      for (const item of group.items) {
        itemCount++;
        if (item.image_url) {
          withImage++;
        } else {
          withoutImage++;
        }
        if (samples.length < limit) {
          samples.push({ name: item.name || item.title || 'Unknown', image_url: item.image_url });
        }
      }
    }
    
    backlogLogger.debug(`Total items: ${itemCount}`);
    backlogLogger.debug(`With image_url: ${withImage}`);
    backlogLogger.debug(`Without image_url: ${withoutImage}`);
    backlogLogger.debug('Sample items:', samples);
    
    return { itemCount, withImage, withoutImage, samples };
  }
});

export type UtilActions = ReturnType<typeof createUtilActions>;