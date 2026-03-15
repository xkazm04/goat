/**
 * Transformation functions: To BacklogItem and NormalizedItem
 */

import type { BacklogItem } from '@/types/backlog-groups';
import type { GridItemType, BacklogItemType } from '@/types/match';
import type { TransferableItem } from '@/lib/dnd/transfer-protocol';
import type { NormalizedItem } from '@/stores/item-store/normalized-session';
import { normalizeImageUrl, extractTitle } from './core-utils';

// ============================================================================
// To BacklogItem
// ============================================================================

/**
 * Convert GridItemType back to BacklogItem format
 * Useful when removing items from grid back to pool
 */
export function gridToBacklog(item: GridItemType): Partial<BacklogItem> {
  return {
    id: item.backlogItemId ?? item.id,
    name: item.title,
    title: item.title,
    description: item.description,
    image_url: normalizeImageUrl(item.image_url),
    tags: item.tags ?? [],
  };
}

/**
 * Convert TransferableItem to BacklogItem format
 */
export function transferableToBacklog(
  item: TransferableItem
): Partial<BacklogItem> {
  return {
    id: item.id,
    name: item.title,
    title: item.title,
    description: item.description,
    image_url: normalizeImageUrl(item.image_url),
    tags: item.tags ?? [],
    category: item.category,
    subcategory: item.subcategory,
  };
}

// ============================================================================
// To NormalizedItem
// ============================================================================

/**
 * Convert BacklogItem to NormalizedItem for session storage
 */
export function backlogToNormalized(
  item: BacklogItem,
  groupId: string
): NormalizedItem {
  return {
    id: item.id,
    title: extractTitle(item),
    name: item.name ?? item.title ?? '',
    description: item.description ?? '',
    category: item.category,
    subcategory: item.subcategory,
    item_year: item.item_year,
    item_year_to: item.item_year_to,
    image_url: normalizeImageUrl(item.image_url),
    created_at: item.created_at ?? new Date().toISOString(),
    updated_at: item.updated_at,
    tags: item.tags ?? [],
    matched: item.matched ?? false,
    used: item.used,
    groupId,
  };
}

/**
 * Convert NormalizedItem to BacklogItem
 */
export function normalizedToBacklog(item: NormalizedItem): BacklogItem {
  return {
    id: item.id,
    name: item.name,
    title: item.title,
    description: item.description || undefined,
    category: item.category,
    subcategory: item.subcategory,
    item_year: item.item_year,
    item_year_to: item.item_year_to,
    image_url: normalizeImageUrl(item.image_url),
    created_at: item.created_at,
    updated_at: item.updated_at,
    tags: item.tags,
    matched: item.matched,
    used: item.used,
  };
}

/**
 * Convert NormalizedItem to BacklogItemType (match.ts format)
 */
export function normalizedToBacklogItemType(
  item: NormalizedItem
): BacklogItemType {
  return {
    id: item.id,
    title: item.title,
    name: item.name,
    description: item.description,
    category: item.category,
    subcategory: item.subcategory,
    item_year: item.item_year,
    item_year_to: item.item_year_to,
    image_url: normalizeImageUrl(item.image_url),
    created_at: item.created_at,
    updated_at: item.updated_at,
    tags: item.tags,
    matched: item.matched,
    used: item.used,
  };
}

/**
 * Convert array of NormalizedItems to BacklogItems
 */
export function batchNormalizedToBacklog(items: NormalizedItem[]): BacklogItem[] {
  return items.map(normalizedToBacklog);
}
