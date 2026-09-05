import { backlogLogger } from '@/lib/logger';

import { rebuildItemIndex } from './item-index';
import { BacklogState } from "./types";

// Type for immer-compatible set function
type ImmerSet = (fn: (state: BacklogState) => void) => void;

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

  // NEW: Get item by ID across all groups
  getItemById: (itemId: string) => {
    const state = get();
    backlogLogger.debug(`Looking for item ${itemId} across ${state.groups.length} groups`);
    
    for (const group of state.groups) {
      if (group.items && Array.isArray(group.items)) {
        const item = group.items.find(item => item.id === itemId);
        if (item) {
          backlogLogger.debug(`Found item ${itemId} in group ${group.name}`);
          return item;
        }
      }
    }
    
    backlogLogger.warn(`Item ${itemId} not found in any group`);
    return null;
  },

  // NEW: Mark item as used/unused
  markItemAsUsed: (itemId: string, used: boolean) => {
    set(state => {
      backlogLogger.debug(`Marking item ${itemId} as ${used ? 'used' : 'unused'}`);
      
      let itemFound = false;
      const updatedGroups = state.groups.map(group => {
        if (group.items && Array.isArray(group.items)) {
          const updatedItems = group.items.map(item => {
            if (item.id === itemId) {
              itemFound = true;
              backlogLogger.debug(`Updated item ${itemId} used status: ${used}`);
              return { ...item, used };
            }
            return item;
          });
          
          if (updatedItems !== group.items) {
            return { ...group, items: updatedItems };
          }
        }
        return group;
      });
      
      if (!itemFound) {
        backlogLogger.warn(`Item ${itemId} not found for used status update`);
        return;
      }
      
      state.groups = updatedGroups;
      // Rebuild index after full groups array replacement to prevent staleness
      state._itemIndex = rebuildItemIndex(updatedGroups);

      // Update all cache entries that contain groups affected by this mutation.
      // Filter to only groups matching each cache key's category/subcategory
      // to avoid storing unrelated cross-category groups in a cache entry.
      for (const cacheKey of Object.keys(state.cache)) {
        const cacheEntry = state.cache[cacheKey];
        if (!cacheEntry?.groups) continue;

        const hadGroup = cacheEntry.groups.some(g => g.items?.some(i => i.id === itemId));
        if (hadGroup) {
          const [cat, subcat] = cacheKey.split('-');
          cacheEntry.groups = updatedGroups.filter(
            g => g.category === cat && (g.subcategory || '') === (subcat || '')
          );
          cacheEntry.lastUpdated = Date.now();
        }
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
      state._loadedGroupsCount = 0;
      state.selectedGroupId = null;
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
  }
});