/**
 * Item Transforms
 *
 * All item conversion functions organized as a typed pipeline:
 *   DB -> Backlog -> BaseItem -> PlacedItem (Grid/Ranked)
 *
 * Also includes type guards, validation, and batch operations.
 *
 * With the PlacedItem unification, many conversions are simplified:
 * - GridItemType = PlacedItem (same type)
 * - RankedItem = PlacedItem (same type)
 * - TransferableItem = BaseItem (same type)
 */

import { createGridReceiverId, isGridReceiverId } from '@/lib/dnd/transfer-protocol';

import { normalizeImageUrl, extractTitle, safeString, safeStringArray } from './item-utils';

import type { BaseItem, PlacedItem, PlacedItemSource } from '@/types/placed-item';
import type { NormalizedItem } from '@/stores/item-store/normalized-session';
import type { BacklogItem } from '@/types/backlog-groups';
import type { GridItemType, BacklogItemType } from '@/types/match';
import type { RankedItem, RankingMode } from '@/types/ranking';



// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if source object has BacklogItem-like properties
 */
export function isBacklogItemLike(
  source: unknown
): source is { id: string; name?: string; category: string } {
  if (!source || typeof source !== 'object') return false;
  const obj = source as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    (typeof obj.name === 'string' || typeof obj.title === 'string') &&
    typeof obj.category === 'string'
  );
}

/**
 * Check if source object has PlacedItem-like properties (replaces isGridItemLike)
 */
export function isGridItemLike(
  source: unknown
): source is PlacedItem {
  if (!source || typeof source !== 'object') return false;
  const obj = source as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.position === 'number' &&
    'context' in obj &&
    typeof obj.context === 'object' &&
    obj.context !== null &&
    typeof (obj.context as Record<string, unknown>).matched === 'boolean'
  );
}

/**
 * Check if source object has BaseItem-like properties (replaces isTransferableItemLike)
 */
export function isTransferableItemLike(
  source: unknown
): source is { id: string; title: string } {
  if (!source || typeof source !== 'object') return false;
  const obj = source as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.title === 'string';
}

/**
 * Check if source object has NormalizedItem-like properties
 */
export function isNormalizedItemLike(
  source: unknown
): source is { id: string; groupId: string } {
  if (!source || typeof source !== 'object') return false;
  const obj = source as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.groupId === 'string';
}

// ============================================================================
// Pipeline: Backlog <-> Normalized
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
    name: item.name,
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

// ============================================================================
// Pipeline: -> BaseItem (replaces -> Transferable)
// ============================================================================

/**
 * Convert BacklogItem to BaseItem (TransferableItem)
 */
export function backlogToTransferable(item: BacklogItem): BaseItem {
  return {
    id: item.id,
    title: extractTitle(item),
    description: item.description,
    image_url: normalizeImageUrl(item.image_url),
    tags: item.tags ?? [],
    category: item.category,
    subcategory: item.subcategory,
    item_year: item.item_year,
    item_year_to: item.item_year_to,
  };
}

/**
 * Convert NormalizedItem to BaseItem (TransferableItem)
 */
export function normalizedToTransferable(item: NormalizedItem): BaseItem {
  return {
    id: item.id,
    title: extractTitle(item),
    description: item.description,
    image_url: normalizeImageUrl(item.image_url),
    tags: item.tags ?? [],
    category: item.category,
    subcategory: item.subcategory,
    item_year: item.item_year,
    item_year_to: item.item_year_to,
  };
}

/**
 * Convert any supported item type to BaseItem (TransferableItem)
 * Auto-detects the source type
 */
export function toTransferable(source: unknown): BaseItem | null {
  if (!source || typeof source !== 'object') return null;

  const obj = source as Record<string, unknown>;

  if (typeof obj.id !== 'string') return null;

  // If it's a PlacedItem, extract the inner item
  if (isGridItemLike(source)) {
    return (source as PlacedItem).item;
  }

  return {
    id: obj.id,
    title: extractTitle(obj as { name?: string; title?: string }),
    description: typeof obj.description === 'string' ? obj.description : undefined,
    image_url: normalizeImageUrl(obj.image_url as string | null | undefined),
    tags: safeStringArray(obj.tags),
    category: safeString(obj.category),
    subcategory: safeString(obj.subcategory),
    metadata: obj.metadata as Record<string, unknown> | undefined,
  };
}

// ============================================================================
// Pipeline: -> Grid (PlacedItem)
// ============================================================================

/**
 * Options for creating a PlacedItem (GridItemType)
 */
export interface CreateGridItemOptions {
  /** Override the matched state */
  matched?: boolean;
  /** Source context */
  source?: PlacedItemSource;
}

/**
 * Convert BacklogItem to PlacedItem (GridItemType) at a specific position
 */
export function backlogToGrid(
  item: BacklogItem,
  position: number,
  options: CreateGridItemOptions = {}
): GridItemType {
  const { matched = true, source = 'backlog' } = options;

  return {
    id: createGridReceiverId(position),
    position,
    item: matched ? {
      id: item.id,
      title: extractTitle(item),
      description: item.description ?? '',
      image_url: normalizeImageUrl(item.image_url),
      tags: item.tags ?? [],
      category: item.category,
      subcategory: item.subcategory,
      item_year: item.item_year,
      item_year_to: item.item_year_to,
    } : null,
    context: {
      source,
      matched,
    },
  };
}

/**
 * Convert BaseItem (TransferableItem) to PlacedItem (GridItemType) at a specific position
 */
export function transferableToGrid(
  item: BaseItem,
  position: number,
  options: CreateGridItemOptions = {}
): GridItemType {
  const { matched = true, source = 'backlog' } = options;

  return {
    id: createGridReceiverId(position),
    position,
    item: matched ? { ...item } : null,
    context: {
      source,
      matched,
    },
  };
}

/**
 * Convert any supported item type to PlacedItem (GridItemType)
 * Auto-detects the source type
 */
export function toGridItem(
  source: unknown,
  position: number,
  options: CreateGridItemOptions = {}
): GridItemType {
  const { matched = true, source: itemSource = 'backlog' } = options;

  if (!source || typeof source !== 'object') {
    return createEmptyGridSlot(position);
  }

  const obj = source as Record<string, unknown>;

  if (typeof obj.id !== 'string') {
    return createEmptyGridSlot(position);
  }

  // If already a PlacedItem, update position
  if (isGridItemLike(obj)) {
    const placed = obj as PlacedItem;
    return {
      ...placed,
      id: createGridReceiverId(position),
      position,
      context: {
        ...placed.context,
        matched: options.matched ?? placed.context.matched,
      },
    };
  }

  // Convert from any item-like object
  const baseItem: BaseItem = {
    id: obj.id,
    title: extractTitle(obj as { name?: string; title?: string }),
    description: (typeof obj.description === 'string' ? obj.description : undefined) ?? '',
    image_url: normalizeImageUrl(obj.image_url as string | null | undefined),
    tags: safeStringArray(obj.tags),
    category: safeString(obj.category),
    subcategory: safeString(obj.subcategory),
    item_year: typeof obj.item_year === 'number' ? obj.item_year : undefined,
    item_year_to: typeof obj.item_year_to === 'number' ? obj.item_year_to : undefined,
  };

  return {
    id: createGridReceiverId(position),
    position,
    item: matched ? baseItem : null,
    context: {
      source: itemSource,
      matched,
    },
  };
}

/**
 * Create an empty grid slot at a position
 */
export function createEmptyGridSlot(position: number): GridItemType {
  return {
    id: createGridReceiverId(position),
    position,
    item: null,
    context: {
      source: 'grid',
      matched: false,
    },
  };
}

/**
 * Create multiple empty grid slots
 */
export function createEmptyGrid(size: number): GridItemType[] {
  return Array.from({ length: size }, (_, i) => createEmptyGridSlot(i));
}

/**
 * Update a PlacedItem's position (for moves/swaps)
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

// ============================================================================
// Pipeline: Grid -> Backlog (reverse)
// ============================================================================

/**
 * Convert PlacedItem (GridItemType) back to BacklogItem format
 * Useful when removing items from grid back to pool
 */
export function gridToBacklog(item: GridItemType): Partial<BacklogItem> {
  if (!item.item) return { id: item.id };
  return {
    id: item.item.id,
    name: item.item.title,
    title: item.item.title,
    description: item.item.description,
    image_url: normalizeImageUrl(item.item.image_url),
    tags: item.item.tags ?? [],
    category: item.item.category,
    subcategory: item.item.subcategory,
  };
}

/**
 * Convert BaseItem (TransferableItem) to BacklogItem format
 */
export function transferableToBacklog(
  item: BaseItem
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
// Pipeline: Grid -> BaseItem (replaces Grid -> Transferable)
// ============================================================================

/**
 * Extract BaseItem from a PlacedItem (GridItemType)
 * Returns null if grid item is not matched (empty slot)
 */
export function gridToTransferable(item: GridItemType): BaseItem | null {
  if (!item.context.matched || !item.item) return null;
  return { ...item.item };
}

// ============================================================================
// Pipeline: -> Ranked (PlacedItem with rank- prefix)
// ============================================================================

/**
 * Create a RankedItem (PlacedItem) from a BaseItem
 */
export function createRankedItem(
  position: number,
  item: BaseItem,
  mode: RankingMode
): RankedItem {
  return {
    id: `rank-${position}`,
    position,
    item,
    context: {
      source: 'grid',
      matched: true,
      metadata: {
        assignedAt: Date.now(),
        assignedBy: mode,
      },
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
    item: null,
    context: {
      source: 'grid',
      matched: false,
    },
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
 * Convert PlacedItem (GridItemType) to RankedItem
 */
export function gridToRanked(item: GridItemType, mode: RankingMode): RankedItem {
  if (!item.context.matched || !item.item) {
    return createEmptyRankedItem(item.position);
  }

  return createRankedItem(item.position, item.item, mode);
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Convert array of BacklogItems to BaseItems (TransferableItems)
 */
export function batchBacklogToTransferable(
  items: BacklogItem[]
): BaseItem[] {
  return items.map(backlogToTransferable);
}

/**
 * Convert array of PlacedItems (GridItemTypes) to BaseItems (matched only)
 */
export function batchGridToTransferable(
  items: GridItemType[]
): BaseItem[] {
  return items
    .filter((item) => item.context.matched && item.item !== null)
    .map((item) => item.item!)
    .map((item) => ({ ...item }));
}

/**
 * Convert array of NormalizedItems to BacklogItems
 */
export function batchNormalizedToBacklog(items: NormalizedItem[]): BacklogItem[] {
  return items.map(normalizedToBacklog);
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validation result for item transformations
 */
export interface ItemValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that an item has required fields for grid display
 */
export function validateForGrid(item: unknown): ItemValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!item || typeof item !== 'object') {
    errors.push('Item is null or not an object');
    return { isValid: false, errors, warnings };
  }

  const obj = item as Record<string, unknown>;

  if (typeof obj.id !== 'string' || !obj.id) {
    errors.push('Missing required field: id');
  }

  if (typeof obj.position !== 'number') {
    errors.push('Missing required field: position');
  }

  if (!('context' in obj) || typeof obj.context !== 'object') {
    errors.push('Missing required field: context');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a PlacedItem (GridItemType) for consistency
 */
export function validateGridItem(item: GridItemType): ItemValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!item.id) {
    errors.push('Missing required field: id');
  } else if (!isGridReceiverId(item.id)) {
    warnings.push(`ID "${item.id}" does not follow grid-{position} convention`);
  }

  if (typeof item.position !== 'number' || item.position < 0) {
    errors.push(`Invalid position: ${item.position}`);
  }

  if (item.context.matched && !item.item) {
    warnings.push('Matched item has no item data');
  }

  if (item.context.matched && item.item && !item.item.title) {
    warnings.push('Matched item has empty title');
  }

  const expectedId = createGridReceiverId(item.position);
  if (item.id !== expectedId) {
    warnings.push(
      `ID "${item.id}" does not match position ${item.position} (expected "${expectedId}")`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
