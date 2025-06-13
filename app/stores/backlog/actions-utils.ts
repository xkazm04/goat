import { BacklogItem } from '@/app/types/backlog-groups';
import { BacklogState } from './types';
import { StateCreator } from 'zustand';

export const createUtilActions = (
  set: StateCreator<BacklogState>['set'],
  get: () => BacklogState
) => ({
  // Selection actions
  selectGroup: (groupId: string | null) => set(state => {
    state.selectedGroupId = groupId;
  }),
  
  selectItem: (itemId: string | null) => set(state => {
    state.selectedItemId = itemId;
  }),
  
  setActiveItem: (itemId: string | null) => set(state => {
    state.activeItemId = itemId;
  }),
  
  // Search and filter
  setSearchTerm: (term: string) => set(state => {
    state.searchTerm = term;
  }),
  
  searchGroups: (term: string) => {
    const state = get();
    if (!term) return state.groups;
    
    const lowerTerm = term.toLowerCase();
    
    return state.groups.filter(group => {
      // Match group name or description
      if (
        group.name.toLowerCase().includes(lowerTerm) || 
        (group.description && group.description.toLowerCase().includes(lowerTerm))
      ) {
        return true;
      }
      
      // Match items within group
      if (group.items && group.items.length > 0) {
        return group.items.some(item => 
          (item.name && item.name.toLowerCase().includes(lowerTerm)) || 
          (item.title && item.title.toLowerCase().includes(lowerTerm)) ||
          (item.description && item.description.toLowerCase().includes(lowerTerm)) ||
          (item.tags && item.tags.some(tag => tag.toLowerCase().includes(lowerTerm)))
        );
      }
      
      return false;
    });
  },
  
  filterGroupsByCategory: (category: string, subcategory?: string) => {
    const groups = get().groups;
    
    // Handle the general -> sports mapping
    const categoriesToCheck = [category];
    if (category === 'general') {
      categoriesToCheck.push('sports');
    }
    
    console.log(`Filtering groups by categories: ${categoriesToCheck.join(', ')}, subcategory: ${subcategory || 'none'}`);
    
    return groups.filter(group => {
      const matchesCategory = categoriesToCheck.includes(group.category);
      const matchesSubcategory = !subcategory || group.subcategory === subcategory;
      return matchesCategory && matchesSubcategory;
    });
  },
  
  // Utilities
  clearCache: (category?: string) => {
    set(state => {
      if (category) {
        // Clear specific category
        Object.keys(state.cache).forEach(key => {
          if (key.startsWith(`${category}-`)) {
            delete state.cache[key];
          }
        });
      } else {
        // Clear all cache
        state.cache = {};
      }
    });
  },
  
  getGroupItems: (groupId: string) => {
    const state = get();
    const group = state.groups.find(g => g.id === groupId);
    return group?.items || [];
  },
  
  getItemById: (itemId: string) => {
    const groups = get().groups;
    
    if (!groups || groups.length === 0) {
      console.warn('No groups available to search for item');
      return null;
    }
    
    // Search through all groups for the item
    for (const group of groups) {
      if (group.items && group.items.length > 0) {
        const foundItem = group.items.find(item => item.id === itemId);
        if (foundItem) {
          // Log for debugging
          console.log(`🔍 Found item ${itemId} in group ${group.id}:`, {
            title: foundItem.title || foundItem.name,
            hasImageUrl: !!foundItem.image_url
          });
          return foundItem;
        }
      }
    }
    
    console.warn(`⚠️ Item ${itemId} not found in any group`);
    return null;
  },
  
  getMatchedItemsCount: () => {
    const state = get();
    let count = 0;
    
    // Count items marked as used
    for (const group of state.groups) {
      if (group.items) {
        count += group.items.filter(item => item.used).length;
      }
    }
    
    return count;
  },
  
  isItemUsed: (itemId: string) => {
    const state = get();
    
    // Check if item is marked as used in any group
    for (const group of state.groups) {
      if (group.items) {
        const item = group.items.find(item => item.id === itemId);
        if (item && item.used) {
          return true;
        }
      }
    }
    
    return false;
  }
});

export type UtilActions = ReturnType<typeof createUtilActions>;