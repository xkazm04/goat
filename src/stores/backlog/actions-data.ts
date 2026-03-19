import { BacklogState, LoadingErrorType, LoadingError } from './types';
import { BacklogGroup, BacklogItem } from '@/types/backlog-groups';
import { backlogLogger } from '@/lib/logger';
import { rebuildItemIndex } from './item-index';
import { resolveApiCategory } from '@/lib/config/category-config';

/**
 * Classify an error into a structured type based on its characteristics.
 */
function classifyError(error: unknown): { type: LoadingErrorType; message: string } {
  if (!(error instanceof Error)) {
    return { type: 'unknown', message: String(error) };
  }

  const msg = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Network errors (fetch failures, DNS, CORS)
  if (name === 'typeerror' && msg.includes('fetch')) {
    return { type: 'network', message: error.message };
  }
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('net::') || msg.includes('cors')) {
    return { type: 'network', message: error.message };
  }

  // Timeout errors
  if (name === 'aborterror' || msg.includes('timeout') || msg.includes('aborted')) {
    return { type: 'timeout', message: error.message };
  }

  // Auth errors (401, 403)
  if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized') || msg.includes('forbidden')) {
    return { type: 'auth', message: error.message };
  }

  // Server errors (5xx)
  if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504') || msg.includes('server error')) {
    return { type: 'server', message: error.message };
  }

  // Data corruption / parse errors
  if (msg.includes('json') || msg.includes('parse') || msg.includes('unexpected token') || msg.includes('invalid')) {
    return { type: 'data', message: error.message };
  }

  return { type: 'unknown', message: error.message };
}

// Maximum number of groups to load at once
const MAX_CONCURRENT_LOADS = 30;

/** Count groups that have at least one item loaded. Used to initialize/recompute _loadedGroupsCount. */
export function countLoadedGroups(groups: { items?: unknown[] | null }[]): number {
  let count = 0;
  for (const g of groups) {
    if (g.items && g.items.length > 0) count++;
  }
  return count;
}

/**
 * Enrichment source definitions — maps categories to expected data sources.
 * These light up progressively during backlog loading to show data provenance.
 */
const ENRICHMENT_SOURCE_MAP: Record<string, Array<{ id: string; label: string }>> = {
  movies: [
    { id: 'tmdb', label: 'TMDB' },
    { id: 'wikipedia', label: 'Wikipedia' },
  ],
  tv: [
    { id: 'tmdb', label: 'TMDB' },
    { id: 'wikipedia', label: 'Wikipedia' },
  ],
  games: [
    { id: 'igdb', label: 'IGDB' },
    { id: 'wikipedia', label: 'Wikipedia' },
  ],
  music: [
    { id: 'spotify', label: 'Spotify' },
    { id: 'wikipedia', label: 'Wikipedia' },
  ],
  default: [
    { id: 'wikipedia', label: 'Wikipedia' },
  ],
};

function getSourcesForCategory(category: string): Array<{ id: string; label: string }> {
  const key = category.toLowerCase();
  return ENRICHMENT_SOURCE_MAP[key] || ENRICHMENT_SOURCE_MAP.default;
}

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
    const apiCategory = resolveApiCategory(category);
    // Use original category in cache key to avoid collision (e.g. "general"
    // resolves to "sports" for the API, but must not share "sports-" cache).
    const cacheKey = `${category}-${subcategory || ''}`;
    
    const state = get();
    const cachedData = state.cache[cacheKey];
    const now = Date.now();
    
    // Cache is valid only if groups exist, aren't expired, AND at least some items were loaded.
    // Without the items check, a session that cached group metadata but failed to load items
    // (e.g., due to a different error crashing the page) would serve empty groups forever.
    const hasLoadedItems = cachedData?.groups?.some((g: any) => g.items && g.items.length > 0) ?? false;
    const hasValidCache = cachedData &&
                         Array.isArray(cachedData.groups) &&
                         cachedData.groups.length > 0 &&
                         hasLoadedItems &&
                         now - cachedData.loadedAt < CACHE_DURATION;
    
    backlogLogger.debug(`Initializing groups for ${cacheKey} (original: ${category})`);
    backlogLogger.debug(`Cache status: ${hasValidCache ? 'Valid' : 'Invalid or missing'}`);
    backlogLogger.debug(`Force refresh: ${forceRefresh}`);
    
    // Return early if we're in offline mode and don't have cached data
    if (state.isOfflineMode && !hasValidCache) {
      backlogLogger.warn(`No cached data available for ${cacheKey} while offline`);
      set(state => {
        state.error = new Error('No cached data available while offline');
        state.isLoading = false;
        state.loadingProgress = { totalGroups: 0, loadedGroups: 0, isLoading: false, percentage: 0 };
      });
      return;
    }
    
    // Check if we have fresh cached data and not forcing refresh
    if (!forceRefresh && hasValidCache) {
      backlogLogger.debug(`Using cached groups for ${cacheKey}, ${cachedData.groups.length} groups`);
      set(state => {
        state.groups = cachedData.groups;
        state._itemIndex = rebuildItemIndex(cachedData.groups);
        state._loadedGroupsCount = countLoadedGroups(cachedData.groups);
        state.isLoading = false;
        state.error = null;
        // Set progress to complete for cached data
        state.loadingProgress = {
          totalGroups: cachedData.groups.length,
          loadedGroups: state._loadedGroupsCount,
          isLoading: false,
          percentage: 100
        };
      });
      return;
    }

    // Check if we're in offline mode but have some cached data
    if (state.isOfflineMode && cachedData) {
      backlogLogger.debug(`Using cached data for ${cacheKey} in offline mode`);
      set(state => {
        state.groups = cachedData.groups;
        state._itemIndex = rebuildItemIndex(cachedData.groups);
        state._loadedGroupsCount = countLoadedGroups(cachedData.groups);
        state.isLoading = false;
        state.loadingProgress = {
          totalGroups: cachedData.groups.length,
          loadedGroups: state._loadedGroupsCount,
          isLoading: false,
          percentage: 100
        };
      });
      return;
    }
    
    // We'll fetch fresh data - set loading state and bump generation to cancel any in-flight loader
    const sources = getSourcesForCategory(apiCategory);
    set(state => {
      state.isLoading = true;
      state.error = null;
      state.loadingErrors = [];
      state._loadingGeneration += 1;
      state.loadingProgress = { totalGroups: 0, loadedGroups: 0, isLoading: true, percentage: 0 };
      // Activate enrichment source badges
      state.enrichmentSources = {
        active: true,
        sources: sources.map(s => ({ ...s, status: 'pending' as const })),
      };
    });

    // Capture generation immediately after incrementing, BEFORE any async work.
    // Reading it later (after awaits) would race with another initializeGroups
    // call that bumps the generation during our fetch, causing both progressive
    // loaders to share the same generation and intermix items.
    const myGeneration = get()._loadingGeneration;
    
    try {
      backlogLogger.debug(`Fetching groups for ${cacheKey}...`);

      // Import goatApi with built-in request deduplication
      const { goatApi } = await import('@/lib/api');

      let groups;
      try {
        // GoatAPI has built-in request deduplication and caching
        groups = await goatApi.groups.getByCategory(
          apiCategory,
          {
            subcategory,
            limit: 100, // higher limit
            minItemCount: 1, // only groups with at least 1 item (handled by backend)
          }
        );
        
        backlogLogger.info(`Received ${groups.length} pre-filtered groups from backend`);
        
        // Sort groups by name (alphabetically)
        groups = groups.sort((a, b) => {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        
      } catch (error) {
        // If the resolved API category differs from the original (e.g.
        // "general" → "sports"), log a specific warning so it's traceable.
        if (apiCategory !== category) {
          backlogLogger.warn(`Fetch failed for resolved category "${apiCategory}" (original: "${category}")`);
        }
        throw error;
      }
      
      backlogLogger.info(`Fetched ${groups.length} groups, sorted alphabetically`);
      
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
        // Skip structuredClone — `groups` is a fresh array from the API that is not
        // referenced elsewhere.  Immer freezes the produced state, so external
        // mutation is impossible.  This avoids an O(n*m) deep-copy on every init.
        state.groups = groups as BacklogGroup[];
        // Only do a full rebuild if cache merge added items to groups;
        // otherwise start with an empty index — progressive loading fills it incrementally.
        state._itemIndex = hasValidCache
          ? rebuildItemIndex(groups as BacklogGroup[])
          : new Map();
        state.isLoading = false;

        // Initialize progress tracking with total groups known
        state._loadedGroupsCount = countLoadedGroups(groups as { items?: unknown[] | null }[]);
        state.loadingProgress = {
          totalGroups: groups.length,
          loadedGroups: state._loadedGroupsCount,
          isLoading: true, // Will be loading items progressively
          percentage: state._loadedGroupsCount > 0 ? Math.round((state._loadedGroupsCount / groups.length) * 100) : 0
        };

        // Update cache with current timestamp — shares group object references
        // with state.groups; both are updated together in progressive loading.
        state.cache[cacheKey] = {
          groups: groups as BacklogGroup[],
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
        // Use myGeneration captured before async work, not get()._loadingGeneration
        // which may have been bumped by a concurrent initializeGroups call
        get().startFastProgressiveLoading(groups, myGeneration);
      }
      
    } catch (error) {
      backlogLogger.error('Failed to fetch groups:', error);
      set(state => {
        state.isLoading = false;
        state.error = error as Error;
        state.loadingProgress = { totalGroups: 0, loadedGroups: 0, isLoading: false, percentage: 0 };
        // Deactivate enrichment sources on error
        state.enrichmentSources.active = false;

        // If we have any cached data, fall back to it even if it's stale
        if (cachedData) {
          backlogLogger.warn('Falling back to cached data due to fetch error');
          state.groups = cachedData.groups;
          state._itemIndex = rebuildItemIndex(cachedData.groups);
          state.error = new Error(`Failed to fetch fresh data: ${(error as Error).message}. Using cached data.`);
        }
      });
    }
  },

  // Bulk-fetch all group items in a single request (eliminates N+1 waterfall)
  startFastProgressiveLoading: async (groups: any[], generation?: number) => {
    const state = get();
    // If no generation passed (legacy call), snapshot the current one
    const myGeneration = generation ?? state._loadingGeneration;
    const cacheKey = groups.length > 0 ? `${groups[0].category}-${groups[0].subcategory || ''}` : null;
    const cachedData = cacheKey ? state.cache[cacheKey] : null;

    backlogLogger.debug(`Starting BULK loading for ${groups.length} groups (generation ${myGeneration})`);

    set(state => {
      state.loadingProgress.isLoading = true;
      // Activate all enrichment sources immediately since it's a single fetch
      for (const source of state.enrichmentSources.sources) {
        source.status = 'active';
      }
    });

    // Filter out groups that are already cached
    const groupsToFetch = groups.filter(group => {
      if (cachedData && cachedData.loadedGroupIds.has(group.id)) {
        return false;
      }
      // Also skip groups that already have items loaded in state
      const stateGroup = get().groups.find(g => g.id === group.id);
      if (stateGroup && stateGroup.items && stateGroup.items.length > 0) {
        return false;
      }
      return true;
    });

    if (groupsToFetch.length === 0) {
      backlogLogger.info('All groups already cached, skipping bulk fetch');
      if (get()._loadingGeneration === myGeneration) {
        set(state => {
          state.loadingProgress.isLoading = false;
          state.loadingProgress.percentage = 100;
          for (const source of state.enrichmentSources.sources) {
            source.status = 'done';
          }
          state.enrichmentSources.active = false;
        });
      }
      return;
    }

    backlogLogger.debug(`Fetching items for ${groupsToFetch.length} groups in single bulk request`);

    try {
      // Abort if generation changed
      if (get()._loadingGeneration !== myGeneration) {
        backlogLogger.info(`Bulk loading cancelled (generation ${myGeneration} superseded)`);
        return;
      }

      const { goatApi } = await import('@/lib/api');
      const groupIds = groupsToFetch.map((g: any) => g.id);
      const bulkItems = await goatApi.groups.getBulkItems(groupIds);

      // Abort if generation changed during fetch
      if (get()._loadingGeneration !== myGeneration) {
        backlogLogger.info(`Bulk loading cancelled after fetch (generation ${myGeneration} superseded)`);
        return;
      }

      // Build a lookup for group image_url fallbacks
      const groupImageMap = new Map<string, string>();
      for (const group of groups) {
        if (group.image_url) {
          groupImageMap.set(group.id, group.image_url);
        }
      }

      // Apply all items to state in a single update
      set(state => {
        // Re-check generation inside set() to prevent stale writes when user
        // rapidly switches categories (the outer check can pass but state may
        // have advanced by the time this callback executes).
        if (state._loadingGeneration !== myGeneration) {
          backlogLogger.info(`Bulk loading skipped stale write (generation ${myGeneration} superseded by ${state._loadingGeneration})`);
          return;
        }

        // Pre-build id→index maps to avoid O(n*m) findIndex inside the loop
        const groupIndexMap = new Map<string, number>();
        for (let i = 0; i < state.groups.length; i++) {
          groupIndexMap.set(state.groups[i].id, i);
        }
        const cachedGroups = cacheKey && state.cache[cacheKey] ? state.cache[cacheKey].groups : null;
        const cachedGroupIndexMap = new Map<string, number>();
        if (cachedGroups) {
          for (let i = 0; i < cachedGroups.length; i++) {
            cachedGroupIndexMap.set(cachedGroups[i].id, i);
          }
        }

        for (const group of groupsToFetch) {
          const groupIndex = groupIndexMap.get(group.id);
          if (groupIndex === undefined) continue;

          const rawItems = bulkItems[group.id] || [];
          const groupImageUrl = groupImageMap.get(group.id) || null;

          // Normalize items (same logic as loadGroupItems)
          const items = rawItems.map(item => {
            const raw = item as unknown as Record<string, unknown>;
            return {
              ...item,
              image_url: item.image_url || groupImageUrl || null,
              title: (raw.title as string) || item.name || '',
              tags: (raw.tags as string[]) ?? [],
              updated_at: (raw.updated_at as string) ?? item.created_at,
            };
          }) as BacklogItem[];

          // Track if this group was previously empty for counter maintenance
          const wasEmpty = !state.groups[groupIndex].items || state.groups[groupIndex].items.length === 0;

          // Update the group
          state.groups[groupIndex] = {
            ...state.groups[groupIndex],
            items,
            item_count: items.length,
          };

          // Maintain loaded groups counter incrementally
          if (wasEmpty && items.length > 0) {
            state._loadedGroupsCount++;
          }

          // Update item index
          for (const item of items) {
            state._itemIndex.set(item.id, groupIndex);
          }

          // Update cache
          if (cachedGroups && cacheKey) {
            const cachedGroupIndex = cachedGroupIndexMap.get(group.id);
            if (cachedGroupIndex !== undefined) {
              cachedGroups[cachedGroupIndex] = {
                ...cachedGroups[cachedGroupIndex],
                items,
                item_count: items.length,
              };
            }
            state.cache[cacheKey].loadedGroupIds.add(group.id);
            state.cache[cacheKey].lastUpdated = Date.now();
          }
        }

        // Update progress — counter was maintained incrementally above
        state.loadingProgress = {
          totalGroups: state.loadingProgress.totalGroups,
          loadedGroups: state._loadedGroupsCount,
          isLoading: false,
          percentage: 100,
        };

        // Mark all enrichment sources done
        for (const source of state.enrichmentSources.sources) {
          source.status = 'done';
        }
        state.enrichmentSources.active = false;
      });

      backlogLogger.info(`BULK loading completed for ${groupsToFetch.length} groups in single request`);

    } catch (error) {
      const classified = classifyError(error);
      backlogLogger.error(`Bulk loading failed [${classified.type}]:`, error);

      // Record a single error for the bulk operation
      set(state => {
        state.loadingErrors.push({
          groupId: 'bulk',
          groupName: 'Bulk items fetch',
          type: classified.type,
          message: classified.message,
          timestamp: Date.now(),
        });
      });

      // Fallback: try loading groups individually if bulk fails
      backlogLogger.info('Falling back to individual group loading...');
      for (const group of groupsToFetch) {
        if (get()._loadingGeneration !== myGeneration) break;
        try {
          await get().loadGroupItems(group.id);
        } catch {
          // Individual errors are already handled by loadGroupItems
        }
      }

      // Mark loading complete
      if (get()._loadingGeneration === myGeneration) {
        set(state => {
          state.loadingProgress.isLoading = false;
          state.loadingProgress.percentage = 100;
          for (const source of state.enrichmentSources.sources) {
            source.status = 'done';
          }
          state.enrichmentSources.active = false;
        });
      }
    }
  },

  // Add progress update helper
  updateLoadingProgress: () => {
    set(state => {
      const totalGroups = state.loadingProgress.totalGroups;
      if (totalGroups === 0) return;

      const percentage = Math.round((state._loadedGroupsCount / totalGroups) * 100);

      state.loadingProgress = {
        ...state.loadingProgress,
        loadedGroups: state._loadedGroupsCount,
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
      backlogLogger.warn(`Group ${groupId} not found`);
      return;
    }

    // Note: we no longer skip groups with item_count === 0 from metadata,
    // because the count can be stale or incorrect due to API query limits.
    // Always attempt to fetch — the actual response determines if empty.

    // Check if this group is already loading
    if (state.loadingGroupIds.has(groupId)) {
      backlogLogger.debug(`Group ${groupId} is already loading, skipping duplicate request`);
      return;
    }

    // Check if items are already loaded in this group and not forcing refresh
    if (!forceRefresh && group.items && group.items.length > 0) {
      backlogLogger.debug(`Group ${groupId} already has ${group.items.length} items loaded`);
      get().updateLoadingProgress();
      return;
    }

    // Check cache for this specific group
    const cacheKey = `${group.category}-${group.subcategory || ''}`;
    const cachedData = state.cache[cacheKey];

    if (!forceRefresh && cachedData && cachedData.loadedGroupIds.has(groupId)) {
      backlogLogger.debug(`Restoring ${groupId} items from cache`);
      
      // Find the cached group with items
      const cachedGroup = cachedData.groups.find(g => g.id === groupId);
      if (cachedGroup && cachedGroup.items && cachedGroup.items.length > 0) {
        // Update only this group with cached items without causing a full state refresh
        set(state => {
          const groupIndex = state.groups.findIndex(g => g.id === groupId);
          if (groupIndex !== -1) {
            const wasEmpty = !state.groups[groupIndex].items || state.groups[groupIndex].items.length === 0;
            // IMPORTANT: Only update the specific group, don't replace the entire array
            state.groups[groupIndex] = {
              ...state.groups[groupIndex],
              items: cachedGroup.items
            };
            if (wasEmpty) state._loadedGroupsCount++;
            // Update item index for newly loaded items
            for (const item of cachedGroup.items) {
              state._itemIndex.set(item.id, groupIndex);
            }
          }
        });
        
        get().updateLoadingProgress();
        return;
      }
    }
    
    // Check if we're in offline mode
    if (state.isOfflineMode) {
      backlogLogger.warn(`Cannot load new items in offline mode for group ${groupId}`);
      return;
    }
    
    // Need to fetch items - mark as loading first
    set(state => {
      state.loadingGroupIds.add(groupId);
    });

    try {
      backlogLogger.debug(`Fetching items for group ${groupId}...`);

      // Import goatApi with built-in request deduplication
      const { goatApi } = await import('@/lib/api');
      const groupWithItems = await goatApi.groups.get(groupId, true);

      // Handle case where group is actually empty
      if (!groupWithItems.items || groupWithItems.items.length === 0) {
        backlogLogger.warn(`Group ${groupId} returned 0 items - updating metadata`);

        set(state => {
          const groupIndex = state.groups.findIndex(g => g.id === groupId);
          if (groupIndex !== -1) {
            const hadItems = state.groups[groupIndex].items && state.groups[groupIndex].items.length > 0;
            state.groups[groupIndex] = {
              ...state.groups[groupIndex],
              items: [],
              item_count: 0
            };
            if (hadItems) state._loadedGroupsCount--;
          }
        });

        get().updateLoadingProgress();
        return;
      }

      backlogLogger.info(`Fetched ${groupWithItems.items?.length || 0} items for group ${groupId}`);

      // Ensure we have proper image_url and title fields in each item
      const itemsWithImages = (groupWithItems.items || []).map(item => {
        // Cast to access fields that may exist in API response but not in GroupItem type
        const raw = item as unknown as Record<string, unknown>;
        return {
          ...item,
          // Make sure each item has an image_url - use group image as fallback
          image_url: item.image_url || groupWithItems.image_url || null,
          // Ensure title field exists (use name as fallback)
          title: (raw.title as string) || item.name || '',
          // Ensure tags array exists (preserve API data, fallback to empty)
          tags: (raw.tags as string[]) ?? [],
          // Ensure updated_at exists (preserve API data, fallback to created_at)
          updated_at: (raw.updated_at as string) ?? item.created_at
        };
      }) as BacklogItem[];

      // Log for debugging
      backlogLogger.debug(`Adding ${itemsWithImages.length} items with images to group ${groupId}`);
      if (itemsWithImages.length > 0) {
        backlogLogger.debug(`Sample item image_url: ${itemsWithImages[0].image_url || 'NONE'}`);
      }

      // CRITICAL: Update only the specific group without affecting others
      set(state => {
        const groupIndex = state.groups.findIndex(g => g.id === groupId);

        if (groupIndex !== -1) {
          // Maintain loaded groups counter
          const wasEmpty = !state.groups[groupIndex].items || state.groups[groupIndex].items.length === 0;
          if (wasEmpty && itemsWithImages.length > 0) {
            state._loadedGroupsCount++;
          }

          // Create a new group object with items, but keep the rest of the array intact
          state.groups[groupIndex] = {
            ...state.groups[groupIndex],
            items: itemsWithImages,
            item_count: itemsWithImages.length
          };

          // Update item index for newly loaded items
          for (const item of itemsWithImages) {
            state._itemIndex.set(item.id, groupIndex);
          }

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
      });

      // Update progress after successful load
      get().updateLoadingProgress();

    } catch (error) {
      const classified = classifyError(error);
      backlogLogger.error(`Failed to fetch items for group ${groupId} [${classified.type}]:`, error);

      set(state => {
        state.loadingErrors.push({
          groupId,
          groupName: group.name || groupId,
          type: classified.type,
          message: classified.message,
          timestamp: Date.now(),
        });
      });
    } finally {
      // Always remove from loading state to prevent stale loadingGroupIds leak
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
      
    backlogLogger.debug(`Loading all items for ${groupsToLoad.length} groups`);
    
    // Load in parallel batches
    for (let i = 0; i < groupsToLoad.length; i += MAX_CONCURRENT_LOADS) {
      const batch = groupsToLoad.slice(i, i + MAX_CONCURRENT_LOADS);
      await Promise.all(batch.map(group => get().loadGroupItems(group.id)));
      
      // Small delay between batches to not overload the system
      if (i + MAX_CONCURRENT_LOADS < groupsToLoad.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    backlogLogger.info(`Completed loading all group items`);
  },
  
  // Clear accumulated loading errors
  clearLoadingErrors: () => {
    set(state => {
      state.loadingErrors = [];
    });
  },

  // Retry loading for all groups that previously failed
  retryFailedGroups: async () => {
    const state = get();
    const failedGroupIds = state.loadingErrors.map(e => e.groupId);
    if (failedGroupIds.length === 0) return;

    backlogLogger.info(`Retrying ${failedGroupIds.length} failed groups`);

    // Clear errors before retry
    set(state => {
      state.loadingErrors = [];
    });

    // Load failed groups in parallel
    await Promise.allSettled(
      failedGroupIds.map(groupId => get().loadGroupItems(groupId, true))
    );

    const remaining = get().loadingErrors.length;
    if (remaining > 0) {
      backlogLogger.warn(`${remaining} groups still failing after retry`);
    } else {
      backlogLogger.info('All previously failed groups loaded successfully');
    }
  },

  // Sync changes with backend
  syncWithBackend: async () => {
    const state = get();
    
    // Skip if offline
    if (state.isOfflineMode) {
      backlogLogger.debug(`Skipping sync while offline`);
      return;
    }
    
    // Process any pending changes
    await get().processPendingChanges();
    
    // Update lastSyncTimestamp
    set(state => {
      state.lastSyncTimestamp = Date.now();
    });
    
    backlogLogger.info(`Sync completed at ${new Date().toLocaleString()}`);
  },
});

export type DataActions = ReturnType<typeof createDataActions>;