import { useMemo, useRef } from 'react';

import { mapsEqual, arraysEqual, arrayMapsEqual } from '@/lib/utils/deep-equal';
import { BacklogItem } from '@/types/backlog-groups';
import { GridItemType } from '@/types/match';

import { TierListTier } from '../../lib/tierPresets';


interface TierItemGroupsInput {
  backlogItems: BacklogItem[];
  gridItems: GridItemType[];
  tierState: {
    tiers: Array<{
      id: string;
      label: string;
      displayName: string;
      description: string;
      color: TierListTier['color'];
      itemIds: string[];
      collapsed: boolean;
    }>;
    unrankedItemIds: string[];
  };
}

interface TierItemGroupsResult {
  itemsMap: Map<string, BacklogItem>;
  tiers: TierListTier[];
  unrankedItems: BacklogItem[];
  tierItemsMap: Map<string, BacklogItem[]>;
}

function tiersEqual(a: TierListTier[], b: TierListTier[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].items !== b[i].items || a[i].collapsed !== b[i].collapsed) return false;
  }
  return true;
}

/**
 * Hook that computes tier-item groupings from store state.
 * Stabilizes object references to avoid unnecessary re-renders.
 */
export function useTierItemGroups({
  backlogItems,
  gridItems,
  tierState,
}: TierItemGroupsInput): TierItemGroupsResult {
  const derivedRef = useRef<TierItemGroupsResult | null>(null);

  return useMemo(() => {
    // 1. Build itemsMap
    const newItemsMap = new Map<string, BacklogItem>();
    for (const item of backlogItems) {
      newItemsMap.set(item.id, item);
    }

    // 2. Convert store tiers to TierListTier format
    const newTiers: TierListTier[] = tierState.tiers.map(tier => ({
      id: tier.id,
      label: tier.label as TierListTier['label'],
      displayName: tier.displayName,
      description: tier.description,
      color: tier.color,
      items: tier.itemIds,
      collapsed: tier.collapsed,
    }));

    // 3. Build tierItemsMap AND collect all tiered IDs in a single pass
    const newTierItemsMap = new Map<string, BacklogItem[]>();
    const placedIds = new Set<string>();

    for (const tier of newTiers) {
      const tierItems: BacklogItem[] = [];
      for (const id of tier.items) {
        placedIds.add(id);
        const item = newItemsMap.get(id);
        if (item) tierItems.push(item);
      }
      newTierItemsMap.set(tier.id, tierItems);
    }

    // 4. Add unranked IDs to placed set
    for (const id of tierState.unrankedItemIds) {
      placedIds.add(id);
    }

    // 5. Add grid-used IDs to placed set
    for (const gridItem of gridItems) {
      if (gridItem.context.matched && gridItem.item?.id) {
        placedIds.add(gridItem.item.id);
      }
    }

    // 6. Build unranked items: explicit unranked from store + not-placed backlog items
    const newUnrankedItems: BacklogItem[] = [];
    for (const id of tierState.unrankedItemIds) {
      const item = newItemsMap.get(id);
      if (item) newUnrankedItems.push(item);
    }
    for (const item of backlogItems) {
      if (!placedIds.has(item.id)) {
        newUnrankedItems.push(item);
      }
    }

    // Stabilize references: only return new objects if data actually changed
    const prev = derivedRef.current;
    const stableItemsMap = prev && mapsEqual(prev.itemsMap, newItemsMap) ? prev.itemsMap : newItemsMap;
    const stableTiers = prev && tiersEqual(prev.tiers, newTiers) ? prev.tiers : newTiers;
    const stableUnranked = prev && arraysEqual(prev.unrankedItems, newUnrankedItems) ? prev.unrankedItems : newUnrankedItems;
    const stableTierItemsMap = prev && arrayMapsEqual(prev.tierItemsMap, newTierItemsMap) ? prev.tierItemsMap : newTierItemsMap;

    const result = {
      itemsMap: stableItemsMap,
      tiers: stableTiers,
      unrankedItems: stableUnranked,
      tierItemsMap: stableTierItemsMap,
    };
    derivedRef.current = result;
    return result;
  }, [backlogItems, tierState.tiers, tierState.unrankedItemIds, gridItems]);
}
