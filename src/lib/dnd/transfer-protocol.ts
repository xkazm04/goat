/**
 * Transfer Protocol - the shared vocabulary of a drop, and the grid slot id.
 *
 * `TransferableItem` is what every payload carries (an alias of BaseItem);
 * `TransferResult` / `TransferAction` name what a drop did; the `grid-{n}`
 * helpers are the ONE spelling of a grid slot address. Drop resolution itself
 * lives in DragOperationRouter (src/lib/dnd/operations) — the router is the
 * single door, and grid-store delegates to it.
 *
 * Corrected 2026-09-05: the header said "See grid-store.ts for the
 * authoritative drag-and-drop implementation"; grid-store's own header says
 * the opposite and has since 2026-08-24. This module also declared a
 * `TransferSource` / `DropReceiver` / `TransferHoverPreview` / `TransferContext`
 * protocol that no module implemented or consumed (knip + grep: 0) — an
 * interface set that read as the architecture while the router did the work.
 * Removed, so the file describes the system that exists.
 */

import type { BaseItem } from '@/types/placed-item';

// ============================================================================
// Core Types
// ============================================================================

/**
 * TransferableItem is an alias for BaseItem, the unified core item data type
 * defined in types/placed-item.ts. Kept as the DnD system's name for it.
 */
export type TransferableItem = BaseItem;

/**
 * Identifies the type of transfer source
 */
export type TransferSourceType =
  | 'backlog'      // Items from backlog/pool
  | 'collection'   // Items from collection panel
  | 'grid'         // Items already in the grid
  | 'external';    // External sources (future: import, clipboard)

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

// ============================================================================
// Grid slot ids
// ============================================================================

/** Canonical grid slot ID prefix. All grid IDs use "grid-{position}" format. */
const GRID_ID_PREFIX = 'grid-';

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
