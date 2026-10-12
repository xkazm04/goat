/**
 * DnD payload shapes, item guards and the factories the surfaces call.
 *
 * The payload a surface hands `useDraggable` / `useDroppable` is what
 * DragOperationRouter.parseSource / parseTarget read on drop, so the factories
 * here ARE the contract: ConfigurableCollectionItem and MobileBacklogPanel send
 * `createCollectionDragData`, SimpleDropZone sends `createGridDragData` and
 * `createGridSlotDropData`, PhysicsGridSlot sends `createGridSlotDropData`.
 *
 * Corrected 2026-09-05: this module also exported six `assert*` helpers, four
 * `extract*` event readers, per-shape `is*DragData` / `is*DropData` guards, two
 * describers and `logDragEvent` — 0 consumers each (knip + grep). The router
 * never used them; it reads `data.type` itself. Removed. What stays is what a
 * caller in this tree actually reaches for.
 *
 * NOTE: Uses ItemTransformer for conversion functions.
 */

import {
  backlogToTransferable as transformBacklogToTransferable,
  gridToTransferable as transformGridToTransferable,
  normalizeImageUrl,
  extractTitle,
} from '@/lib/items';

import { TransferableItem, TransferSourceType } from './transfer-protocol';

import type { CollectionItem } from '@/app/features/Collection/types';
import type { BacklogItem } from '@/types/backlog-groups';
import type { GridItemType } from '@/types/match';

// ============================================================================
// DnD Data Types (for use with @dnd-kit data.current)
// ============================================================================

/**
 * Data payload for items being dragged from the grid
 */
export interface GridDragData {
  type: 'grid-item';
  item: GridItemType;
  position: number;
  sourceType: TransferSourceType;
}

/**
 * Data payload for items being dragged from a collection
 */
export interface CollectionDragData {
  type: 'collection-item';
  item: TransferableItem;
  collectionId: string;
  sourceType: TransferSourceType;
}

/**
 * Data payload for drop zone receivers
 */
export interface GridSlotDropData {
  type: 'grid-slot';
  position: number;
  isOccupied: boolean;
  occupant?: GridItemType;
}

// ============================================================================
// Type Guards for Items (raw item validation)
// ============================================================================

/**
 * Type guard to check if an object is a valid GridItemType
 */
export function isGridItem(item: unknown): item is GridItemType {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.position === 'number' &&
    obj.context !== null &&
    typeof obj.context === 'object' &&
    typeof (obj.context as Record<string, unknown>).matched === 'boolean'
  );
}

/**
 * Type guard to check if an object is a valid BacklogItem
 */
export function isBacklogItem(item: unknown): item is BacklogItem {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    (typeof obj.name === 'string' || typeof obj.title === 'string') &&
    typeof obj.category === 'string'
  );
}

/**
 * Type guard to check if an object is a valid TransferableItem
 */
export function isTransferableItem(item: unknown): item is TransferableItem {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.title === 'string';
}

// ============================================================================
// Assertion error (thrown by the tier operations on an unconvertible payload)
// ============================================================================

/**
 * DnD type assertion error with helpful debugging info
 */
export class DndTypeAssertionError extends Error {
  constructor(
    message: string,
    public readonly expectedType: string,
    public readonly actualData: unknown,
    public readonly context?: string
  ) {
    super(
      `[DnD Type Error] ${message}\n` +
        `Expected: ${expectedType}\n` +
        `Received: ${JSON.stringify(actualData, null, 2)}\n` +
        (context ? `Context: ${context}` : '')
    );
    this.name = 'DndTypeAssertionError';
  }
}

// ============================================================================
// Safe Type Conversions (delegating to ItemTransformer)
// ============================================================================

/**
 * Safely convert a BacklogItem to TransferableItem
 * Uses ItemTransformer for consistent conversion logic
 */
export function backlogToTransferable(item: BacklogItem): TransferableItem {
  return transformBacklogToTransferable(item);
}

/**
 * Safely convert a GridItemType to TransferableItem
 * Uses ItemTransformer for consistent conversion logic
 */
export function gridToTransferable(item: GridItemType): TransferableItem | null {
  return transformGridToTransferable(item);
}

/**
 * Create GridDragData payload for useDraggable
 */
export function createGridDragData(item: GridItemType): GridDragData {
  return {
    type: 'grid-item',
    item,
    position: item.position,
    sourceType: 'grid',
  };
}

/**
 * Create GridSlotDropData payload for useDroppable
 */
export function createGridSlotDropData(
  position: number,
  isOccupied: boolean,
  occupant?: GridItemType
): GridSlotDropData {
  return {
    type: 'grid-slot',
    position,
    isOccupied,
    occupant,
  };
}

/**
 * Create CollectionDragData payload for useDraggable (collection items)
 */
export function createCollectionDragData(
  item: CollectionItem,
  collectionId: string
): CollectionDragData {
  return {
    type: 'collection-item',
    item: collectionToTransferable(item),
    collectionId,
    sourceType: 'collection',
  };
}

/**
 * Safely convert a CollectionItem to TransferableItem
 */
export function collectionToTransferable(item: CollectionItem): TransferableItem {
  return {
    id: item.id,
    title: extractTitle(item),
    description: item.description,
    image_url: normalizeImageUrl(item.image_url),
    tags: item.tags,
    category: item.category,
    subcategory: item.subcategory,
  };
}
