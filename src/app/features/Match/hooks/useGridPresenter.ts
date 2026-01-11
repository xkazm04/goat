import { useMemo } from 'react';
import { useGridStore } from '@/stores/grid-store';
import { GridItemType } from '@/types/match';
import {
  getRankConfig,
  getRankColor,
  isPodiumPosition,
  getConfettiColors,
  RankConfig,
} from '../lib/rankConfig';
import {
  getSizeForPosition,
  getSizeClasses,
  getGridLayoutClasses,
  GridItemSize,
  SizeClasses,
} from '../MatchGrid/lib/sizeMapping';

/**
 * Grid section types for layout organization
 */
export type GridSection = 'podium' | 'mid' | 'remaining';

/**
 * Enriched grid slot data with pre-computed rendering information
 */
export interface GridSlotPresentation {
  position: number;
  gridItem: GridItemType;
  isOccupied: boolean;
  isPodium: boolean;
  size: GridItemSize;
  sizeClasses: SizeClasses;
  rankConfig: RankConfig;
  rankColor: string;
  confettiColors: readonly string[];
}

/**
 * Section presentation data with layout configuration
 */
export interface GridSectionPresentation {
  type: GridSection;
  title: string;
  slots: GridSlotPresentation[];
  layoutClasses: {
    gridCols: string;
    gap: string;
    containerClass: string;
  };
  isVisible: boolean;
}

/**
 * Complete grid presentation state
 */
export interface GridPresentation {
  sections: GridSectionPresentation[];
  statistics: {
    filled: number;
    empty: number;
    total: number;
    percentage: number;
    isComplete: boolean;
  };
  allSlots: GridSlotPresentation[];
  podiumSlots: GridSlotPresentation[];
  midSlots: GridSlotPresentation[];
  remainingSlots: GridSlotPresentation[];
}

/**
 * Create presentation data for a single grid slot
 */
function createSlotPresentation(
  gridItem: GridItemType,
  position: number
): GridSlotPresentation {
  const size = getSizeForPosition(position);

  return {
    position,
    gridItem,
    isOccupied: gridItem.matched,
    isPodium: isPodiumPosition(position),
    size,
    sizeClasses: getSizeClasses(size),
    rankConfig: getRankConfig(position),
    rankColor: getRankColor(position),
    confettiColors: getConfettiColors(position),
  };
}

/**
 * useGridPresenter Hook
 *
 * Aggregates and memoizes all grid rendering data to provide a single source of truth
 * for grid components. This prevents prop drilling and unnecessary re-renders by
 * computing all presentation logic in one place.
 *
 * Features:
 * - Pre-computed sections (podium, mid, remaining) with layout classes
 * - Memoized slot presentations with rank config, size classes, colors
 * - Grid statistics (filled, empty, total, percentage, isComplete)
 * - Filtered views for different grid sections
 *
 * @param maxItems - Maximum number of items to display in the grid
 * @returns GridPresentation - Complete presentation state for the grid
 */
export function useGridPresenter(maxItems: number): GridPresentation {
  const gridItems = useGridStore((state) => state.gridItems);

  return useMemo(() => {
    // Ensure we have valid grid items up to maxItems
    const validGridItems = gridItems.slice(0, maxItems);

    // Create presentation data for all slots
    const allSlots = validGridItems.map((item, index) =>
      createSlotPresentation(item, index)
    );

    // Calculate statistics
    const filled = allSlots.filter((slot) => slot.isOccupied).length;
    const total = maxItems;
    const empty = total - filled;
    const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;

    const statistics = {
      filled,
      empty,
      total,
      percentage,
      isComplete: filled === total,
    };

    // Split into sections
    const podiumSlots = allSlots.slice(0, Math.min(3, maxItems));
    const midSlots = maxItems >= 4 ? allSlots.slice(3, Math.min(10, maxItems)) : [];
    const remainingSlots = maxItems > 10 ? allSlots.slice(10, maxItems) : [];

    // Create section presentations
    const sections: GridSectionPresentation[] = [];

    // Podium section (positions 1-3)
    if (maxItems >= 3) {
      sections.push({
        type: 'podium',
        title: 'Top 3',
        slots: podiumSlots,
        layoutClasses: getGridLayoutClasses('top3'),
        isVisible: true,
      });
    }

    // Mid section (positions 4-10)
    if (maxItems >= 4) {
      sections.push({
        type: 'mid',
        title: `Positions 4-${Math.min(10, maxItems)}`,
        slots: midSlots,
        layoutClasses: getGridLayoutClasses('mid'),
        isVisible: midSlots.length > 0,
      });
    }

    // Remaining section (positions 11+)
    if (maxItems > 10) {
      // Split remaining into sub-sections for better organization
      const positions11to20 = allSlots.slice(10, Math.min(20, maxItems));
      const positions21plus = maxItems > 20 ? allSlots.slice(20, maxItems) : [];

      if (positions11to20.length > 0) {
        sections.push({
          type: 'remaining',
          title: `Positions 11-${Math.min(20, maxItems)}`,
          slots: positions11to20,
          layoutClasses: getGridLayoutClasses('remaining'),
          isVisible: true,
        });
      }

      if (positions21plus.length > 0) {
        sections.push({
          type: 'remaining',
          title: `Positions 21-${maxItems}`,
          slots: positions21plus,
          layoutClasses: getGridLayoutClasses('remaining'),
          isVisible: true,
        });
      }
    }

    return {
      sections,
      statistics,
      allSlots,
      podiumSlots,
      midSlots,
      remainingSlots,
    };
  }, [gridItems, maxItems]);
}

/**
 * useGridSlotPresenter Hook
 *
 * Provides presentation data for a single grid slot.
 * Useful for components that only need data for one position.
 *
 * @param position - The grid position (0-indexed)
 * @returns GridSlotPresentation | null - Presentation data for the slot
 */
export function useGridSlotPresenter(
  position: number
): GridSlotPresentation | null {
  const gridItem = useGridStore(
    (state) => state.gridItems[position] ?? null
  );

  return useMemo(() => {
    if (!gridItem) return null;
    return createSlotPresentation(gridItem, position);
  }, [gridItem, position]);
}

/**
 * useGridStatistics Hook
 *
 * Provides only statistics without full presentation data.
 * Lightweight alternative for components that only need progress info.
 *
 * @param maxItems - Maximum number of items in the grid
 * @returns Statistics object
 */
export function useGridStatistics(maxItems: number) {
  const gridItems = useGridStore((state) => state.gridItems);

  return useMemo(() => {
    const validItems = gridItems.slice(0, maxItems);
    const filled = validItems.filter((item) => item.matched).length;
    const total = maxItems;
    const empty = total - filled;
    const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;

    return {
      filled,
      empty,
      total,
      percentage,
      isComplete: filled === total,
    };
  }, [gridItems, maxItems]);
}
