/**
 * DnD Type Guards and Assertion Helpers
 *
 * Provides runtime type validation for drag-and-drop data contracts.
 * These guards help catch type mismatches early and provide clear error messages.
 */

import { DragEndEvent, DragStartEvent, DragOverEvent, Active, Over } from '@dnd-kit/core';
import { TransferableItem, TransferSourceType } from './transfer-protocol';
import type { GridItemType } from '@/types/match';
import type { BacklogItem } from '@/types/backlog-groups';
import type { CollectionItem } from '@/app/features/Collection/types';
import { dndLogger } from '@/lib/logger';

// ============================================================================
// DnD Data Types (for use with @dnd-kit data.current)
// ============================================================================

/**
 * Data payload for items being dragged from the backlog
 */
export interface BacklogDragData {
  type: 'backlog-item';
  item: BacklogItem;
  groupId?: string;
  sourceType: TransferSourceType;
}

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
 * Union of all drag data types
 */
export type DragData = BacklogDragData | GridDragData | CollectionDragData;

/**
 * Data payload for drop zone receivers
 */
export interface GridSlotDropData {
  type: 'grid-slot';
  position: number;
  isOccupied: boolean;
  occupant?: GridItemType;
}

/**
 * Data payload for collection drop receivers
 */
export interface CollectionDropData {
  type: 'collection-drop';
  collectionId: string;
}

/**
 * Union of all drop receiver data types
 */
export type DropReceiverData = GridSlotDropData | CollectionDropData;

// ============================================================================
// Type Guards for Drag Data
// ============================================================================

/**
 * Type guard to check if data is BacklogDragData
 */
export function isBacklogDragData(data: unknown): data is BacklogDragData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.type === 'backlog-item' &&
    obj.item !== null &&
    typeof obj.item === 'object' &&
    typeof (obj.item as Record<string, unknown>).id === 'string'
  );
}

/**
 * Type guard to check if data is GridDragData
 */
export function isGridDragData(data: unknown): data is GridDragData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.type === 'grid-item' &&
    obj.item !== null &&
    typeof obj.item === 'object' &&
    typeof obj.position === 'number'
  );
}

/**
 * Type guard to check if data is CollectionDragData
 */
export function isCollectionDragData(data: unknown): data is CollectionDragData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.type === 'collection-item' &&
    obj.item !== null &&
    typeof obj.item === 'object' &&
    typeof obj.collectionId === 'string'
  );
}

/**
 * Type guard to check if data is any valid DragData
 */
export function isDragData(data: unknown): data is DragData {
  return isBacklogDragData(data) || isGridDragData(data) || isCollectionDragData(data);
}

// ============================================================================
// Type Guards for Drop Receiver Data
// ============================================================================

/**
 * Type guard to check if data is GridSlotDropData
 */
export function isGridSlotDropData(data: unknown): data is GridSlotDropData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.type === 'grid-slot' &&
    typeof obj.position === 'number' &&
    typeof obj.isOccupied === 'boolean'
  );
}

/**
 * Type guard to check if data is CollectionDropData
 */
export function isCollectionDropData(data: unknown): data is CollectionDropData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return obj.type === 'collection-drop' && typeof obj.collectionId === 'string';
}

/**
 * Type guard to check if data is any valid DropReceiverData
 */
export function isDropReceiverData(data: unknown): data is DropReceiverData {
  return isGridSlotDropData(data) || isCollectionDropData(data);
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
    typeof obj.title === 'string' &&
    typeof obj.position === 'number' &&
    typeof obj.matched === 'boolean'
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
// Event Data Extractors with Type Safety
// ============================================================================

/**
 * Safely extract drag data from a DragStartEvent
 * Returns null if data is missing or invalid
 */
export function extractDragData(event: DragStartEvent | DragEndEvent): DragData | null {
  const data = event.active.data.current;
  if (isDragData(data)) {
    return data;
  }
  return null;
}

/**
 * Safely extract drop receiver data from an Over target
 * Returns null if data is missing or invalid
 */
export function extractDropData(over: Over | null): DropReceiverData | null {
  if (!over?.data?.current) return null;
  const data = over.data.current;
  if (isDropReceiverData(data)) {
    return data;
  }
  return null;
}

/**
 * Extract backlog data specifically, with fallback handling
 */
export function extractBacklogData(active: Active): BacklogDragData | null {
  const data = active.data.current;
  if (isBacklogDragData(data)) {
    return data;
  }
  return null;
}

/**
 * Extract grid data specifically, with fallback handling
 */
export function extractGridData(active: Active): GridDragData | null {
  const data = active.data.current;
  if (isGridDragData(data)) {
    return data;
  }
  return null;
}

// ============================================================================
// Assertion Helpers (throw on type mismatch)
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

/**
 * Assert that event.active contains valid BacklogDragData
 * Throws DndTypeAssertionError if assertion fails
 */
export function assertBacklogDragData(
  active: Active,
  context?: string
): asserts active is Active & { data: { current: BacklogDragData } } {
  const data = active.data.current;
  if (!isBacklogDragData(data)) {
    throw new DndTypeAssertionError(
      'Expected backlog-item drag data',
      'BacklogDragData',
      data,
      context
    );
  }
}

/**
 * Assert that event.active contains valid GridDragData
 * Throws DndTypeAssertionError if assertion fails
 */
export function assertGridDragData(
  active: Active,
  context?: string
): asserts active is Active & { data: { current: GridDragData } } {
  const data = active.data.current;
  if (!isGridDragData(data)) {
    throw new DndTypeAssertionError('Expected grid-item drag data', 'GridDragData', data, context);
  }
}

/**
 * Assert that over contains valid GridSlotDropData
 * Throws DndTypeAssertionError if assertion fails
 */
export function assertGridSlot(
  over: Over | null,
  context?: string
): asserts over is Over & { data: { current: GridSlotDropData } } {
  if (!over) {
    throw new DndTypeAssertionError('Expected drop target, got null', 'Over', null, context);
  }
  const data = over.data.current;
  if (!isGridSlotDropData(data)) {
    throw new DndTypeAssertionError(
      'Expected grid-slot drop data',
      'GridSlotDropData',
      data,
      context
    );
  }
}

/**
 * Assert that an item is a valid GridItemType
 * Throws DndTypeAssertionError if assertion fails
 */
export function assertGridItem(item: unknown, context?: string): asserts item is GridItemType {
  if (!isGridItem(item)) {
    throw new DndTypeAssertionError('Expected valid GridItemType', 'GridItemType', item, context);
  }
}

/**
 * Assert that an item is a valid BacklogItem
 * Throws DndTypeAssertionError if assertion fails
 */
export function assertBacklogItem(item: unknown, context?: string): asserts item is BacklogItem {
  if (!isBacklogItem(item)) {
    throw new DndTypeAssertionError('Expected valid BacklogItem', 'BacklogItem', item, context);
  }
}

/**
 * Assert that an item is a valid TransferableItem
 * Throws DndTypeAssertionError if assertion fails
 */
export function assertTransferableItem(
  item: unknown,
  context?: string
): asserts item is TransferableItem {
  if (!isTransferableItem(item)) {
    throw new DndTypeAssertionError(
      'Expected valid TransferableItem',
      'TransferableItem',
      item,
      context
    );
  }
}

// ============================================================================
// Safe Type Conversions
// ============================================================================

/**
 * Safely convert a BacklogItem to TransferableItem
 */
export function backlogToTransferable(item: BacklogItem): TransferableItem {
  return {
    id: item.id,
    title: item.title || item.name,
    description: item.description,
    image_url: item.image_url,
    tags: item.tags,
    category: item.category,
    subcategory: item.subcategory,
  };
}

/**
 * Safely convert a GridItemType to TransferableItem
 */
export function gridToTransferable(item: GridItemType): TransferableItem | null {
  if (!item.matched) return null;
  return {
    id: item.backlogItemId || item.id,
    title: item.title,
    description: item.description,
    image_url: item.image_url,
    tags: item.tags,
  };
}

/**
 * Create BacklogDragData payload for useDraggable
 */
export function createBacklogDragData(item: BacklogItem, groupId?: string): BacklogDragData {
  return {
    type: 'backlog-item',
    item,
    groupId,
    sourceType: 'backlog',
  };
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
 * Check if an object is a valid CollectionItem
 */
export function isCollectionItem(item: unknown): item is CollectionItem {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.title === 'string';
}

/**
 * Safely convert a CollectionItem to TransferableItem
 */
export function collectionToTransferable(item: CollectionItem): TransferableItem {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    image_url: item.image_url,
    tags: item.tags,
    category: item.category,
    subcategory: item.subcategory,
  };
}

// ============================================================================
// Debug Helpers
// ============================================================================

/**
 * Get a human-readable description of drag data for debugging
 */
export function describeDragData(data: unknown): string {
  if (isBacklogDragData(data)) {
    return `BacklogItem[${data.item.id}] "${data.item.title || data.item.name}"`;
  }
  if (isGridDragData(data)) {
    return `GridItem[${data.item.id}] at position ${data.position}`;
  }
  if (isCollectionDragData(data)) {
    return `CollectionItem[${data.item.id}] from "${data.collectionId}"`;
  }
  if (data === null || data === undefined) {
    return 'No data';
  }
  return `Unknown data type: ${typeof data}`;
}

/**
 * Get a human-readable description of drop data for debugging
 */
export function describeDropData(data: unknown): string {
  if (isGridSlotDropData(data)) {
    return `GridSlot[${data.position}] ${data.isOccupied ? '(occupied)' : '(empty)'}`;
  }
  if (isCollectionDropData(data)) {
    return `CollectionDrop[${data.collectionId}]`;
  }
  if (data === null || data === undefined) {
    return 'No data';
  }
  return `Unknown drop type: ${typeof data}`;
}

/**
 * Log drag event details for debugging
 * Uses structured logger with runtime toggle via window.__DEBUG_GOAT__
 */
export function logDragEvent(
  event: DragStartEvent | DragEndEvent | DragOverEvent,
  eventType: 'start' | 'end' | 'over'
): void {
  const activeData = event.active.data.current;
  const overData = 'over' in event && event.over?.data?.current;

  dndLogger.debug(`DnD ${eventType}`, {
    activeId: event.active.id,
    activeData: describeDragData(activeData),
    overId: 'over' in event ? event.over?.id : undefined,
    overData: overData ? describeDropData(overData) : undefined,
  });
}
