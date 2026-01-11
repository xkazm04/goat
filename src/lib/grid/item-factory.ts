/**
 * GridItemFactory - Centralized conversion for BacklogItem to GridItemType
 *
 * This module provides a single source of truth for converting backlog items
 * to grid items, ensuring consistent image_url handling and validation across
 * the application.
 */

import { GridItemType } from '@/types/match';
import { BacklogItem } from '@/types/backlog-groups';
import { TransferableItem, createGridReceiverId, isGridReceiverId } from '@/lib/dnd';

// ============================================================================
// Types
// ============================================================================

/**
 * Source item types that can be converted to GridItemType
 */
export type GridItemSource = BacklogItem | TransferableItem | Partial<GridItemType>;

/**
 * Options for grid item creation
 */
export interface CreateGridItemOptions {
  /** Whether to preserve the original ID instead of generating grid-{position} */
  preserveId?: boolean;
  /** Override the matched state */
  matched?: boolean;
}

/**
 * Validation result for grid items
 */
export interface GridItemValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if source is a BacklogItem
 */
function isBacklogItem(source: GridItemSource): source is BacklogItem {
  return 'name' in source && typeof (source as BacklogItem).name === 'string';
}

/**
 * Check if source is a TransferableItem
 */
function isTransferableItem(source: GridItemSource): source is TransferableItem {
  return 'title' in source && !('matched' in source) && !('position' in source);
}

/**
 * Check if source is already a GridItemType (partial or full)
 */
function isGridItemSource(source: GridItemSource): source is Partial<GridItemType> {
  return 'matched' in source || 'position' in source;
}

// ============================================================================
// Core Factory Functions
// ============================================================================

/**
 * Normalize image_url to ensure consistent handling
 * Handles: undefined, null, empty string, valid URL
 */
function normalizeImageUrl(imageUrl: string | null | undefined): string | undefined {
  // Explicitly handle all falsy cases
  if (imageUrl === null || imageUrl === undefined || imageUrl === '') {
    return undefined;
  }
  return imageUrl;
}

/**
 * Extract title from various source formats
 */
function extractTitle(source: GridItemSource): string {
  if (isBacklogItem(source)) {
    // BacklogItem has both name and title, prefer name
    return source.name || source.title || '';
  }
  if ('title' in source && typeof source.title === 'string') {
    return source.title;
  }
  if ('name' in source && typeof (source as Record<string, unknown>).name === 'string') {
    return (source as Record<string, unknown>).name as string;
  }
  return '';
}

/**
 * Create a GridItemType from various source types
 *
 * This is the central factory function that handles:
 * - BacklogItem conversion
 * - TransferableItem conversion
 * - GridItemType updates (position changes)
 *
 * @param source - The source item to convert
 * @param position - The target grid position (0-indexed)
 * @param options - Optional configuration for the conversion
 */
export function createGridItem(
  source: GridItemSource,
  position: number,
  options: CreateGridItemOptions = {}
): GridItemType {
  const { preserveId = false, matched = true } = options;

  // Generate the grid ID
  const id = preserveId && source.id ? source.id : createGridReceiverId(position);

  // Extract backlogItemId - use the original item's ID
  let backlogItemId: string | undefined;
  if (isGridItemSource(source) && source.backlogItemId) {
    // Preserve existing backlogItemId for grid items being moved
    backlogItemId = source.backlogItemId;
  } else if (source.id && !isGridReceiverId(source.id)) {
    // Use the source ID if it's not already a grid ID
    backlogItemId = source.id;
  }

  // Build the grid item with normalized values
  const gridItem: GridItemType = {
    id,
    title: extractTitle(source),
    description: source.description || '',
    image_url: normalizeImageUrl(source.image_url),
    position,
    matched,
    backlogItemId,
    tags: source.tags || [],
    isDragPlaceholder: false,
  };

  return gridItem;
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

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a grid item for required fields and consistency
 */
export function validateGridItem(item: GridItemType): GridItemValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field checks
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

  // Consistency checks
  if (item.matched && !item.title) {
    warnings.push('Matched item has empty title');
  }

  if (item.matched && !item.backlogItemId) {
    warnings.push('Matched item has no backlogItemId');
  }

  // ID-position consistency
  const expectedId = createGridReceiverId(item.position);
  if (item.id !== expectedId) {
    warnings.push(`ID "${item.id}" does not match position ${item.position} (expected "${expectedId}")`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Assert that a grid item is valid, throw if not
 */
export function assertValidGridItem(item: GridItemType): void {
  const validation = validateGridItem(item);

  if (!validation.isValid) {
    throw new Error(
      `Invalid GridItem: ${validation.errors.join(', ')}. Item: ${JSON.stringify(item)}`
    );
  }

  // Log warnings in development
  if (validation.warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn(
      `GridItem validation warnings for position ${item.position}:`,
      validation.warnings
    );
  }
}

/**
 * Safely convert any item to GridItemType with validation
 * Returns null if conversion fails
 */
export function safeCreateGridItem(
  source: unknown,
  position: number,
  options?: CreateGridItemOptions
): GridItemType | null {
  try {
    // Basic type check
    if (!source || typeof source !== 'object') {
      console.warn('safeCreateGridItem: Invalid source - not an object');
      return null;
    }

    const sourceObj = source as Record<string, unknown>;

    // Must have an id
    if (typeof sourceObj.id !== 'string') {
      console.warn('safeCreateGridItem: Invalid source - missing id');
      return null;
    }

    // Create the grid item
    const gridItem = createGridItem(source as GridItemSource, position, options);

    // Validate
    const validation = validateGridItem(gridItem);
    if (!validation.isValid) {
      console.warn('safeCreateGridItem: Validation failed', validation.errors);
      return null;
    }

    return gridItem;
  } catch (error) {
    console.error('safeCreateGridItem: Unexpected error', error);
    return null;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Update a grid item's position (for moves/swaps)
 */
export function updateGridItemPosition(item: GridItemType, newPosition: number): GridItemType {
  return {
    ...item,
    id: createGridReceiverId(newPosition),
    position: newPosition,
  };
}

/**
 * Check if two grid items can be swapped
 */
export function canSwapGridItems(itemA: GridItemType, itemB: GridItemType): boolean {
  // Both must be matched (have actual items)
  return itemA.matched && itemB.matched;
}

/**
 * Convert GridItemType back to a format suitable for backlog
 * Useful when removing items from grid back to pool
 */
export function gridItemToBacklogFormat(gridItem: GridItemType): Partial<BacklogItem> {
  return {
    id: gridItem.backlogItemId || gridItem.id,
    name: gridItem.title,
    title: gridItem.title,
    description: gridItem.description,
    image_url: gridItem.image_url,
    tags: gridItem.tags,
  };
}

/**
 * Debug helper - log grid item with relevant info
 */
export function logGridItem(gridItem: GridItemType, label = 'GridItem'): void {
  console.log(`🔄 ${label}:`, {
    id: gridItem.id,
    position: gridItem.position,
    title: gridItem.title,
    matched: gridItem.matched,
    backlogItemId: gridItem.backlogItemId,
    hasImageUrl: !!gridItem.image_url,
    imageUrl: gridItem.image_url || 'NONE',
  });
}

/**
 * Normalize item data for consistent display (e.g., drag overlay)
 * Ensures image_url is properly set even if the source has inconsistent data
 */
export function normalizeItemForDisplay<T extends { id: string; image_url?: string | null }>(
  item: T
): T {
  if (!item) return item;

  // Create a normalized copy with consistent image_url handling
  return {
    ...item,
    image_url: item.image_url || undefined,
  };
}
