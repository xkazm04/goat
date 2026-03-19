/**
 * useTierLayout Hook
 * Extracts tier logic for position-aware smart grid layout
 */

import { useMemo, useCallback, useState, useRef } from 'react';

import { GridItemType } from '@/types/match';

import {
  TierDefinition,
  TierId,
  getTierForPosition,
  getTierIdForPosition,
  isAtTierBoundary,
  adjustTiersForSize,
  getTierCSSProperties,
  getPositionStyle,
} from '../lib/tierConfig';

/**
 * Tier statistics for a single tier
 */
interface TierStats {
  tier: TierDefinition;
  totalSlots: number;
  filledSlots: number;
  emptySlots: number;
  fillPercentage: number;
  items: Array<{ position: number; item: GridItemType }>;
}

/**
 * Collapsed state for tiers
 */
type TierCollapsedState = Record<TierId, boolean>;

/**
 * Return type for useTierLayout hook
 */
interface UseTierLayoutReturn {
  /** All tier definitions adjusted for current list size */
  tiers: TierDefinition[];

  /** Get tier for a specific position */
  getTier: (position: number) => TierDefinition | null;

  /** Get tier ID for a specific position */
  getTierId: (position: number) => TierId | null;

  /** Check if position is at tier boundary */
  isBoundary: (position: number) => boolean;

  /** Get CSS custom properties for a tier */
  getCSSProperties: (tier: TierDefinition) => Record<string, string>;

  /** Get position-specific styling */
  getPositionStyling: (position: number) => ReturnType<typeof getPositionStyle>;

  /** Statistics for each tier */
  tierStats: TierStats[];

  /** Overall fill percentage */
  overallFillPercentage: number;

  /** Collapsed state management */
  collapsedTiers: TierCollapsedState;
  toggleTierCollapsed: (tierId: TierId) => void;
  setTierCollapsed: (tierId: TierId, collapsed: boolean) => void;
  collapseAll: () => void;
  expandAll: () => void;

  /** Items grouped by tier */
  itemsByTier: Map<TierId, Array<{ position: number; item: GridItemType | null }>>;

  /** Check if an item is crossing tier boundaries (for animation) */
  isCrossingTier: (fromPosition: number, toPosition: number) => boolean;

  /** Get the target tier when moving to a position */
  getTargetTier: (position: number) => TierDefinition | null;
}

/**
 * Hook for managing tier-based grid layout
 */
export function useTierLayout(
  gridItems: GridItemType[],
  listSize: number = 50
): UseTierLayoutReturn {
  // Adjust tiers based on list size
  const tiers = useMemo(() => adjustTiersForSize(listSize), [listSize]);

  // Collapsed state for each tier
  const [collapsedTiers, setCollapsedTiers] = useState<TierCollapsedState>(() => {
    const initial: TierCollapsedState = {} as TierCollapsedState;
    tiers.forEach(tier => {
      initial[tier.id] = false;
    });
    return initial;
  });

  // Get tier for position
  const getTier = useCallback(
    (position: number) => getTierForPosition(position, tiers),
    [tiers]
  );

  // Get tier ID for position
  const getTierId = useCallback(
    (position: number) => getTierIdForPosition(position, tiers),
    [tiers]
  );

  // Check boundary
  const isBoundary = useCallback(
    (position: number) => isAtTierBoundary(position, tiers),
    [tiers]
  );

  // Get CSS properties
  const getCSSProperties = useCallback(
    (tier: TierDefinition) => getTierCSSProperties(tier),
    []
  );

  // Get position styling
  const getPositionStyling = useCallback(
    (position: number) => getPositionStyle(position),
    []
  );

  // Ref to stabilize references when data hasn't changed
  const derivedRef = useRef<{
    tierStats: TierStats[];
    overallFillPercentage: number;
    itemsByTier: Map<TierId, Array<{ position: number; item: GridItemType | null }>>;
  } | null>(null);

  // Single-pass computation of tierStats, overallFillPercentage, and itemsByTier
  const { tierStats, overallFillPercentage, itemsByTier } = useMemo(() => {
    const newTierStats: TierStats[] = [];
    const newItemsByTier = new Map<TierId, Array<{ position: number; item: GridItemType | null }>>();
    let totalFilled = 0;
    let totalSlots = 0;

    for (const tier of tiers) {
      const tierItems: Array<{ position: number; item: GridItemType }> = [];
      const allPositionItems: Array<{ position: number; item: GridItemType | null }> = [];
      let filledSlots = 0;
      const slotCount = tier.range.end - tier.range.start;

      for (let pos = tier.range.start; pos < tier.range.end; pos++) {
        const item = gridItems[pos] || null;
        allPositionItems.push({ position: pos, item });
        if (item?.matched) {
          filledSlots++;
          tierItems.push({ position: pos, item });
        }
      }

      const emptySlots = slotCount - filledSlots;
      const fillPercentage = slotCount > 0 ? (filledSlots / slotCount) * 100 : 0;

      newTierStats.push({
        tier,
        totalSlots: slotCount,
        filledSlots,
        emptySlots,
        fillPercentage,
        items: tierItems,
      });

      newItemsByTier.set(tier.id, allPositionItems);
      totalFilled += filledSlots;
      totalSlots += slotCount;
    }

    const newOverallFill = totalSlots > 0 ? (totalFilled / totalSlots) * 100 : 0;

    // Stabilize references
    const prev = derivedRef.current;
    const stableTierStats = prev && tierStatsEqual(prev.tierStats, newTierStats) ? prev.tierStats : newTierStats;
    const stableOverall = prev ? prev.overallFillPercentage === newOverallFill ? prev.overallFillPercentage : newOverallFill : newOverallFill;
    const stableItemsByTier = prev && itemsByTierEqual(prev.itemsByTier, newItemsByTier) ? prev.itemsByTier : newItemsByTier;

    const result = {
      tierStats: stableTierStats,
      overallFillPercentage: stableOverall,
      itemsByTier: stableItemsByTier,
    };
    derivedRef.current = result;
    return result;
  }, [tiers, gridItems]);

  // Toggle tier collapsed
  const toggleTierCollapsed = useCallback((tierId: TierId) => {
    setCollapsedTiers(prev => ({
      ...prev,
      [tierId]: !prev[tierId],
    }));
  }, []);

  // Set tier collapsed
  const setTierCollapsed = useCallback((tierId: TierId, collapsed: boolean) => {
    setCollapsedTiers(prev => ({
      ...prev,
      [tierId]: collapsed,
    }));
  }, []);

  // Collapse all tiers
  const collapseAll = useCallback(() => {
    setCollapsedTiers(prev => {
      const next = { ...prev };
      tiers.forEach(tier => {
        if (tier.layout.collapsible) {
          next[tier.id] = true;
        }
      });
      return next;
    });
  }, [tiers]);

  // Expand all tiers
  const expandAll = useCallback(() => {
    setCollapsedTiers(prev => {
      const next = { ...prev };
      tiers.forEach(tier => {
        next[tier.id] = false;
      });
      return next;
    });
  }, [tiers]);

  // Check if crossing tier boundary
  const isCrossingTier = useCallback(
    (fromPosition: number, toPosition: number): boolean => {
      const fromTier = getTierId(fromPosition);
      const toTier = getTierId(toPosition);
      return fromTier !== null && toTier !== null && fromTier !== toTier;
    },
    [getTierId]
  );

  // Get target tier when moving
  const getTargetTier = useCallback(
    (position: number): TierDefinition | null => {
      return getTier(position);
    },
    [getTier]
  );

  return {
    tiers,
    getTier,
    getTierId,
    isBoundary,
    getCSSProperties,
    getPositionStyling,
    tierStats,
    overallFillPercentage,
    collapsedTiers,
    toggleTierCollapsed,
    setTierCollapsed,
    collapseAll,
    expandAll,
    itemsByTier,
    isCrossingTier,
    getTargetTier,
  };
}

/**
 * Hook for individual slot tier awareness
 */
export function useTierSlot(
  position: number,
  listSize: number = 50
): {
  tier: TierDefinition | null;
  tierId: TierId | null;
  isBoundary: boolean;
  positionStyle: ReturnType<typeof getPositionStyle>;
  cssProperties: Record<string, string>;
} {
  const tiers = useMemo(() => adjustTiersForSize(listSize), [listSize]);

  const tier = useMemo(() => getTierForPosition(position, tiers), [position, tiers]);
  const tierId = useMemo(() => getTierIdForPosition(position, tiers), [position, tiers]);
  const isBoundary = useMemo(() => isAtTierBoundary(position, tiers), [position, tiers]);
  const positionStyle = useMemo(() => getPositionStyle(position), [position]);
  const cssProperties = useMemo(
    () => (tier ? getTierCSSProperties(tier) : {}),
    [tier]
  );

  return {
    tier,
    tierId,
    isBoundary,
    positionStyle,
    cssProperties,
  };
}

// Reference-stability helpers
function tierStatsEqual(a: TierStats[], b: TierStats[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].filledSlots !== b[i].filledSlots || a[i].totalSlots !== b[i].totalSlots) return false;
    if (a[i].items.length !== b[i].items.length) return false;
    for (let j = 0; j < a[i].items.length; j++) {
      if (a[i].items[j].position !== b[i].items[j].position || a[i].items[j].item !== b[i].items[j].item) return false;
    }
  }
  return true;
}

function itemsByTierEqual(
  a: Map<TierId, Array<{ position: number; item: GridItemType | null }>>,
  b: Map<TierId, Array<{ position: number; item: GridItemType | null }>>
): boolean {
  if (a.size !== b.size) return false;
  let equal = true;
  a.forEach((aItems, key) => {
    if (!equal) return;
    const bItems = b.get(key);
    if (!bItems || aItems.length !== bItems.length) { equal = false; return; }
    for (let i = 0; i < aItems.length; i++) {
      if (aItems[i].position !== bItems[i].position || aItems[i].item !== bItems[i].item) { equal = false; return; }
    }
  });
  return equal;
}

export default useTierLayout;
