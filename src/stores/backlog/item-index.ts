import { backlogLogger } from '@/lib/logger';
import { BacklogGroup, BacklogItem } from '@/types/backlog-groups';

/** Lightweight index: itemId → groupIndex in state.groups */
export type ItemIndex = Map<string, number>;

/**
 * ## _itemIndex staleness contract
 *
 * `_itemIndex` maps `itemId → groupIndex` (position in `state.groups[]`) for O(1) lookups.
 * It is valid **only while the `groups` array identity is stable** — i.e. no reordering,
 * filtering, or full replacement has occurred without a corresponding `rebuildItemIndex` call.
 *
 * ### When to rebuild
 * - After any `state.groups = <newArray>` assignment (full replacement).
 * - After sorting or reordering `state.groups` in place.
 * - After rehydration from persistence storage.
 *
 * ### When incremental updates suffice
 * - Adding/removing a single item within an existing group (use `replaceGroupInIndex`
 *   or direct `index.set` / `index.delete`).
 * - Updating item properties without moving items between groups.
 *
 * ### Fallback behavior
 * All lookup sites (`getItemById`, `markItemAsUsed`, `isItemUsed`) have a linear-scan
 * fallback when the index misses. In dev mode, these fallbacks log a warning so
 * staleness can be detected and fixed.
 */

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

/**
 * Log a dev-mode warning when an index lookup misses and the linear-scan fallback fires.
 * This indicates the index is stale — a `rebuildItemIndex` call was likely missed after
 * a groups array replacement or reorder.
 *
 * No-op in production builds.
 */
export function warnIndexFallback(itemId: string, caller: string): void {
  if (process.env.NODE_ENV !== 'production') {
    backlogLogger.warn(
      `[_itemIndex stale] ${caller}: index miss for "${itemId}", falling back to linear scan. ` +
      `This means rebuildItemIndex() was not called after a groups array mutation.`
    );
  }
}
