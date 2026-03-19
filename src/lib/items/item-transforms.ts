/**
 * Item Transforms
 *
 * All item conversion functions organized as a typed pipeline:
 *   DB -> Backlog -> Transferable -> Grid -> Ranked
 *
 * Also includes type guards, validation, and batch operations.
 */

import { createGridReceiverId, isGridReceiverId } from '@/lib/dnd/transfer-protocol';

import { normalizeImageUrl, extractTitle, safeString, safeStringArray } from './item-utils';

import type { TransferableItem } from '@/lib/dnd/transfer-protocol';
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
 * Check if source object has GridItemType-like properties
 */
export function isGridItemLike(
  source: unknown
): source is { id: string; position: number; matched: boolean } {
  if (!source || typeof source !== 'object') return false;
  const obj = source as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.position === 'number' &&
    typeof obj.matched === 'boolean'
  );
}

/**
 * Check if source object has TransferableItem-like properties
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
// Pipeline: Backlog -> Transferable
// ============================================================================

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
// Pipeline: -> Grid
// ============================================================================

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
    title: extractTitle(obj as { name?: string; title?: string }),
    description: (typeof obj.description === 'string' ? obj.description : undefined) ?? '',
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

// ============================================================================
// Pipeline: Grid -> Backlog (reverse)
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
// Pipeline: Grid -> Transferable
// ============================================================================

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

// ============================================================================
// Pipeline: -> Ranked
// ============================================================================

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

  if (typeof obj.title !== 'string' && typeof obj.name !== 'string') {
    warnings.push('Missing title and name fields');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a GridItemType for consistency
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

  if (typeof item.matched !== 'boolean') {
    errors.push('Missing required field: matched');
  }

  if (item.matched && !item.title) {
    warnings.push('Matched item has empty title');
  }

  if (item.matched && !item.backlogItemId) {
    warnings.push('Matched item has no backlogItemId');
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
