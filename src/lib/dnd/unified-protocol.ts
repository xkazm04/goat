/**
 * Unified Drag/Drop Protocol
 *
 * Provides a unified data protocol for all drag-and-drop operations across
 * all ranking modes (Podium, Goat, Rushmore, Bracket, Tier List).
 *
 * This extends the existing type-guards.ts with tier-specific types and
 * unified factory functions that work across all modes.
 */

import type { TransferableItem } from './transfer-protocol';
import type { GridItemType } from '@/types/match';
import type { BacklogItem } from '@/types/backlog-groups';
import type { CollectionItem } from '@/app/features/Collection/types';
import { backlogToTransferable, gridToTransferable, collectionToTransferable } from './type-guards';

// ============================================================================
// Unified Source Types
// ============================================================================

/**
 * Source location of a dragged item
 */
export type UnifiedSourceType = 'backlog' | 'grid' | 'tier' | 'unranked-pool';

/**
 * Unified drag data that works across all ranking modes
 */
export interface UnifiedDragData {
  /** Discriminator for the drag data type */
  type: 'collection-item' | 'grid-item' | 'tier-item';

  /** The item being dragged (normalized) */
  item: TransferableItem;

  /** Source context information */
  source: {
    /** Where the item originated from */
    from: UnifiedSourceType;

    /** Grid position if from grid (0-based) */
    gridPosition?: number;

    /** Tier ID if from tier (e.g., 'S', 'A', 'B') */
    tierId?: string;

    /** Order within tier for reordering (0-based) */
    orderInTier?: number;

    /** Collection/group ID if from backlog */
    collectionId?: string;
  };
}

// ============================================================================
// Unified Drop Target Types
// ============================================================================

/**
 * Drop target type for all receivers
 */
export type UnifiedDropType = 'grid-slot' | 'tier-row' | 'tier-item' | 'unranked-pool';

/**
 * Unified drop data for all receivers
 */
export interface UnifiedDropData {
  /** Discriminator for the drop target type */
  type: UnifiedDropType;

  /** Grid position if grid-slot (0-based) */
  position?: number;

  /** Tier ID if tier-row or tier-item */
  tierId?: string;

  /** Tier index (for ordering tiers) */
  tierIndex?: number;

  /** Whether the slot is occupied (grid-slot only) */
  isOccupied?: boolean;

  /** Current occupant data if any */
  occupant?: TransferableItem;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for UnifiedDragData
 */
export function isUnifiedDragData(data: unknown): data is UnifiedDragData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    (obj.type === 'collection-item' || obj.type === 'grid-item' || obj.type === 'tier-item') &&
    obj.item !== null &&
    typeof obj.item === 'object' &&
    obj.source !== null &&
    typeof obj.source === 'object'
  );
}

/**
 * Type guard for UnifiedDropData
 */
export function isUnifiedDropData(data: unknown): data is UnifiedDropData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.type === 'grid-slot' ||
    obj.type === 'tier-row' ||
    obj.type === 'tier-item' ||
    obj.type === 'unranked-pool'
  );
}

/**
 * Type guard specifically for tier drag data
 */
export function isTierDragData(data: unknown): data is UnifiedDragData & { type: 'tier-item' } {
  return isUnifiedDragData(data) && data.type === 'tier-item';
}

/**
 * Type guard specifically for tier row drop data
 */
export function isTierRowDropData(data: unknown): data is UnifiedDropData & { type: 'tier-row' } {
  return isUnifiedDropData(data) && data.type === 'tier-row';
}

/**
 * Type guard for tier item drop data (for reordering)
 */
export function isTierItemDropData(data: unknown): data is UnifiedDropData & { type: 'tier-item' } {
  return isUnifiedDropData(data) && data.type === 'tier-item';
}

/**
 * Type guard for unranked pool drop
 */
export function isUnrankedPoolDropData(data: unknown): data is UnifiedDropData & { type: 'unranked-pool' } {
  return isUnifiedDropData(data) && data.type === 'unranked-pool';
}

// ============================================================================
// Factory Functions - Drag Data
// ============================================================================

/**
 * Create unified drag data for a collection/backlog item
 */
export function createUnifiedCollectionDragData(
  item: CollectionItem | BacklogItem,
  collectionId: string
): UnifiedDragData {
  const transferable = 'category' in item && typeof item.category === 'string'
    ? backlogToTransferable(item as BacklogItem)
    : collectionToTransferable(item as CollectionItem);

  return {
    type: 'collection-item',
    item: transferable,
    source: {
      from: 'backlog',
      collectionId,
    },
  };
}

/**
 * Create unified drag data for a grid item
 */
export function createUnifiedGridDragData(
  item: GridItemType,
  position: number
): UnifiedDragData {
  const transferable = gridToTransferable(item);
  if (!transferable) {
    throw new Error(`Cannot create drag data for unmatched grid item at position ${position}`);
  }

  return {
    type: 'grid-item',
    item: transferable,
    source: {
      from: 'grid',
      gridPosition: position,
    },
  };
}

/**
 * Create unified drag data for a tier item
 */
export function createUnifiedTierDragData(
  item: BacklogItem | TransferableItem,
  tierId: string,
  orderInTier: number
): UnifiedDragData {
  const transferable: TransferableItem = 'category' in item && typeof item.category === 'string'
    ? backlogToTransferable(item as BacklogItem)
    : item as TransferableItem;

  return {
    type: 'tier-item',
    item: transferable,
    source: {
      from: 'tier',
      tierId,
      orderInTier,
    },
  };
}

/**
 * Create unified drag data for an item in the unranked pool
 */
export function createUnifiedUnrankedDragData(
  item: BacklogItem | TransferableItem
): UnifiedDragData {
  const transferable: TransferableItem = 'category' in item && typeof item.category === 'string'
    ? backlogToTransferable(item as BacklogItem)
    : item as TransferableItem;

  return {
    type: 'tier-item',
    item: transferable,
    source: {
      from: 'unranked-pool',
    },
  };
}

// ============================================================================
// Factory Functions - Drop Data
// ============================================================================

/**
 * Create unified drop data for a grid slot
 */
export function createUnifiedGridSlotDropData(
  position: number,
  isOccupied: boolean,
  occupant?: GridItemType
): UnifiedDropData {
  return {
    type: 'grid-slot',
    position,
    isOccupied,
    occupant: occupant && occupant.matched ? gridToTransferable(occupant) || undefined : undefined,
  };
}

/**
 * Create unified drop data for a tier row
 */
export function createUnifiedTierRowDropData(
  tierId: string,
  tierIndex: number
): UnifiedDropData {
  return {
    type: 'tier-row',
    tierId,
    tierIndex,
    isOccupied: false, // Tier rows accept multiple items
  };
}

/**
 * Create unified drop data for a tier item (for reordering)
 */
export function createUnifiedTierItemDropData(
  tierId: string,
  orderInTier: number
): UnifiedDropData {
  return {
    type: 'tier-item',
    tierId,
    position: orderInTier,
  };
}

/**
 * Create unified drop data for the unranked pool
 */
export function createUnifiedUnrankedPoolDropData(): UnifiedDropData {
  return {
    type: 'unranked-pool',
  };
}

// ============================================================================
// Drop Target ID Utilities
// ============================================================================

/**
 * Standard ID patterns for drop targets
 */
export const DROP_ID_PATTERNS = {
  gridSlot: (position: number) => `grid-slot-${position}`,
  tierRow: (tierId: string) => `tier-row-${tierId}`,
  tierItem: (itemId: string) => `tier-item-${itemId}`,
  unrankedPool: 'unranked-pool',
} as const;

/**
 * Parse a drop target ID to extract type and metadata
 */
export function parseDropTargetId(id: string): {
  type: UnifiedDropType | 'unknown';
  position?: number;
  tierId?: string;
  itemId?: string;
} {
  if (id.startsWith('grid-slot-')) {
    const position = parseInt(id.slice(10), 10);
    return { type: 'grid-slot', position: isNaN(position) ? undefined : position };
  }

  if (id.startsWith('tier-row-')) {
    return { type: 'tier-row', tierId: id.slice(9) };
  }

  if (id.startsWith('tier-item-')) {
    return { type: 'tier-item', itemId: id.slice(10) };
  }

  if (id === 'unranked-pool') {
    return { type: 'unranked-pool' };
  }

  // Fallback: check for legacy patterns
  if (id.startsWith('drop-')) {
    const position = parseInt(id.slice(5), 10);
    return { type: 'grid-slot', position: isNaN(position) ? undefined : position };
  }

  return { type: 'unknown' };
}

/**
 * Check if an ID matches a grid slot pattern
 */
export function isGridSlotId(id: string): boolean {
  return id.startsWith('grid-slot-') || id.startsWith('drop-');
}

/**
 * Check if an ID matches a tier row pattern
 */
export function isTierRowId(id: string): boolean {
  return id.startsWith('tier-row-');
}

/**
 * Check if an ID matches a tier item pattern
 */
export function isTierItemId(id: string): boolean {
  return id.startsWith('tier-item-');
}

// ============================================================================
// Debug Helpers
// ============================================================================

/**
 * Get human-readable description of unified drag data
 */
export function describeUnifiedDragData(data: unknown): string {
  if (!isUnifiedDragData(data)) {
    return `Invalid drag data: ${typeof data}`;
  }

  const { type, item, source } = data;
  let desc = `${type}[${item.id}] "${item.title}"`;

  if (source.from === 'grid' && source.gridPosition !== undefined) {
    desc += ` from grid position ${source.gridPosition}`;
  } else if (source.from === 'tier' && source.tierId) {
    desc += ` from tier ${source.tierId}`;
    if (source.orderInTier !== undefined) {
      desc += ` at index ${source.orderInTier}`;
    }
  } else if (source.from === 'backlog' && source.collectionId) {
    desc += ` from collection "${source.collectionId}"`;
  } else if (source.from === 'unranked-pool') {
    desc += ` from unranked pool`;
  }

  return desc;
}

/**
 * Get human-readable description of unified drop data
 */
export function describeUnifiedDropData(data: unknown): string {
  if (!isUnifiedDropData(data)) {
    return `Invalid drop data: ${typeof data}`;
  }

  switch (data.type) {
    case 'grid-slot':
      return `GridSlot[${data.position}] ${data.isOccupied ? '(occupied)' : '(empty)'}`;
    case 'tier-row':
      return `TierRow[${data.tierId}]`;
    case 'tier-item':
      return `TierItem in ${data.tierId} at ${data.position}`;
    case 'unranked-pool':
      return 'UnrankedPool';
    default:
      return `Unknown drop type`;
  }
}

// ============================================================================
// Transfer Route Determination
// ============================================================================

/**
 * Possible transfer routes between sources and targets
 */
export type TransferRoute =
  | 'backlog-to-grid'
  | 'backlog-to-tier'
  | 'grid-to-grid'
  | 'grid-to-tier'
  | 'tier-to-grid'
  | 'tier-to-tier-same'
  | 'tier-to-tier-different'
  | 'tier-to-unranked'
  | 'unranked-to-tier'
  | 'unranked-to-grid'
  | 'unknown';

/**
 * Determine the transfer route based on drag and drop data
 */
export function determineTransferRoute(
  dragData: UnifiedDragData,
  dropData: UnifiedDropData
): TransferRoute {
  const { source } = dragData;
  const { type: dropType } = dropData;

  // From backlog/collection
  if (source.from === 'backlog') {
    if (dropType === 'grid-slot') return 'backlog-to-grid';
    if (dropType === 'tier-row') return 'backlog-to-tier';
  }

  // From grid
  if (source.from === 'grid') {
    if (dropType === 'grid-slot') return 'grid-to-grid';
    if (dropType === 'tier-row') return 'grid-to-tier';
  }

  // From tier
  if (source.from === 'tier') {
    if (dropType === 'grid-slot') return 'tier-to-grid';
    if (dropType === 'unranked-pool') return 'tier-to-unranked';
    if (dropType === 'tier-row' || dropType === 'tier-item') {
      if (dropData.tierId === source.tierId) return 'tier-to-tier-same';
      return 'tier-to-tier-different';
    }
  }

  // From unranked pool
  if (source.from === 'unranked-pool') {
    if (dropType === 'grid-slot') return 'unranked-to-grid';
    if (dropType === 'tier-row') return 'unranked-to-tier';
  }

  return 'unknown';
}
