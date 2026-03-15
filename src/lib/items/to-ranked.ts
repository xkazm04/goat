/**
 * Transformation functions: To RankedItem
 */

import type { BacklogItem } from '@/types/backlog-groups';
import type { GridItemType } from '@/types/match';
import type { TransferableItem } from '@/lib/dnd/transfer-protocol';
import type { RankedItem, RankingMode } from '@/types/ranking';
import { backlogToTransferable, gridToTransferable } from './to-transferable';

/**
 * Create a RankedItem from a TransferableItem
 */
export function createRankedItem(
  position: number,
  item: TransferableItem,
  mode: RankingMode
): RankedItem {
  return {
    id: `rank-${position}`,
    position,
    itemId: item.id,
    item,
    metadata: {
      assignedAt: Date.now(),
      assignedBy: mode,
    },
  };
}

/**
 * Create an empty RankedItem slot
 */
export function createEmptyRankedItem(position: number): RankedItem {
  return {
    id: `rank-${position}`,
    position,
    itemId: null,
    item: null,
  };
}

/**
 * Create an empty ranking array
 */
export function createEmptyRanking(size: number): RankedItem[] {
  return Array.from({ length: size }, (_, i) => createEmptyRankedItem(i));
}

/**
 * Convert BacklogItem to RankedItem
 */
export function backlogToRanked(
  position: number,
  item: BacklogItem,
  mode: RankingMode
): RankedItem {
  return createRankedItem(position, backlogToTransferable(item), mode);
}

/**
 * Convert GridItemType to RankedItem
 */
export function gridToRanked(item: GridItemType, mode: RankingMode): RankedItem {
  if (!item.matched) {
    return createEmptyRankedItem(item.position);
  }

  const transferable = gridToTransferable(item);
  if (!transferable) {
    return createEmptyRankedItem(item.position);
  }

  return createRankedItem(item.position, transferable, mode);
}
