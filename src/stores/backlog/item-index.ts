import { BacklogGroup } from '@/types/backlog-groups';

/** Lightweight index: itemId → groupIndex in state.groups */
export type ItemIndex = Map<string, number>;

/** Rebuild the full item→groupIndex map from groups array */
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
