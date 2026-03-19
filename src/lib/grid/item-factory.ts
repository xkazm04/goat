/**
 * GridItemFactory - Centralized conversion for BacklogItem to GridItemType
 *
 * This module provides a single source of truth for converting backlog items
 * to grid items, ensuring consistent image_url handling and validation across
 * the application.
 *
 * NOTE: This module delegates to ItemTransformer for core transformations.
 * Grid-specific utilities (validation, logging) are preserved here.
 */

import { TransferableItem } from '@/lib/dnd';
import {
  normalizeImageUrl,
  extractTitle,
  toGridItem,
  createEmptyGridSlot as createEmptySlot,
  createEmptyGrid as createEmptyGridArray,
  updateGridItemPosition as updatePosition,
  gridToBacklog,
  validateGridItem as validateGrid,
  normalizeForDisplay,
  type CreateGridItemOptions,
  type ItemValidation,
} from '@/lib/items';
import { gridLogger, validationLogger } from '@/lib/logger';
import { BacklogItem } from '@/types/backlog-groups';
import { GridItemType } from '@/types/match';

// ============================================================================
// Types
// ============================================================================

/**
 * Source item types that can be converted to GridItemType
 */
export type GridItemSource = BacklogItem | TransferableItem | Partial<GridItemType>;

// Re-export options type for backward compatibility
export type { CreateGridItemOptions };

/**
 * Validation result for grid items
 * @deprecated Use ItemValidation from @/lib/items instead
 */
export type GridItemValidation = ItemValidation;

// ============================================================================
// Core Factory Functions
// ============================================================================

// Re-export core utilities from ItemTransformer
export { normalizeImageUrl, extractTitle };

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
  return toGridItem(source, position, options);
}

/**
 * Create an empty grid slot at a position
 */
export function createEmptyGridSlot(position: number): GridItemType {
  return createEmptySlot(position);
}

/**
 * Create multiple empty grid slots
 */
export function createEmptyGrid(size: number): GridItemType[] {
  return createEmptyGridArray(size);
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a grid item for required fields and consistency
 */
export function validateGridItem(item: GridItemType): GridItemValidation {
  return validateGrid(item);
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

  // Log warnings (controlled by debug config)
  if (validation.warnings.length > 0) {
    validationLogger.warn(`GridItem validation warnings for position ${item.position}`, validation.warnings);
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
      validationLogger.warn('safeCreateGridItem: Invalid source - not an object');
      return null;
    }

    const sourceObj = source as Record<string, unknown>;

    // Must have an id
    if (typeof sourceObj.id !== 'string') {
      validationLogger.warn('safeCreateGridItem: Invalid source - missing id');
      return null;
    }

    // Create the grid item using ItemTransformer
    const gridItem = toGridItem(source, position, options);

    // Validate
    const validation = validateGridItem(gridItem);
    if (!validation.isValid) {
      validationLogger.warn('safeCreateGridItem: Validation failed', validation.errors);
      return null;
    }

    return gridItem;
  } catch (error) {
    validationLogger.error('safeCreateGridItem: Unexpected error', error);
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
  return updatePosition(item, newPosition);
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
  return gridToBacklog(gridItem);
}

/**
 * Debug helper - log grid item with relevant info
 * Uses structured logger with runtime toggle via window.__DEBUG_GOAT__
 */
export function logGridItem(gridItem: GridItemType, label = 'GridItem'): void {
  gridLogger.debug(label, {
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
  return normalizeForDisplay(item);
}
