/**
 * DragOperation Types
 *
 * Unified type definitions for the drag-and-drop operation system.
 * These types define the contract for all drag operations across the application.
 */

import type { DragEndEvent } from '@dnd-kit/core';
import type { TransferableItem, TransferResult, TransferAction } from '../transfer-protocol';
import type { GridItemType } from '@/types/match';
import type { BacklogItem } from '@/types/backlog-groups';
import type { ValidationErrorCode, ValidationResult } from '@/lib/validation';

// ============================================================================
// Operation Types
// ============================================================================

/**
 * All possible drag operation types
 */
export type DragOperationType =
  | 'assign'           // Backlog/Collection → Grid (new item)
  | 'move'             // Grid → Grid (to empty slot)
  | 'swap'             // Grid → Grid (exchange positions)
  | 'tier-assign'      // Backlog/Collection → Tier
  | 'tier-move'        // Tier → Tier (same tier reorder)
  | 'tier-transfer'    // Tier → Different Tier
  | 'tier-to-grid'     // Tier → Grid
  | 'grid-to-tier'     // Grid → Tier
  | 'unrank'           // Tier → Unranked Pool
  | 'rank-from-pool'   // Unranked Pool → Tier
  | 'remove'           // Grid → Backlog (remove)
  | 'noop';            // Same position or invalid

/**
 * Source information extracted from drag event
 */
export interface DragSource {
  /** Type of the drag source */
  type: 'backlog' | 'collection' | 'grid' | 'tier' | 'unranked-pool';
  /** Unique ID of the dragged item */
  itemId: string;
  /** The item data (if available from drag data) */
  item?: TransferableItem | BacklogItem | GridItemType;
  /** Grid position (if source is grid) */
  gridPosition?: number;
  /** Tier ID (if source is tier) */
  tierId?: string;
  /** Order within tier (if source is tier) */
  orderInTier?: number;
  /** Collection/group ID (if source is backlog/collection) */
  collectionId?: string;
}

/**
 * Target information extracted from drag event
 */
export interface DragTarget {
  /** Type of the drop target */
  type: 'grid-slot' | 'tier-row' | 'tier-item' | 'unranked-pool' | 'unknown';
  /** Target grid position (if target is grid-slot) */
  position?: number;
  /** Target tier ID (if target is tier-row or tier-item) */
  tierId?: string;
  /** Whether the target slot is occupied */
  isOccupied?: boolean;
  /** Occupant data if slot is occupied */
  occupant?: TransferableItem | GridItemType;
}

/**
 * Parsed drag context combining source and target information
 */
export interface DragContext {
  /** Raw dnd-kit event */
  event: DragEndEvent;
  /** Parsed source information */
  source: DragSource;
  /** Parsed target information */
  target: DragTarget;
  /** Determined operation type */
  operationType: DragOperationType;
}

// ============================================================================
// Operation Result Types
// ============================================================================

/**
 * Result of a drag operation execution
 */
export interface DragOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Type of operation that was performed */
  operationType: DragOperationType;
  /** Action taken (assign, move, swap, etc.) */
  action: TransferAction;
  /** Error code if operation failed */
  errorCode?: ValidationErrorCode;
  /** Error message if operation failed */
  errorMessage?: string;
  /** The item that was operated on */
  item?: TransferableItem;
  /** Additional metadata about the operation */
  metadata?: {
    fromPosition?: number;
    toPosition?: number;
    fromTierId?: string;
    toTierId?: string;
    wasSwap?: boolean;
    displacedItem?: TransferableItem;
  };
}

// ============================================================================
// Store Context Types (for operations to access state)
// ============================================================================

/**
 * Grid store context for operations
 */
export interface GridStoreContext {
  /** Current grid items */
  gridItems: GridItemType[];
  /** Maximum grid size */
  maxGridSize: number;
  /** Assign item to grid */
  assignItemToGrid: (item: BacklogItem | GridItemType, position: number) => void;
  /** Remove item from grid */
  removeItemFromGrid: (position: number) => void;
  /** Move/swap grid items */
  moveGridItem: (fromPosition: number, toPosition: number) => void;
  /** Emit validation error */
  emitValidationError: (errorCode: ValidationErrorCode) => void;
}

/**
 * Backlog store context for operations
 */
export interface BacklogStoreContext {
  /** Get item by ID */
  getItemById: (id: string) => BacklogItem | null;
  /** Check if item is used */
  isItemUsed: (id: string) => boolean;
  /** Mark item as used/unused */
  markItemAsUsed: (id: string, used: boolean) => void;
}

/**
 * Tier/Ranking store context for operations
 */
export interface TierStoreContext {
  /** Assign item to tier */
  assignToTier: (itemId: string, tierId: string, item?: TransferableItem) => void;
  /** Move between tiers */
  moveBetweenTiers: (itemId: string, fromTierId: string, toTierId: string, toIndex?: number) => void;
  /** Add to unranked pool */
  addToUnranked: (itemId: string, item?: TransferableItem) => void;
  /** Move within tier */
  moveWithinTier: (tierId: string, fromIndex: number, toIndex: number) => void;
}

/**
 * Combined store context for all operations
 */
export interface OperationStoreContext {
  grid: GridStoreContext;
  backlog: BacklogStoreContext;
  tier?: TierStoreContext;
}

// ============================================================================
// Operation Interface
// ============================================================================

/**
 * Interface for all drag operations
 *
 * Each operation type implements this interface to provide:
 * - Validation before execution
 * - Execution of the operation
 * - Rollback capability (optional)
 */
export interface DragOperation {
  /** Unique identifier for this operation type */
  readonly type: DragOperationType;

  /**
   * Validate if this operation can be executed
   *
   * @param context - The drag context
   * @param stores - Store context for state access
   * @returns Validation result
   */
  validate(context: DragContext, stores: OperationStoreContext): ValidationResult;

  /**
   * Execute the operation
   *
   * @param context - The drag context
   * @param stores - Store context for state mutations
   * @returns Operation result
   */
  execute(context: DragContext, stores: OperationStoreContext): DragOperationResult;

  /**
   * Optional rollback of the operation
   *
   * @param context - The original drag context
   * @param result - The result from execute()
   * @param stores - Store context for state mutations
   */
  rollback?(context: DragContext, result: DragOperationResult, stores: OperationStoreContext): void;
}

// ============================================================================
// Router Types
// ============================================================================

/**
 * Configuration for the DragOperationRouter
 */
export interface RouterConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Custom validation rules */
  validationRules?: {
    allowSwap?: boolean;
    requireAvailableItem?: boolean;
  };
}

/**
 * Handler callback for operation results
 */
export type OperationResultHandler = (result: DragOperationResult, context: DragContext) => void;

/**
 * Handler callback for validation errors
 */
export type ValidationErrorHandler = (
  errorCode: ValidationErrorCode,
  context: DragContext
) => void;
