/**
 * useTierLayout Hook
 * Extracts tier logic for position-aware smart grid layout
 */

import { useMemo, useCallback, useState } from 'react';
import {
  TierDefinition,
  TierId,
  DEFAULT_TIERS,
  getTierForPosition,
  getTierIdForPosition,
  isAtTierBoundary,
  adjustTiersForSize,
  getTierCSSProperties,
  getPositionStyle,
} from '../lib/tierConfig';
import { GridItemType } from '@/types/match';

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

  // Calculate tier statistics
  const tierStats = useMemo((): TierStats[] => {
    return tiers.map(tier => {
      const tierItems: Array<{ position: number; item: GridItemType }> = [];
      let filledSlots = 0;

      for (let pos = tier.range.start; pos < tier.range.end; pos++) {
        const item = gridItems[pos];
        if (item?.matched) {
          filledSlots++;
          tierItems.push({ position: pos, item });
        }
      }

      const totalSlots = tier.range.end - tier.range.start;
      const emptySlots = totalSlots - filledSlots;
      const fillPercentage = totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 0;

      return {
        tier,
        totalSlots,
        filledSlots,
        emptySlots,
        fillPercentage,
        items: tierItems,
      };
    });
  }, [tiers, gridItems]);

  // Overall fill percentage
  const overallFillPercentage = useMemo(() => {
    const totalFilled = tierStats.reduce((sum, stat) => sum + stat.filledSlots, 0);
    const totalSlots = tierStats.reduce((sum, stat) => sum + stat.totalSlots, 0);
    return totalSlots > 0 ? (totalFilled / totalSlots) * 100 : 0;
  }, [tierStats]);

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

  // Items grouped by tier
  const itemsByTier = useMemo(() => {
    const map = new Map<TierId, Array<{ position: number; item: GridItemType | null }>>();

    tiers.forEach(tier => {
      const items: Array<{ position: number; item: GridItemType | null }> = [];
      for (let pos = tier.range.start; pos < tier.range.end; pos++) {
        items.push({
          position: pos,
          item: gridItems[pos] || null,
        });
      }
      map.set(tier.id, items);
    });

    return map;
  }, [tiers, gridItems]);

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

export default useTierLayout;
