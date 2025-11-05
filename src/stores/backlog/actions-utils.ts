import { BacklogState } from './types';
import { BacklogItem } from '@/types/backlog-groups';

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
  getItemById: (itemId: string): BacklogItem | null => {
    const state = get();
    console.log(`🔍 BacklogStore: Looking for item ${itemId} across ${state.groups.length} groups`);
    
    for (const group of state.groups) {
      if (group.items && Array.isArray(group.items)) {
        const item = group.items.find(item => item.id === itemId);
        if (item) {
          console.log(`✅ BacklogStore: Found item ${itemId} in group ${group.name}`);
          return item;
        }
      }
    }
    
    console.warn(`⚠️ BacklogStore: Item ${itemId} not found in any group`);
    return null;
  },

  // NEW: Mark item as used/unused
  markItemAsUsed: (itemId: string, used: boolean) => {
    set(state => {
      console.log(`🔄 BacklogStore: Marking item ${itemId} as ${used ? 'used' : 'unused'}`);
      
      let itemFound = false;
      const updatedGroups = state.groups.map(group => {
        if (group.items && Array.isArray(group.items)) {
          const updatedItems = group.items.map(item => {
            if (item.id === itemId) {
              itemFound = true;
              console.log(`✅ BacklogStore: Updated item ${itemId} used status: ${used}`);
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
        console.warn(`⚠️ BacklogStore: Item ${itemId} not found for used status update`);
        return;
      }
      
      state.groups = updatedGroups;
      
      // Update cache as well
      Object.keys(state.cache).forEach(cacheKey => {
        if (state.cache[cacheKey] && state.cache[cacheKey].groups) {
          const updatedCachedGroups = state.cache[cacheKey].groups.map(group => {
            if (group.items && Array.isArray(group.items)) {
              const updatedItems = group.items.map(item => {
                if (item.id === itemId) {
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
          
          state.cache[cacheKey].groups = updatedCachedGroups;
          state.cache[cacheKey].lastUpdated = Date.now();
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
  clearCache: () => {
    set(state => {
      state.cache = {};
      state.lastSyncTimestamp = 0;
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
  }
});

export type UtilActions = ReturnType<typeof createUtilActions>;