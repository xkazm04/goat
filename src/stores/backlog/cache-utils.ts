import type { BacklogCache } from './types';
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
