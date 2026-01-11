/**
 * Ranked Inventory Types
 *
 * This module unifies the Collection Panel and Match Grid as two views
 * of the same conceptual entity: a ranked inventory.
 *
 * - Backlog (Collection Panel) = positions [N+1, infinity) - unranked pool
 * - Grid (Match Grid) = positions [1, N] - ranked positions
 *
 * When an item is dragged from Collection to Grid, it's not "moving between
 * systems" - it's being assigned a rank. This paradigm enables:
 * - Natural sorting by consensus/average ranking
 * - Unified item discovery where popular items bubble to the top
 * - Seamless transition between unranked and ranked states
 */

import type { ItemConsensusWithClusters } from './consensus';
import type { CollectionItem } from '@/app/features/Collection/types';
import type { SortCriteria, SortDirection } from '@/lib/sorting';

/**
 * Inventory position state - where an item exists in the ranked system
 */
export type InventoryPosition =
  | { type: 'unranked'; poolIndex?: number }  // In Collection/backlog
  | { type: 'ranked'; rank: number };          // In Grid at position 1-N

/**
 * Sort options for unranked items in the Collection Panel
 * @deprecated Use SortCriteria from '@/lib/sorting' instead
 */
export type InventorySortBy = SortCriteria;

/**
 * Sort direction
 * @deprecated Use SortDirection from '@/lib/sorting' instead
 */
export type InventorySortOrder = SortDirection;

/**
 * Ranked inventory item - extends CollectionItem with ranking metadata
 */
export interface RankedInventoryItem extends CollectionItem {
  /** Current position in the inventory (ranked or unranked) */
  inventoryPosition: InventoryPosition;

  /** Community consensus data for this item */
  consensus?: ItemConsensusWithClusters;

  /** Effective sort score based on current sort mode */
  sortScore?: number;

  /** Whether this item is highlighted based on filters */
  isHighlighted?: boolean;

  /** Tier classification based on consensus rank */
  tier?: InventoryTier;
}

/**
 * Tier classification for visual grouping
 */
export type InventoryTier =
  | 'elite'       // Consensus rank 1-3
  | 'top'         // Consensus rank 4-10
  | 'solid'       // Consensus rank 11-25
  | 'common'      // Consensus rank 26-50
  | 'unranked';   // No consensus data yet

/**
 * Get tier from consensus average rank
 */
export function getTierFromRank(avgRank: number | undefined): InventoryTier {
  if (avgRank === undefined) return 'unranked';
  if (avgRank <= 3) return 'elite';
  if (avgRank <= 10) return 'top';
  if (avgRank <= 25) return 'solid';
  return 'common';
}

/**
 * Tier display configuration
 */
export interface TierConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: 'trophy' | 'medal' | 'star' | 'circle';
}

/**
 * Get display configuration for a tier
 */
export function getTierConfig(tier: InventoryTier): TierConfig {
  switch (tier) {
    case 'elite':
      return {
        label: 'Elite',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/40',
        icon: 'trophy',
      };
    case 'top':
      return {
        label: 'Top Pick',
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/20',
        borderColor: 'border-cyan-500/40',
        icon: 'medal',
      };
    case 'solid':
      return {
        label: 'Solid',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/20',
        borderColor: 'border-purple-500/40',
        icon: 'star',
      };
    case 'common':
      return {
        label: 'Common',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        borderColor: 'border-gray-500/40',
        icon: 'circle',
      };
    case 'unranked':
      return {
        label: 'New',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        borderColor: 'border-emerald-500/40',
        icon: 'circle',
      };
  }
}

/**
 * Sort configuration for the inventory
 * @deprecated Use SortConfig from '@/lib/sorting' instead
 */
export interface InventorySortConfig {
  sortBy: InventorySortBy;
  sortOrder: InventorySortOrder;
}

/**
 * Default sort configurations
 * @deprecated Use SORT_PRESETS from '@/lib/sorting' instead
 */
export { SORT_PRESETS } from '@/lib/sorting';

/**
 * Inventory state representing the full ranked system
 */
export interface RankedInventoryState {
  /** Items currently in ranked positions (the grid) */
  rankedItems: RankedInventoryItem[];

  /** Items in the unranked pool (the collection/backlog) */
  unrankedItems: RankedInventoryItem[];

  /** Current sort configuration for unranked items */
  sortConfig: InventorySortConfig;

  /** Category filter */
  category: string | null;

  /** Maximum rank positions (grid size, e.g., 10 for Top 10) */
  maxRank: number;

  /** Total items in the inventory */
  totalItems: number;
}

/**
 * Compute sort score for an item based on sort configuration
 * @deprecated Use computeSortValue from '@/lib/sorting' instead
 */
export { computeSortValue as computeSortScore } from '@/lib/sorting';

/**
 * Sort items by the given configuration
 * @deprecated Use sortItems from '@/lib/sorting' instead
 */
export function sortInventoryItems(
  items: RankedInventoryItem[],
  config: InventorySortConfig
): RankedInventoryItem[] {
  // Use the unified sorter with legacy format conversion
  const { fromLegacySortBy, sortItems } = require('@/lib/sorting');
  const sortConfig = fromLegacySortBy(config.sortBy, config.sortOrder);
  return sortItems(items, sortConfig);
}

/**
 * Group items by tier for visual sectioning
 */
export function groupItemsByTier(
  items: RankedInventoryItem[]
): Record<InventoryTier, RankedInventoryItem[]> {
  const groups: Record<InventoryTier, RankedInventoryItem[]> = {
    elite: [],
    top: [],
    solid: [],
    common: [],
    unranked: [],
  };

  for (const item of items) {
    const tier = item.tier ?? getTierFromRank(item.consensus?.averageRank);
    groups[tier].push(item);
  }

  return groups;
}
