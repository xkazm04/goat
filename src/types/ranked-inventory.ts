/**
 * Inventory tier types
 *
 * The consensus-derived tier a backlog item is shown with (TierIndicator), and
 * the legacy sort vocabulary the consensus store still speaks.
 *
 * Corrected 2026-09-05: this module used to open with a "ranked inventory"
 * paradigm — Collection Panel and Match Grid as two views of one entity, with
 * `RankedInventoryItem`, `RankedInventoryState`, `InventoryPosition`,
 * `groupItemsByTier`, `sortInventoryItems` and re-exported sort presets. None
 * of those had a single importer (knip + grep, 0 consumers each); the paradigm
 * was never implemented, and `sortInventoryItems` reached `@/lib/sorting`
 * through a bare `require()`. What remains below is exactly what the two live
 * consumers import: `getTierFromRank` / `getTierConfig` (TierIndicator) and
 * `InventorySortBy` / `InventorySortOrder` / `InventorySortConfig`
 * (consensus-store).
 */

import { resolveTierFromRank } from '@/lib/tokens/badge-tokens';

import type { SortCriteria, SortDirection } from '@/lib/sorting';

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
 * Sort configuration for the inventory
 * @deprecated Use SortConfig from '@/lib/sorting' instead
 */
export interface InventorySortConfig {
  sortBy: InventorySortBy;
  sortOrder: InventorySortOrder;
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
 * Get tier from consensus average rank.
 * Delegates to the shared tier resolver in badge-tokens.
 */
export function getTierFromRank(avgRank: number | undefined): InventoryTier {
  return resolveTierFromRank(avgRank);
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
        color: 'text-brand-hover',
        bgColor: 'bg-brand/20',
        borderColor: 'border-brand/40',
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
