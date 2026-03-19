/**
 * Transfer Protocol - Types and Utilities for Drag-and-Drop
 *
 * Provides type definitions and utility functions for drag-and-drop operations.
 * See grid-store.ts for the authoritative drag-and-drop implementation.
 *
 * Exports:
 * - TransferableItem, TransferResult, etc. - Type definitions
 * - extractGridPosition(), createGridReceiverId(), isGridReceiverId() - ID utilities
 * - toTransferableItem() - Conversion utility
 */

// ============================================================================
// Core Interfaces
// ============================================================================

/**
 * Base interface for any item that can be transferred via drag-and-drop
 */
export interface TransferableItem {
  /** Unique identifier for the item */
  id: string;
  /** Human-readable title */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional image URL */
  image_url?: string | null;
  /** Optional tags for categorization */
  tags?: string[];
  /** Item category */
  category?: string;
  /** Item subcategory */
  subcategory?: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Identifies the type of transfer source
 */
export type TransferSourceType =
  | 'backlog'      // Items from backlog/pool
  | 'collection'   // Items from collection panel
  | 'grid'         // Items already in the grid
  | 'external';    // External sources (future: import, clipboard)

/**
 * Identifies the type of drop receiver
 */
export type DropReceiverType =
  | 'grid-position'    // A specific position in the ranking grid
  | 'collection-list'  // A collection list (for reordering)
  | 'trash'            // Remove/delete zone
  | 'compare'          // Comparison panel
  | 'external';        // External targets (future: export)

/**
 * Interface for sources that provide transferable items
 */
export interface TransferSource<T extends TransferableItem = TransferableItem> {
  /** Type of this source */
  type: TransferSourceType;
  /** Unique identifier for this source instance */
  sourceId: string;
  /** Get an item by ID from this source */
  getItem: (itemId: string) => T | null;
  /** Called when an item starts being dragged from this source */
  onItemDragStart?: (item: T) => void;
  /** Called when a drag from this source is cancelled */
  onDragCancel?: (item: T) => void;
  /** Called when an item is successfully transferred out of this source */
  onItemTransferred?: (item: T, receiver: DropReceiverType, receiverId: string) => void;
}

/**
 * Interface for targets that can receive transferred items
 */
export interface DropReceiver<T extends TransferableItem = TransferableItem> {
  /** Type of this receiver */
  type: DropReceiverType;
  /** Unique identifier for this receiver instance (e.g., 'grid-5' for position 5) */
  receiverId: string;
  /** Check if this receiver can accept the given item */
  canReceive: (item: T, source: TransferSource<T>) => boolean;
  /** Handle receiving an item - returns true if successful */
  receive: (item: T, source: TransferSource<T>) => TransferResult;
  /** Optional: Get preview data while hovering */
  getHoverPreview?: (item: T) => TransferHoverPreview | null;
}

/**
 * Result of a transfer operation
 */
export interface TransferResult {
  /** Whether the transfer was successful */
  success: boolean;
  /** Type of action performed */
  action: TransferAction;
  /** The transferred item (potentially transformed) */
  item?: TransferableItem;
  /** Error message if transfer failed */
  error?: string;
  /** Additional data about the transfer */
  metadata?: {
    /** Source position (for grid moves) */
    fromPosition?: number;
    /** Target position (for grid assignments) */
    toPosition?: number;
    /** Old index (for list reordering) */
    oldIndex?: number;
    /** New index (for list reordering) */
    newIndex?: number;
    /** Whether items were swapped */
    wasSwap?: boolean;
  };
}

/**
 * Types of transfer actions
 */
export type TransferAction =
  | 'assign'    // New item assigned to empty slot
  | 'move'      // Item moved within same container
  | 'swap'      // Two items exchanged positions
  | 'reorder'   // Item reordered in list
  | 'remove'    // Item removed from container
  | 'copy'      // Item copied (source remains)
  | 'reject';   // Transfer was rejected

/**
 * Preview information shown while hovering over a receiver
 */
export interface TransferHoverPreview {
  /** Whether the drop would be accepted */
  canDrop: boolean;
  /** Action that would occur */
  action: TransferAction;
  /** Item that would be displaced (for swaps) */
  displacedItem?: TransferableItem;
  /** Preview position */
  previewPosition?: number;
}

/**
 * Context maintained during a transfer operation
 */
export interface TransferContext<T extends TransferableItem = TransferableItem> {
  /** The item being transferred */
  item: T;
  /** Source of the transfer */
  source: TransferSource<T>;
  /** Current receiver (if hovering over one) */
  currentReceiver?: DropReceiver<T>;
  /** Start time of the drag */
  startTime: number;
  /** Current drag distance */
  distance?: number;
  /** Delta from start position */
  delta?: { x: number; y: number };
}


// ============================================================================
// Utility Functions
// ============================================================================

/** Canonical grid slot ID prefix. All grid IDs use "grid-{position}" format. */
export const GRID_ID_PREFIX = 'grid-';

/**
 * Extract position from a grid receiver ID (e.g., 'grid-5' -> 5)
 */
export function extractGridPosition(receiverId: string): number | null {
  if (!isGridReceiverId(receiverId)) return null;
  const position = parseInt(receiverId.slice(GRID_ID_PREFIX.length), 10);
  return isNaN(position) ? null : position;
}

/**
 * Create a grid receiver ID from a position
 */
export function createGridReceiverId(position: number): string {
  return `${GRID_ID_PREFIX}${position}`;
}

/**
 * Check if an ID is a canonical grid receiver ID ("grid-{n}").
 * Excludes legacy "grid-slot-" and "drop-" patterns.
 */
export function isGridReceiverId(id: string): boolean {
  if (!id.startsWith(GRID_ID_PREFIX)) return false;
  // Exclude "grid-slot-*" which would false-match on the "grid-" prefix
  if (id.startsWith('grid-slot-')) return false;
  return true;
}

/**
 * Assert that a droppable ID uses the canonical grid format in development.
 * Logs a warning for legacy "grid-slot-" or "drop-" patterns.
 */
export function assertCanonicalGridId(id: string, context?: string): void {
  if (process.env.NODE_ENV !== 'development') return;

  if (id.startsWith('grid-slot-') || (/^drop-\d+$/.test(id))) {
    console.warn(
      `[DnD] Non-canonical grid ID "${id}" detected${context ? ` in ${context}` : ''}. ` +
      `Use createGridReceiverId(position) to generate "grid-{n}" IDs.`
    );
  }
}

/**
 * Convert any item to TransferableItem format
 */
export function toTransferableItem(item: unknown): TransferableItem | null {
  if (!item || typeof item !== 'object') return null;

  const obj = item as Record<string, unknown>;

  if (typeof obj.id !== 'string') return null;

  return {
    id: obj.id,
    title: (obj.title as string) || (obj.name as string) || '',
    description: obj.description as string | undefined,
    image_url: obj.image_url as string | null | undefined,
    tags: Array.isArray(obj.tags) ? obj.tags : undefined,
    category: obj.category as string | undefined,
    subcategory: obj.subcategory as string | undefined,
    metadata: obj.metadata as Record<string, unknown> | undefined,
  };
}

