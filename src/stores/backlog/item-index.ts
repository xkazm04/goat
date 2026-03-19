import { BacklogGroup, BacklogItem } from '@/types/backlog-groups';

/** Lightweight index: itemId → groupIndex in state.groups */
export type ItemIndex = Map<string, number>;

/** Rebuild the full item→groupIndex map from groups array.
 *  Use only during hydration / full group replacement. Prefer incremental helpers elsewhere. */
export function rebuildItemIndex(groups: BacklogGroup[]): ItemIndex {
  const index: ItemIndex = new Map();
  for (let gi = 0; gi < groups.length; gi++) {
    const items = groups[gi].items;
    if (!items) continue;
    for (let ii = 0; ii < items.length; ii++) {
      index.set(items[ii].id, gi);
    }
  }
  return index;
}

/**
 * Incrementally update the index for a single group whose items changed.
 * Removes old item entries and adds new ones — O(oldItems + newItems) instead of O(allItems).
 */
export function replaceGroupInIndex(
  index: ItemIndex,
  groupIndex: number,
  oldItems: BacklogItem[] | undefined,
  newItems: BacklogItem[]
): void {
  // Remove old entries
  if (oldItems) {
    for (let i = 0; i < oldItems.length; i++) {
      index.delete(oldItems[i].id);
    }
  }
  // Add new entries
  for (let i = 0; i < newItems.length; i++) {
    index.set(newItems[i].id, groupIndex);
  }
}
