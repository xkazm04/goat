/**
 * ItemTransformer - Unified Item Transformation Layer
 *
 * Centralizes all item type conversions between:
 * - BacklogItem (API/database format)
 * - TransferableItem (drag-and-drop format)
 * - GridItemType (grid display format)
 * - NormalizedItem (session storage format)
 * - RankedItem (ranking store format)
 *
 * This module provides:
 * - Bidirectional conversion functions
 * - Consistent image URL normalization
 * - Title extraction with fallbacks
 * - Type-safe transformations with validation
 * - Helper utilities for common operations
 *
 * @module ItemTransformer
 */

import type { BacklogItem } from '@/types/backlog-groups';
import type { GridItemType, BacklogItemType } from '@/types/match';
import type { TransferableItem } from '@/lib/dnd/transfer-protocol';
import type { RankedItem, RankingMode } from '@/types/ranking';
import type { NormalizedItem } from '@/stores/item-store/normalized-session';
import { createGridReceiverId, isGridReceiverId } from '@/lib/dnd/transfer-protocol';

// ============================================================================
// Core Utility Functions
// ============================================================================

/**
 * Normalize image URL to ensure consistent handling across all transforms.
 * Handles: undefined, null, empty string, valid URL
 *
 * @param imageUrl - The image URL to normalize
 * @returns Normalized URL or undefined
 */
export function normalizeImageUrl(
  imageUrl: string | null | undefined
): string | undefined {
  if (imageUrl === null || imageUrl === undefined || imageUrl === '') {
    return undefined;
  }
  return imageUrl;
}

/**
 * Extract title from various item formats with consistent fallback logic.
 * Priority: name > title > ''
 *
 * @param item - Item with potential name/title fields
 * @returns Extracted title string
 */
export function extractTitle(
  item: { name?: string; title?: string } | null | undefined
): string {
  if (!item) return '';

  // Prefer name over title (BacklogItem convention)
  if (typeof item.name === 'string' && item.name.trim()) {
    return item.name;
  }
  if (typeof item.title === 'string' && item.title.trim()) {
    return item.title;
  }
  return '';
}

/**
 * Safely extract a string value from an unknown object property
 */
function safeString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Safely extract a number value from an unknown object property
 */
function safeNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

/**
 * Safely extract a string array from an unknown object property
 */
function safeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  return [];
}

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
// Transformation Functions: To TransferableItem
// ============================================================================

/**
 * Convert BacklogItem to TransferableItem
 *
 * @param item - BacklogItem to convert
 * @returns TransferableItem
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
 *
 * @param item - GridItemType to convert
 * @returns TransferableItem or null
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
 *
 * @param item - NormalizedItem to convert
 * @returns TransferableItem
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
 *
 * @param source - Source item (BacklogItem, GridItemType, NormalizedItem, etc.)
 * @returns TransferableItem or null if conversion fails
 */
export function toTransferable(source: unknown): TransferableItem | null {
  if (!source || typeof source !== 'object') return null;

  const obj = source as Record<string, unknown>;

  // Must have an ID
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
// Transformation Functions: To GridItemType
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
 *
 * @param item - BacklogItem to convert
 * @param position - Target grid position (0-indexed)
 * @param options - Optional configuration
 * @returns GridItemType
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
    isDragPlaceholder: false,
  };
}

/**
 * Convert TransferableItem to GridItemType at a specific position
 *
 * @param item - TransferableItem to convert
 * @param position - Target grid position (0-indexed)
 * @param options - Optional configuration
 * @returns GridItemType
 */
export function transferableToGrid(
  item: TransferableItem,
  position: number,
  options: CreateGridItemOptions = {}
): GridItemType {
  const { preserveId = false, matched = true } = options;

  // Determine backlogItemId - use the original ID if it's not already a grid ID
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
 *
 * @param source - Source item
 * @param position - Target grid position (0-indexed)
 * @param options - Optional configuration
 * @returns GridItemType
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

  // Must have an ID
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
    isDragPlaceholder: false,
  };
}

/**
 * Create an empty grid slot at a position
 *
 * @param position - Grid position (0-indexed)
 * @returns Empty GridItemType
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
 *
 * @param size - Number of slots to create
 * @returns Array of empty GridItemType
 */
export function createEmptyGrid(size: number): GridItemType[] {
  return Array.from({ length: size }, (_, i) => createEmptyGridSlot(i));
}

/**
 * Update a grid item's position (for moves/swaps)
 *
 * @param item - GridItemType to update
 * @param newPosition - New position
 * @returns Updated GridItemType
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
// Transformation Functions: To BacklogItem
// ============================================================================

/**
 * Convert GridItemType back to BacklogItem format
 * Useful when removing items from grid back to pool
 *
 * @param item - GridItemType to convert
 * @returns Partial BacklogItem
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
 *
 * @param item - TransferableItem to convert
 * @returns Partial BacklogItem
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
// Transformation Functions: To NormalizedItem
// ============================================================================

/**
 * Convert BacklogItem to NormalizedItem for session storage
 *
 * @param item - BacklogItem to convert
 * @param groupId - Parent group ID
 * @returns NormalizedItem
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
 *
 * @param item - NormalizedItem to convert
 * @returns BacklogItem
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
 *
 * @param item - NormalizedItem to convert
 * @returns BacklogItemType
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
// Transformation Functions: To RankedItem
// ============================================================================

/**
 * Create a RankedItem from a TransferableItem
 *
 * @param position - Rank position (0-indexed)
 * @param item - TransferableItem to rank
 * @param mode - How the item was ranked
 * @returns RankedItem
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
 *
 * @param position - Rank position (0-indexed)
 * @returns Empty RankedItem
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
 *
 * @param size - Number of ranking positions
 * @returns Array of empty RankedItems
 */
export function createEmptyRanking(size: number): RankedItem[] {
  return Array.from({ length: size }, (_, i) => createEmptyRankedItem(i));
}

/**
 * Convert BacklogItem to RankedItem
 *
 * @param position - Rank position (0-indexed)
 * @param item - BacklogItem to rank
 * @param mode - How the item was ranked
 * @returns RankedItem
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
 *
 * @param item - GridItemType to convert
 * @param mode - How the item was ranked
 * @returns RankedItem or empty slot if not matched
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
// Batch Transformation Functions
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
// Validation Functions
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

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Normalize item data for consistent display (e.g., drag overlay)
 * Ensures image_url is properly set even if the source has inconsistent data
 */
export function normalizeForDisplay<
  T extends { id: string; image_url?: string | null }
>(item: T): T {
  if (!item) return item;

  return {
    ...item,
    image_url: normalizeImageUrl(item.image_url),
  };
}

/**
 * Get display title from any item type
 */
export function getDisplayTitle(item: unknown): string {
  if (!item || typeof item !== 'object') return 'Untitled';

  const obj = item as Record<string, unknown>;
  return (
    safeString(obj.title) ||
    safeString(obj.name) ||
    'Untitled'
  );
}

/**
 * Get display image URL from any item type
 */
export function getDisplayImageUrl(item: unknown): string | undefined {
  if (!item || typeof item !== 'object') return undefined;

  const obj = item as Record<string, unknown>;
  return normalizeImageUrl(obj.image_url as string | null | undefined);
}

// ============================================================================
// Export Namespace for Convenient Access
// ============================================================================

export const ItemTransformer = {
  // Core utilities
  normalizeImageUrl,
  extractTitle,

  // Type guards
  isBacklogItemLike,
  isGridItemLike,
  isTransferableItemLike,
  isNormalizedItemLike,

  // To TransferableItem
  backlogToTransferable,
  gridToTransferable,
  normalizedToTransferable,
  toTransferable,

  // To GridItemType
  backlogToGrid,
  transferableToGrid,
  toGridItem,
  createEmptyGridSlot,
  createEmptyGrid,
  updateGridItemPosition,

  // To BacklogItem
  gridToBacklog,
  transferableToBacklog,

  // To NormalizedItem
  backlogToNormalized,
  normalizedToBacklog,
  normalizedToBacklogItemType,

  // To RankedItem
  createRankedItem,
  createEmptyRankedItem,
  createEmptyRanking,
  backlogToRanked,
  gridToRanked,

  // Batch operations
  batchBacklogToTransferable,
  batchGridToTransferable,
  batchNormalizedToBacklog,

  // Validation
  validateForGrid,
  validateGridItem,

  // Display helpers
  normalizeForDisplay,
  getDisplayTitle,
  getDisplayImageUrl,
};

export default ItemTransformer;
