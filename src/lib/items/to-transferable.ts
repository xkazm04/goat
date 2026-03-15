/**
 * Transformation functions: To TransferableItem
 */

import type { BacklogItem } from '@/types/backlog-groups';
import type { GridItemType } from '@/types/match';
import type { TransferableItem } from '@/lib/dnd/transfer-protocol';
import type { NormalizedItem } from '@/stores/item-store/normalized-session';
import { normalizeImageUrl, extractTitle, safeString, safeStringArray } from './core-utils';

/**
 * Convert BacklogItem to TransferableItem
 */
export function backlogToTransferable(item: BacklogItem): TransferableItem {
  return {
    id: item.id,
    title: extractTitle(item),
    description: item.description,
    image_url: normalizeImageUrl(item.image_url),
    tags: item.tags ?? [],
    category: item.category,
    subcategory: item.subcategory,
  };
}

/**
 * Convert GridItemType to TransferableItem
 * Returns null if grid item is not matched (empty slot)
 */
export function gridToTransferable(item: GridItemType): TransferableItem | null {
  if (!item.matched) return null;

  return {
    id: item.backlogItemId ?? item.id,
    title: item.title,
    description: item.description,
    image_url: normalizeImageUrl(item.image_url),
    tags: item.tags ?? [],
  };
}

/**
 * Convert NormalizedItem to TransferableItem
 */
export function normalizedToTransferable(item: NormalizedItem): TransferableItem {
  return {
    id: item.id,
    title: extractTitle(item),
    description: item.description,
    image_url: normalizeImageUrl(item.image_url),
    tags: item.tags ?? [],
    category: item.category,
    subcategory: item.subcategory,
  };
}

/**
 * Convert any supported item type to TransferableItem
 * Auto-detects the source type
 */
export function toTransferable(source: unknown): TransferableItem | null {
  if (!source || typeof source !== 'object') return null;

  const obj = source as Record<string, unknown>;

  if (typeof obj.id !== 'string') return null;

  return {
    id: obj.id,
    title:
      safeString(obj.title) || safeString(obj.name) || '',
    description: safeString(obj.description),
    image_url: normalizeImageUrl(obj.image_url as string | null | undefined),
    tags: safeStringArray(obj.tags),
    category: safeString(obj.category),
    subcategory: safeString(obj.subcategory),
    metadata: obj.metadata as Record<string, unknown> | undefined,
  };
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Convert array of BacklogItems to TransferableItems
 */
export function batchBacklogToTransferable(
  items: BacklogItem[]
): TransferableItem[] {
  return items.map(backlogToTransferable);
}

/**
 * Convert array of GridItemTypes to TransferableItems (matched only)
 */
export function batchGridToTransferable(
  items: GridItemType[]
): TransferableItem[] {
  return items
    .filter((item) => item.matched)
    .map((item) => gridToTransferable(item))
    .filter((item): item is TransferableItem => item !== null);
}
