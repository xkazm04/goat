import { BacklogState } from './types';


// Maximum number of groups to load at once
const MAX_CONCURRENT_LOADS = 30;

// Cache duration: 24 hours for development, can be adjusted for production
export const CACHE_DURATION = 24 * 60 * 60 * 1000;

export const createDataActions = (
  set: (partial: BacklogState | Partial<BacklogState> | ((state: BacklogState) => BacklogState | Partial<BacklogState>), replace?: boolean) => void,
  get: () => BacklogState
) => ({
  // Initialize groups for a category - fetch from API if needed
  initializeGroups: async (category: string, subcategory?: string, forceRefresh = false) => {
    const cacheKey = `${category}-${subcategory || ''}`;
    const state = get();
    const cachedData = state.cache[cacheKey];
    const now = Date.now();
    
    // More robust cache validation with better logging
    const hasValidCache = cachedData && 
                         Array.isArray(cachedData.groups) && 
                         cachedData.groups.length > 0 && 
                         now - cachedData.loadedAt < CACHE_DURATION;
    
    // Improved logging
    console.log(`🔍 BacklogStore: Initializing groups for ${cacheKey}`);
    console.log(`🔍 Cache status: ${hasValidCache ? 'Valid' : 'Invalid or missing'}`);
    console.log(`🔍 Force refresh: ${forceRefresh}`);
    
    // Return early if we're in offline mode and don't have cached data
    if (state.isOfflineMode && !hasValidCache) {
      console.warn(`⚠️ BacklogStore: No cached data available for ${cacheKey} while offline`);
      set(state => {
        state.error = new Error('No cached data available while offline');
        state.isLoading = false;
      });
      return;
    }
    
    // Check if we have fresh cached data and not forcing refresh
    if (!forceRefresh && hasValidCache) {
      console.log(`🔄 BacklogStore: Using cached groups for ${cacheKey}, ${cachedData.groups.length} groups`);
      set(state => {
        state.groups = cachedData.groups;
        state.isLoading = false;
        state.error = null;
      });
      return;
    }
    
    // Check if we're in offline mode but have some cached data
    if (state.isOfflineMode && cachedData) {
      console.log(`📴 BacklogStore: Using cached data for ${cacheKey} in offline mode`);
      set(state => {
        state.groups = cachedData.groups;
        state.isLoading = false;
      });
      return;
    }
    
    // We'll fetch fresh data - set loading state
    set(state => {
      state.isLoading = true;
      state.error = null;
    });
    
    try {
      console.log(`🔄 BacklogStore: Fetching groups for ${cacheKey}...`);
      
      // Import API dynamically to avoid SSR issues
      const { itemGroupsApi } = await import('@/app/lib/api/item-groups');
      
      let groups;
      try {
        // Try with provided category
        groups = await itemGroupsApi.getGroupsByCategory(category, subcategory);
      } catch (error) {
        // If we get a 422 error for "general" category, try with "sports" as fallback
        if (category === 'general') {
          console.log('⚠️ Using "sports" as fallback for "general" category');
          groups = await itemGroupsApi.getGroupsByCategory('sports', subcategory);
        } else {
          // Rethrow for other errors or categories
          throw error;
        }
      }
      
      console.log(`✅ BacklogStore: Fetched ${groups.length} groups`);
      
      if (!Array.isArray(groups)) {
        throw new Error('API did not return an array of groups');
      }
      
      // Ensure we preserve any previously loaded items in groups
      if (hasValidCache) {
        const groupsById = new Map();
        
        // Index the new groups by ID
        groups.forEach(group => {
          groupsById.set(group.id, group);
        });
        
        // Copy over items from cache for groups that exist in both
        cachedData.groups.forEach(cachedGroup => {
          const newGroup = groupsById.get(cachedGroup.id);
          if (newGroup && cachedGroup.items && cachedGroup.items.length > 0) {
            newGroup.items = cachedGroup.items;
          }
        });
      }
      
      // Update state and cache
      set(state => {
        // Make a deep copy to avoid reference issues
        const groupsCopy = JSON.parse(JSON.stringify(groups));
        
        state.groups = groupsCopy;
        state.isLoading = false;
        
        // Update cache with current timestamp
        state.cache[cacheKey] = {
          groups: groupsCopy,
          loadedAt: now,
          loadedGroupIds: hasValidCache ? cachedData.loadedGroupIds : new Set<string>(),
          lastUpdated: now
        };
        
        // Also update the lastSyncTimestamp to track when data was refreshed
        state.lastSyncTimestamp = now;
      });
      
      // Load items for initial groups to improve UX, but only if not already loaded
      if (groups.length > 0) {
        const topGroups = [...groups]
          .sort((a, b) => (b.item_count || 0) - (a.item_count || 0))
          .slice(0, 5); // Reduce to 5 to minimize initial load time
        
        console.log(`🔍 BacklogStore: Prefetching items for ${topGroups.length} top groups`);
        
        // Load sequentially to reduce load
        for (const group of topGroups) {
          if (!hasValidCache || !cachedData.loadedGroupIds.has(group.id)) {
            await get().loadGroupItems(group.id);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ BacklogStore: Failed to fetch groups:', error);
      set(state => {
        state.isLoading = false;
        state.error = error as Error;
        
        // If we have any cached data, fall back to it even if it's stale
        if (cachedData) {
          console.log('⚠️ BacklogStore: Falling back to cached data due to fetch error');
          state.groups = cachedData.groups;
          state.error = new Error(`Failed to fetch fresh data: ${(error as Error).message}. Using cached data.`);
        }
      });
    }
  },
  
  // Load items for a specific group
  loadGroupItems: async (groupId: string, forceRefresh = false) => {
    if (!groupId) return;

    const state = get();
    const group = state.groups.find(g => g.id === groupId);
    if (!group) {
      console.warn(`⚠️ BacklogStore: Group ${groupId} not found`);
      return;
    }
    
    // Check if this group is already loading
    if (state.loadingGroupIds.has(groupId)) {
      console.log(`⏳ BacklogStore: Group ${groupId} is already loading, skipping duplicate request`);
      return;
    }
    
    // Check if items are already loaded in this group and not forcing refresh
    if (!forceRefresh && group.items && group.items.length > 0) {
      console.log(`✅ BacklogStore: Group ${groupId} already has ${group.items.length} items loaded`);
      return;
    }
    
    // Check if we're in offline mode
    if (state.isOfflineMode) {
      console.warn(`⚠️ BacklogStore: Cannot load new items in offline mode for group ${groupId}`);
      return;
    }
    
    // Need to fetch items - mark as loading first
    set(state => {
      state.loadingGroupIds.add(groupId);
    });
    
    try {
      console.log(`🔄 BacklogStore: Fetching items for group ${groupId}...`);
      
      // Import API dynamically to avoid SSR issues
      const { itemGroupsApi } = await import('@/app/lib/api/item-groups');
      const groupWithItems = await itemGroupsApi.getGroup(groupId, true);
      
      console.log(`✅ BacklogStore: Fetched ${groupWithItems.items?.length || 0} items for group ${groupId}`);
      
      // Make a deep copy of the current groups to avoid reference issues
      const currentGroups = JSON.parse(JSON.stringify(get().groups));
      
      // Find the group index in our current groups array
      const groupIndex = currentGroups.findIndex(g => g.id === groupId);
      
      if (groupIndex !== -1) {
        // Ensure we have proper image_url field in each item
        const itemsWithImages = (groupWithItems.items || []).map(item => ({
          ...item,
          // Make sure each item has an image_url - use group image as fallback
          image_url: item.image_url || groupWithItems.image_url || null
        }));
        
        // Log for debugging
        console.log(`📷 Adding ${itemsWithImages.length} items with images to group ${groupId}`);
        if (itemsWithImages.length > 0) {
          console.log(`📷 Sample item image_url: ${itemsWithImages[0].image_url || 'NONE'}`);
        }
        
        // Update only this specific group with items
        currentGroups[groupIndex].items = itemsWithImages;
        currentGroups[groupIndex].item_count = itemsWithImages.length;
        
        // Update state with the entire updated groups array
        set(state => {
          // Use the updated groups array
          state.groups = currentGroups;
          
          // Remove from loading state
          state.loadingGroupIds.delete(groupId);
          
          // Update cache for this specific group
          const cacheKey = `${group.category}-${group.subcategory || ''}`;
          if (state.cache[cacheKey]) {
            // Find the cached group
            const cachedGroups = JSON.parse(JSON.stringify(state.cache[cacheKey].groups));
            const cachedGroupIndex = cachedGroups.findIndex(g => g.id === groupId);
            
            if (cachedGroupIndex !== -1) {
              cachedGroups[cachedGroupIndex].items = itemsWithImages;
              cachedGroups[cachedGroupIndex].item_count = itemsWithImages.length;
            }
            
            // Update cache with new groups
            state.cache[cacheKey].groups = cachedGroups;
            
            // Mark as loaded
            state.cache[cacheKey].loadedGroupIds.add(groupId);
            state.cache[cacheKey].lastUpdated = Date.now();
          }
        });
      } else {
        // Group no longer exists in our array - this shouldn't happen
        console.error(`❌ BacklogStore: Group ${groupId} exists in API but not in local state`);
        
        // Remove from loading state
        set(state => {
          state.loadingGroupIds.delete(groupId);
        });
      }
      
    } catch (error) {
      console.error(`❌ BacklogStore: Failed to fetch items for group ${groupId}:`, error);
      
      // Remove from loading state
      set(state => {
        state.loadingGroupIds.delete(groupId);
      });
    }
  },
  
  // Load all group items for a category
  loadAllGroupItems: async (categoryFilter?: string) => {
    const state = get();
    const groupsToLoad = categoryFilter 
      ? state.groups.filter(g => g.category === categoryFilter)
      : state.groups;
      
    console.log(`🔄 BacklogStore: Loading all items for ${groupsToLoad.length} groups`);
    
    // Load in parallel batches
    for (let i = 0; i < groupsToLoad.length; i += MAX_CONCURRENT_LOADS) {
      const batch = groupsToLoad.slice(i, i + MAX_CONCURRENT_LOADS);
      await Promise.all(batch.map(group => get().loadGroupItems(group.id)));
      
      // Small delay between batches to not overload the system
      if (i + MAX_CONCURRENT_LOADS < groupsToLoad.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`✅ BacklogStore: Completed loading all group items`);
  },
  
  // Sync changes with backend
  syncWithBackend: async () => {
    const state = get();
    
    // Skip if offline
    if (state.isOfflineMode) {
      console.log(`📴 BacklogStore: Skipping sync while offline`);
      return;
    }
    
    // Process any pending changes
    await get().processPendingChanges();
    
    // Update lastSyncTimestamp
    set(state => {
      state.lastSyncTimestamp = Date.now();
    });
    
    console.log(`✅ BacklogStore: Sync completed at ${new Date().toLocaleString()}`);
  },
});

export type DataActions = ReturnType<typeof createDataActions>;