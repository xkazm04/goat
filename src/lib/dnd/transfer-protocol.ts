/**
 * TransferProtocol - Universal Source-Target Transfer Abstraction
 *
 * This module provides a unified interface for drag-and-drop transfer operations
 * across the application. It normalizes the interaction model between different
 * sources (Collection, Backlog, Grid) and targets (Grid positions, Lists, etc.)
 *
 * Key concepts:
 * - TransferableItem: Any item that can be dragged (backlog items, grid items, collection items)
 * - DropReceiver: Any target that can receive items (grid positions, collection areas)
 * - TransferResult: The outcome of a transfer operation
 * - TransferContext: Contextual information during a transfer
 *
 * ## ACTIVE EXPORTS (used by grid-store, etc.):
 * - extractGridPosition(), createGridReceiverId(), isGridReceiverId() - ID utilities
 * - toTransferableItem() - Conversion utility
 * - TransferableItem, TransferResult interfaces - Type definitions
 *
 * ## DEPRECATED EXPORTS (class-based system not in use):
 * - TransferProtocol class - The store-based approach in grid-store is preferred
 * - Factory functions (createBacklogSource, createGridPositionReceiver, etc.)
 * - getGlobalTransferProtocol, resetGlobalTransferProtocol
 *
 * See grid-store.ts for the authoritative drag-and-drop implementation.
 */

import { DragEndEvent, DragStartEvent, DragOverEvent, DragCancelEvent } from '@dnd-kit/core';

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
// Transfer Protocol Implementation
// ============================================================================

/**
 * TransferProtocol manages the registration and coordination of sources and receivers
 *
 * @deprecated This class-based approach is NOT CURRENTLY USED.
 * The grid-store.handleDragEnd is the authoritative drag handler.
 * Use the utility functions (extractGridPosition, isGridReceiverId, etc.) instead.
 */
export class TransferProtocol<T extends TransferableItem = TransferableItem> {
  private sources: Map<string, TransferSource<T>> = new Map();
  private receivers: Map<string, DropReceiver<T>> = new Map();
  private activeContext: TransferContext<T> | null = null;

  // Event callbacks
  private onTransferStart?: (context: TransferContext<T>) => void;
  private onTransferEnd?: (result: TransferResult, context: TransferContext<T>) => void;
  private onTransferCancel?: (context: TransferContext<T>) => void;

  constructor(options?: {
    onTransferStart?: (context: TransferContext<T>) => void;
    onTransferEnd?: (result: TransferResult, context: TransferContext<T>) => void;
    onTransferCancel?: (context: TransferContext<T>) => void;
  }) {
    this.onTransferStart = options?.onTransferStart;
    this.onTransferEnd = options?.onTransferEnd;
    this.onTransferCancel = options?.onTransferCancel;
  }

  /**
   * Register a transfer source
   */
  registerSource(source: TransferSource<T>): void {
    this.sources.set(source.sourceId, source);
  }

  /**
   * Unregister a transfer source
   */
  unregisterSource(sourceId: string): void {
    this.sources.delete(sourceId);
  }

  /**
   * Register a drop receiver
   */
  registerReceiver(receiver: DropReceiver<T>): void {
    this.receivers.set(receiver.receiverId, receiver);
  }

  /**
   * Unregister a drop receiver
   */
  unregisterReceiver(receiverId: string): void {
    this.receivers.delete(receiverId);
  }

  /**
   * Get all registered sources
   */
  getSources(): TransferSource<T>[] {
    return Array.from(this.sources.values());
  }

  /**
   * Get all registered receivers
   */
  getReceivers(): DropReceiver<T>[] {
    return Array.from(this.receivers.values());
  }

  /**
   * Find a source by ID
   */
  getSource(sourceId: string): TransferSource<T> | undefined {
    return this.sources.get(sourceId);
  }

  /**
   * Find a receiver by ID
   */
  getReceiver(receiverId: string): DropReceiver<T> | undefined {
    return this.receivers.get(receiverId);
  }

  /**
   * Get the current transfer context (if a drag is active)
   */
  getActiveContext(): TransferContext<T> | null {
    return this.activeContext;
  }

  /**
   * Find which source contains an item by ID
   */
  findSourceForItem(itemId: string): { source: TransferSource<T>; item: T } | null {
    const sources = Array.from(this.sources.values());
    for (const source of sources) {
      const item = source.getItem(itemId);
      if (item) {
        return { source, item };
      }
    }
    return null;
  }

  /**
   * Handle drag start event
   */
  handleDragStart(event: DragStartEvent): TransferContext<T> | null {
    const itemId = String(event.active.id);
    const result = this.findSourceForItem(itemId);

    if (!result) {
      // Source not found - this is expected in some cases (e.g., external drag)
      return null;
    }

    const { source, item } = result;

    this.activeContext = {
      item,
      source,
      startTime: Date.now(),
    };

    source.onItemDragStart?.(item);
    this.onTransferStart?.(this.activeContext);

    return this.activeContext;
  }

  /**
   * Handle drag over event
   */
  handleDragOver(event: DragOverEvent): TransferHoverPreview | null {
    if (!this.activeContext) return null;

    const { over } = event;
    if (!over) {
      this.activeContext.currentReceiver = undefined;
      return null;
    }

    const receiverId = String(over.id);
    const receiver = this.receivers.get(receiverId);

    if (!receiver) {
      this.activeContext.currentReceiver = undefined;
      return null;
    }

    this.activeContext.currentReceiver = receiver;

    if (receiver.getHoverPreview) {
      return receiver.getHoverPreview(this.activeContext.item);
    }

    // Default preview based on canReceive
    return {
      canDrop: receiver.canReceive(this.activeContext.item, this.activeContext.source),
      action: 'assign',
    };
  }

  /**
   * Handle drag end event
   */
  handleDragEnd(event: DragEndEvent): TransferResult {
    if (!this.activeContext) {
      return { success: false, action: 'reject', error: 'No active transfer context' };
    }

    const { active, over } = event;
    const context = this.activeContext;

    // Clear context first
    this.activeContext = null;

    if (!over) {
      context.source.onDragCancel?.(context.item);
      this.onTransferCancel?.(context);
      return { success: false, action: 'reject', error: 'No drop target' };
    }

    const receiverId = String(over.id);
    const receiver = this.receivers.get(receiverId);

    if (!receiver) {
      context.source.onDragCancel?.(context.item);
      this.onTransferCancel?.(context);
      return { success: false, action: 'reject', error: `Unknown receiver: ${receiverId}` };
    }

    if (!receiver.canReceive(context.item, context.source)) {
      context.source.onDragCancel?.(context.item);
      this.onTransferCancel?.(context);
      return { success: false, action: 'reject', error: 'Receiver rejected the item' };
    }

    // Perform the transfer
    const result = receiver.receive(context.item, context.source);

    if (result.success) {
      context.source.onItemTransferred?.(context.item, receiver.type, receiver.receiverId);
    }

    this.onTransferEnd?.(result, context);

    return result;
  }

  /**
   * Handle drag cancel event
   */
  handleDragCancel(event: DragCancelEvent): void {
    if (!this.activeContext) return;

    const context = this.activeContext;
    this.activeContext = null;

    context.source.onDragCancel?.(context.item);
    this.onTransferCancel?.(context);
  }

  /**
   * Update distance during drag
   */
  updateDragDistance(distance: number, delta: { x: number; y: number }): void {
    if (this.activeContext) {
      this.activeContext.distance = distance;
      this.activeContext.delta = delta;
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract position from a grid receiver ID (e.g., 'grid-5' -> 5)
 */
export function extractGridPosition(receiverId: string): number | null {
  if (!receiverId.startsWith('grid-')) return null;
  const position = parseInt(receiverId.replace('grid-', ''), 10);
  return isNaN(position) ? null : position;
}

/**
 * Create a grid receiver ID from a position
 */
export function createGridReceiverId(position: number): string {
  return `grid-${position}`;
}

/**
 * Check if an ID is a grid receiver ID
 */
export function isGridReceiverId(id: string): boolean {
  return id.startsWith('grid-');
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

// ============================================================================
// Factory Functions for Common Patterns
// ============================================================================
// @deprecated The factory functions below are NOT CURRENTLY USED.
// They were designed for the TransferProtocol class-based system.
// Use grid-store.handleDragEnd directly instead.

/**
 * Create a backlog source adapter
 * @deprecated Use grid-store.handleDragEnd instead
 */
export function createBacklogSource<T extends TransferableItem>(
  sourceId: string,
  getItemFn: (itemId: string) => T | null,
  options?: {
    onDragStart?: (item: T) => void;
    onTransferred?: (item: T) => void;
  }
): TransferSource<T> {
  return {
    type: 'backlog',
    sourceId,
    getItem: getItemFn,
    onItemDragStart: options?.onDragStart,
    onItemTransferred: options?.onTransferred,
  };
}

/**
 * Create a grid source adapter for items already in the grid
 */
export function createGridSource<T extends TransferableItem>(
  sourceId: string,
  getItemFn: (itemId: string) => T | null
): TransferSource<T> {
  return {
    type: 'grid',
    sourceId,
    getItem: getItemFn,
  };
}

/**
 * Create a collection source adapter
 */
export function createCollectionSource<T extends TransferableItem>(
  sourceId: string,
  getItemFn: (itemId: string) => T | null,
  options?: {
    onDragStart?: (item: T) => void;
    onReordered?: (item: T, oldIndex: number, newIndex: number) => void;
  }
): TransferSource<T> {
  return {
    type: 'collection',
    sourceId,
    getItem: getItemFn,
    onItemDragStart: options?.onDragStart,
  };
}

/**
 * Create a grid position receiver
 */
export function createGridPositionReceiver<T extends TransferableItem>(
  position: number,
  options: {
    isOccupied: () => boolean;
    getOccupant: () => T | null;
    onAssign: (item: T) => void;
    onSwap: (incoming: T, existing: T) => void;
    onMove: (item: T, fromPosition: number) => void;
  }
): DropReceiver<T> {
  return {
    type: 'grid-position',
    receiverId: createGridReceiverId(position),

    canReceive: (item, source) => {
      // Grid items can move/swap, backlog items need empty slot or swap
      if (source.type === 'grid') {
        return true; // Always allow moves/swaps within grid
      }
      return true; // Allow backlog items (will swap if occupied)
    },

    receive: (item, source) => {
      const isOccupied = options.isOccupied();
      const occupant = options.getOccupant();

      if (source.type === 'grid') {
        // Moving within grid
        const fromPosition = extractGridPosition(item.id);
        if (fromPosition !== null) {
          if (isOccupied && occupant) {
            options.onSwap(item, occupant);
            return {
              success: true,
              action: 'swap',
              item,
              metadata: { fromPosition, toPosition: position, wasSwap: true },
            };
          } else {
            options.onMove(item, fromPosition);
            return {
              success: true,
              action: 'move',
              item,
              metadata: { fromPosition, toPosition: position },
            };
          }
        }
      }

      // Assigning from backlog/collection
      if (isOccupied && occupant) {
        options.onSwap(item, occupant);
        return {
          success: true,
          action: 'swap',
          item,
          metadata: { toPosition: position, wasSwap: true },
        };
      }

      options.onAssign(item);
      return {
        success: true,
        action: 'assign',
        item,
        metadata: { toPosition: position },
      };
    },

    getHoverPreview: (item) => {
      const isOccupied = options.isOccupied();
      const occupant = options.getOccupant();

      return {
        canDrop: true,
        action: isOccupied ? 'swap' : 'assign',
        displacedItem: isOccupied ? occupant ?? undefined : undefined,
        previewPosition: position,
      };
    },
  };
}

/**
 * Create a collection list receiver for reordering
 */
export function createCollectionListReceiver<T extends TransferableItem>(
  receiverId: string,
  options: {
    getItems: () => T[];
    getItemIndex: (itemId: string) => number;
    onReorder: (oldIndex: number, newIndex: number) => void;
  }
): DropReceiver<T> {
  return {
    type: 'collection-list',
    receiverId,

    canReceive: (item, source) => {
      // Only accept items from the same collection for reordering
      return source.type === 'collection' && source.sourceId === receiverId;
    },

    receive: (item, source) => {
      const oldIndex = options.getItemIndex(item.id);
      const newIndex = options.getItemIndex(receiverId); // This would be the target item's ID

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        return { success: false, action: 'reject', error: 'Invalid indices' };
      }

      options.onReorder(oldIndex, newIndex);

      return {
        success: true,
        action: 'reorder',
        item,
        metadata: { oldIndex, newIndex },
      };
    },
  };
}

// ============================================================================
// Singleton Instance (optional - for global protocol)
// ============================================================================
// @deprecated The global protocol pattern is NOT CURRENTLY USED.
// Use grid-store.handleDragEnd as the single source of truth instead.

let globalProtocol: TransferProtocol | null = null;

/**
 * Get or create the global transfer protocol instance
 * @deprecated Use grid-store.handleDragEnd instead
 */
export function getGlobalTransferProtocol(): TransferProtocol {
  if (!globalProtocol) {
    globalProtocol = new TransferProtocol();
  }
  return globalProtocol;
}

/**
 * Reset the global transfer protocol (useful for testing)
 */
export function resetGlobalTransferProtocol(): void {
  globalProtocol = null;
}

export default TransferProtocol;
