/**
 * Unified Drag/Drop Protocol — the tier-mode payloads.
 *
 * Extends type-guards.ts (backlog / grid / collection payloads) with the
 * shapes the tier list sends: a tier item is a `useSortable` carrying
 * `UnifiedDragData` (TierItem.tsx), a tier row is a `useDroppable` carrying
 * `UnifiedDropData` of type 'tier-row' (TierRow.tsx), and the unranked pool is
 * a droppable of type 'unranked-pool'. DragOperationRouter.parseSource /
 * parseTarget read exactly these.
 *
 * Corrected 2026-09-05: this module also carried a second drop-id grammar
 * (`DROP_ID_PATTERNS`, `parseDropTargetId`, `isTierRowId`, ...) that spelled
 * tier rows `tier-row-${id}` while the live surface registers them as
 * `tier-${tier.id}` and the router matches `startsWith('tier-')`. It had zero
 * consumers (knip + grep), so two grammars for one rule were reduced to the
 * one the surface uses. Six factories, three guards, two describers and
 * `determineTransferRoute` went with it, each at zero consumers.
 */

import { backlogToTransferable } from './type-guards';

import type { TransferableItem } from './transfer-protocol';
import type { BacklogItem } from '@/types/backlog-groups';

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
 * Type guard specifically for tier row drop data
 */
export function isTierRowDropData(data: unknown): data is UnifiedDropData & { type: 'tier-row' } {
  return isUnifiedDropData(data) && data.type === 'tier-row';
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create unified drag data for a tier item (TierItem.tsx, via useSortable)
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
 * Create unified drop data for a tier row (TierRow.tsx, via useDroppable)
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
