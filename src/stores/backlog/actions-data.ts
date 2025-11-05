import { BacklogState } from './types';
import { BacklogItem } from '@/types/backlog-groups';

// Maximum number of groups to load at once
const MAX_CONCURRENT_LOADS = 30;

// Cache duration: 24 hours for development, can be adjusted for production
export const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Type for immer-compatible set function
type ImmerSet = (fn: (state: BacklogState) => void) => void;

export const createDataActions = (
  set: ImmerSet,
  get: () => BacklogState
) => ({
  // Initialize groups for a category - fetch from API if needed
  initializeGroups: async (category: string, subcategory?: string, forceRefresh = false) => {
    const apiCategory = category === 'general' ? 'sports' : category;
    const cacheKey = `${apiCategory}-${subcategory || ''}`;
    
    const state = get();
    const cachedData = state.cache[cacheKey];
    const now = Date.now();
    
    const hasValidCache = cachedData && 
                         Array.isArray(cachedData.groups) && 
                         cachedData.groups.length > 0 && 
                         now - cachedData.loadedAt < CACHE_DURATION;
    
    console.log(`🔍 BacklogStore: Initializing groups for ${cacheKey} (original: ${category})`);
    console.log(`🔍 Cache status: ${hasValidCache ? 'Valid' : 'Invalid or missing'}`);
    console.log(`🔍 Force refresh: ${forceRefresh}`);
    
    // Return early if we're in offline mode and don't have cached data
    if (state.isOfflineMode && !hasValidCache) {
      console.warn(`⚠️ BacklogStore: No cached data available for ${cacheKey} while offline`);
      set(state => {
        state.error = new Error('No cached data available while offline');
        state.isLoading = false;
        state.loadingProgress = { totalGroups: 0, loadedGroups: 0, isLoading: false, percentage: 0 };
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
        // Set progress to complete for cached data
        state.loadingProgress = {
          totalGroups: cachedData.groups.length,
          loadedGroups: cachedData.groups.filter(g => g.items && g.items.length > 0).length,
          isLoading: false,
          percentage: 100
        };
      });
      return;
    }
    
    // Check if we're in offline mode but have some cached data
    if (state.isOfflineMode && cachedData) {
      console.log(`📴 BacklogStore: Using cached data for ${cacheKey} in offline mode`);
      set(state => {
        state.groups = cachedData.groups;
        state.isLoading = false;
        state.loadingProgress = {
          totalGroups: cachedData.groups.length,
          loadedGroups: cachedData.groups.filter(g => g.items && g.items.length > 0).length,
          isLoading: false,
          percentage: 100
        };
      });
      return;
    }
    
    // We'll fetch fresh data - set loading state
    set(state => {
      state.isLoading = true;
      state.error = null;
      state.loadingProgress = { totalGroups: 0, loadedGroups: 0, isLoading: true, percentage: 0 };
    });
    
    try {
      console.log(`🔄 BacklogStore: Fetching groups for ${cacheKey}...`);
      
      // Import API dynamically to avoid SSR issues
      const { itemGroupsApi } = await import('@/lib/api/item-groups');
      
      let groups;
      try {
        // IMPROVED: Backend now handles filtering, so we get clean results
        groups = await itemGroupsApi.getGroupsByCategory(
          apiCategory, 
          subcategory, 
          undefined, // no search
          100, // higher limit
          1 // only groups with at least 1 item (handled by backend)
        );
        
        console.log(`✅ BacklogStore: Received ${groups.length} pre-filtered groups from backend`);
        
        // Sort groups by name (alphabetically)
        groups = groups.sort((a, b) => {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        
      } catch (error) {
        // If we get a 422 error for "general" category, we already tried sports as fallback
        if (apiCategory === 'sports' && category === 'general') {
          console.log('⚠️ Fallback failed for general category');
          throw error;
        } else {
          // Rethrow for other errors or categories
          throw error;
        }
      }
      
      console.log(`✅ BacklogStore: Fetched ${groups.length} groups, sorted alphabetically`);
      
      if (!Array.isArray(groups)) {
        throw new Error('API did not return an array of groups');
      }
      
      // Preserve any previously loaded items in groups
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

        // Initialize progress tracking with total groups known
        const loadedGroupsCount = groupsCopy.filter((g: any) => g.items && g.items.length > 0).length;
        state.loadingProgress = {
          totalGroups: groupsCopy.length,
          loadedGroups: loadedGroupsCount,
          isLoading: true, // Will be loading items progressively
          percentage: loadedGroupsCount > 0 ? Math.round((loadedGroupsCount / groupsCopy.length) * 100) : 0
        };
        
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
      
      // Start progressive loading of items for groups
      if (groups.length > 0) {
        // Don't wait for this to complete - start it in background
        get().startFastProgressiveLoading(groups);
      }
      
    } catch (error) {
      console.error('❌ BacklogStore: Failed to fetch groups:', error);
      set(state => {
        state.isLoading = false;
        state.error = error as Error;
        state.loadingProgress = { totalGroups: 0, loadedGroups: 0, isLoading: false, percentage: 0 };
        
        // If we have any cached data, fall back to it even if it's stale
        if (cachedData) {
          console.log('⚠️ BacklogStore: Falling back to cached data due to fetch error');
          state.groups = cachedData.groups;
          state.error = new Error(`Failed to fetch fresh data: ${(error as Error).message}. Using cached data.`);
        }
      });
    }
  },

  // NEW: Much faster progressive loading without artificial delays
  startFastProgressiveLoading: async (groups: any[]) => {
    const state = get();
    const cacheKey = groups.length > 0 ? `${groups[0].category}-${groups[0].subcategory || ''}` : null;
    const cachedData = cacheKey ? state.cache[cacheKey] : null;
    
    // Sort by name alphabetically
    const sortedGroups = [...groups].sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    console.log(`🚀 BacklogStore: Starting FAST progressive loading for ${sortedGroups.length} groups`);
    
    set(state => {
      state.loadingProgress.isLoading = true;
    });
    
    // Load in parallel batches of 6 for optimal performance
    const BATCH_SIZE = 6;
    const batches = [];
    for (let i = 0; i < sortedGroups.length; i += BATCH_SIZE) {
      batches.push(sortedGroups.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📦 Loading ${batches.length} batches of ${BATCH_SIZE} groups each`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // Load batch in parallel (no artificial delays!)
      const batchPromises = batch.map(async (group) => {
        if (cachedData && cachedData.loadedGroupIds.has(group.id)) {
          console.log(`⏭️ Batch ${batchIndex + 1}: Skipping ${group.name} - cached`);
          get().updateLoadingProgress();
          return;
        }
        
        console.log(`🔄 Batch ${batchIndex + 1}: Loading ${group.name}`);
        await get().loadGroupItems(group.id);
      });
      
      // Wait for entire batch to complete
      await Promise.allSettled(batchPromises);
      
      // Very small delay between batches only (50ms) - much faster!
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      console.log(`✅ Batch ${batchIndex + 1}/${batches.length} completed`);
    }
    
    set(state => {
      state.loadingProgress.isLoading = false;
      state.loadingProgress.percentage = 100;
    });
    
    console.log(`🎉 BacklogStore: FAST loading completed for all ${sortedGroups.length} groups`);
  },

  // Add progress update helper
  updateLoadingProgress: () => {
    set(state => {
      const totalGroups = state.loadingProgress.totalGroups;
      if (totalGroups === 0) return;
      
      const loadedGroups = state.groups.filter(g => g.items && g.items.length > 0).length;
      const percentage = Math.round((loadedGroups / totalGroups) * 100);
      
      state.loadingProgress = {
        ...state.loadingProgress,
        loadedGroups,
        percentage: Math.min(percentage, 100)
      };
    });
  },
  
  // OPTIMIZED: loadGroupItems with better error handling and no retries for empty groups
  loadGroupItems: async (groupId: string, forceRefresh = false) => {
    if (!groupId) return;

    const state = get();
    const group = state.groups.find(g => g.id === groupId);
    if (!group) {
      console.warn(`⚠️ BacklogStore: Group ${groupId} not found`);
      return;
    }
    
    // Skip if group has 0 items according to metadata
    if (!forceRefresh && group.item_count === 0) {
      console.log(`⏭️ BacklogStore: Skipping group ${groupId} - has 0 items`);
      get().updateLoadingProgress();
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
      get().updateLoadingProgress();
      return;
    }
    
    // Check cache for this specific group
    const cacheKey = `${group.category}-${group.subcategory || ''}`;
    const cachedData = state.cache[cacheKey];
    
    if (!forceRefresh && cachedData && cachedData.loadedGroupIds.has(groupId)) {
      console.log(`🔄 BacklogStore: Restoring ${groupId} items from cache`);
      
      // Find the cached group with items
      const cachedGroup = cachedData.groups.find(g => g.id === groupId);
      if (cachedGroup && cachedGroup.items && cachedGroup.items.length > 0) {
        // Update only this group with cached items without causing a full state refresh
        set(state => {
          const groupIndex = state.groups.findIndex(g => g.id === groupId);
          if (groupIndex !== -1) {
            // IMPORTANT: Only update the specific group, don't replace the entire array
            state.groups[groupIndex] = {
              ...state.groups[groupIndex],
              items: cachedGroup.items
            };
          }
        });
        
        get().updateLoadingProgress();
        return;
      }
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
      const { itemGroupsApi } = await import('@/lib/api/item-groups');
      const groupWithItems = await itemGroupsApi.getGroup(groupId, true);
      
      // Handle case where group is actually empty
      if (!groupWithItems.items || groupWithItems.items.length === 0) {
        console.log(`⚠️ BacklogStore: Group ${groupId} returned 0 items - updating metadata`);
        
        set(state => {
          const groupIndex = state.groups.findIndex(g => g.id === groupId);
          if (groupIndex !== -1) {
            state.groups[groupIndex] = {
              ...state.groups[groupIndex],
              items: [],
              item_count: 0
            };
          }
          state.loadingGroupIds.delete(groupId);
        });
        
        get().updateLoadingProgress();
        return;
      }
      
      console.log(`✅ BacklogStore: Fetched ${groupWithItems.items?.length || 0} items for group ${groupId}`);
      
      // Ensure we have proper image_url and title fields in each item
      const itemsWithImages = (groupWithItems.items || []).map(item => ({
        ...item,
        // Make sure each item has an image_url - use group image as fallback
        image_url: item.image_url || groupWithItems.image_url || null,
        // Ensure title field exists (use name as fallback)
        title: item.name || '',
        // Ensure tags array exists
        tags: [],
        // Ensure updated_at exists
        updated_at: item.created_at
      })) as BacklogItem[];
      
      // Log for debugging
      console.log(`📷 Adding ${itemsWithImages.length} items with images to group ${groupId}`);
      if (itemsWithImages.length > 0) {
        console.log(`📷 Sample item image_url: ${itemsWithImages[0].image_url || 'NONE'}`);
      }
      
      // CRITICAL: Update only the specific group without affecting others
      set(state => {
        const groupIndex = state.groups.findIndex(g => g.id === groupId);
        
        if (groupIndex !== -1) {
          // Create a new group object with items, but keep the rest of the array intact
          state.groups[groupIndex] = {
            ...state.groups[groupIndex],
            items: itemsWithImages,
            item_count: itemsWithImages.length
          };
          
          // Update cache for this specific group
          const cacheKey = `${group.category}-${group.subcategory || ''}`;
          if (state.cache[cacheKey]) {
            // Find and update the cached group
            const cachedGroupIndex = state.cache[cacheKey].groups.findIndex(g => g.id === groupId);
            if (cachedGroupIndex !== -1) {
              state.cache[cacheKey].groups[cachedGroupIndex] = {
                ...state.cache[cacheKey].groups[cachedGroupIndex],
                items: itemsWithImages,
                item_count: itemsWithImages.length
              };
            }
            
            // Mark as loaded
            state.cache[cacheKey].loadedGroupIds.add(groupId);
            state.cache[cacheKey].lastUpdated = Date.now();
          }
        }
        
        // Remove from loading state
        state.loadingGroupIds.delete(groupId);
      });
      
      // Update progress after successful load
      get().updateLoadingProgress();
      
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