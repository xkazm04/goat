import type { BacklogCache, BacklogState } from './types';
import type { BacklogGroup } from '@/types/backlog-groups';

/**
 * Update a specific group across all cache entries.
 *
 * Iterates every cache key, applies `updateFn` to the group whose id matches
 * `groupId`, bumps `lastUpdated`, and optionally marks the group as loaded.
 *
 * Must be called inside an immer `set()` block so mutations are draft-safe.
 */
export function updateGroupInAllCaches(
  cache: BacklogCache,
  groupId: string,
  updateFn: (group: BacklogGroup) => BacklogGroup,
  options: { markLoaded?: boolean } = { markLoaded: true }
): void {
  for (const cacheKey of Object.keys(cache)) {
    const entry = cache[cacheKey];
    if (!entry?.groups) continue;

    entry.groups = entry.groups.map(group =>
      group.id === groupId ? updateFn(group) : group
    );
    entry.lastUpdated = Date.now();
    if (options.markLoaded) {
      entry.loadedGroupIds.add(groupId);
    }
  }
}

/**
 * Sync the matching cache entry's groups array directly from state.groups.
 *
 * Instead of independently re-iterating cache groups to apply the same mutation,
 * this copies state.groups (already mutated) into the matching cache entry.
 * Eliminates O(cache_keys * groups * items) redundant work.
 *
 * Determines the correct cache key from the target group's category.
 * Must be called inside an immer `set()` block.
 */
export function syncCacheFromGroups(state: BacklogState, groupId: string): void {
  // Find the group to determine its cache key
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return;

  const cacheKey = `${group.category}-${group.subcategory || ''}`;
  const entry = state.cache[cacheKey];
  if (!entry) return;

  // Point cache.groups directly at state.groups (Immer handles immutability)
  entry.groups = state.groups;
  entry.lastUpdated = Date.now();
}
