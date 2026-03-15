/**
 * Transformation functions: To GridItemType
 */

import type { BacklogItem } from '@/types/backlog-groups';
import type { GridItemType } from '@/types/match';
import type { TransferableItem } from '@/lib/dnd/transfer-protocol';
import { createGridReceiverId, isGridReceiverId } from '@/lib/dnd/transfer-protocol';
import { normalizeImageUrl, extractTitle, safeString, safeStringArray, isGridItemLike } from './core-utils';

/**
 * Options for creating a GridItemType
 */
export interface CreateGridItemOptions {
  /** Whether to preserve the original ID instead of generating grid-{position} */
  preserveId?: boolean;
  /** Override the matched state */
  matched?: boolean;
}

/**
 * Convert BacklogItem to GridItemType at a specific position
 */
export function backlogToGrid(
  item: BacklogItem,
  position: number,
  options: CreateGridItemOptions = {}
): GridItemType {
  const { preserveId = false, matched = true } = options;

  return {
    id: preserveId ? item.id : createGridReceiverId(position),
    title: extractTitle(item),
    description: item.description ?? '',
    image_url: normalizeImageUrl(item.image_url),
    position,
    matched,
    backlogItemId: item.id,
    tags: item.tags ?? [],
    item_year: item.item_year,
    item_year_to: item.item_year_to,
    isDragPlaceholder: false,
  };
}

/**
 * Convert TransferableItem to GridItemType at a specific position
 */
export function transferableToGrid(
  item: TransferableItem,
  position: number,
  options: CreateGridItemOptions = {}
): GridItemType {
  const { preserveId = false, matched = true } = options;

  const backlogItemId = !isGridReceiverId(item.id) ? item.id : undefined;

  return {
    id: preserveId ? item.id : createGridReceiverId(position),
    title: item.title,
    description: item.description ?? '',
    image_url: normalizeImageUrl(item.image_url),
    position,
    matched,
    backlogItemId,
    tags: item.tags ?? [],
    isDragPlaceholder: false,
  };
}

/**
 * Convert any supported item type to GridItemType
 * Auto-detects the source type
 */
export function toGridItem(
  source: unknown,
  position: number,
  options: CreateGridItemOptions = {}
): GridItemType {
  const { preserveId = false, matched = true } = options;

  if (!source || typeof source !== 'object') {
    return createEmptyGridSlot(position);
  }

  const obj = source as Record<string, unknown>;

  if (typeof obj.id !== 'string') {
    return createEmptyGridSlot(position);
  }

  // If already a grid item, update position
  if (isGridItemLike(obj)) {
    const gridItem = obj as GridItemType;
    return {
      ...gridItem,
      id: preserveId ? gridItem.id : createGridReceiverId(position),
      position,
      matched: options.matched ?? gridItem.matched,
    };
  }

  // Determine backlogItemId
  let backlogItemId: string | undefined;
  if (isGridItemLike(source) && (source as GridItemType).backlogItemId) {
    backlogItemId = (source as GridItemType).backlogItemId;
  } else if (!isGridReceiverId(obj.id)) {
    backlogItemId = obj.id;
  }

  return {
    id: preserveId ? obj.id : createGridReceiverId(position),
    title: safeString(obj.title) || safeString(obj.name) || '',
    description: safeString(obj.description) ?? '',
    image_url: normalizeImageUrl(obj.image_url as string | null | undefined),
    position,
    matched,
    backlogItemId,
    tags: safeStringArray(obj.tags),
    item_year: typeof obj.item_year === 'number' ? obj.item_year : undefined,
    item_year_to: typeof obj.item_year_to === 'number' ? obj.item_year_to : undefined,
    isDragPlaceholder: false,
  };
}

/**
 * Create an empty grid slot at a position
 */
export function createEmptyGridSlot(position: number): GridItemType {
  return {
    id: createGridReceiverId(position),
    title: '',
    description: '',
    position,
    matched: false,
    isDragPlaceholder: false,
    tags: [],
  };
}

/**
 * Create multiple empty grid slots
 */
export function createEmptyGrid(size: number): GridItemType[] {
  return Array.from({ length: size }, (_, i) => createEmptyGridSlot(i));
}

/**
 * Update a grid item's position (for moves/swaps)
 */
export function updateGridItemPosition(
  item: GridItemType,
  newPosition: number
): GridItemType {
  return {
    ...item,
    id: createGridReceiverId(newPosition),
    position: newPosition,
  };
}
