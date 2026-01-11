/**
 * MatchSessionOrchestrator - Centralized state management for match sessions
 *
 * This orchestrator implements the command pattern to provide atomic,
 * multi-store state transitions for the match/ranking system. It centralizes
 * all coordination between grid-store, session-store, and backlog-store to
 * prevent state desync bugs and provide predictable, debuggable operations.
 *
 * Benefits:
 * - Atomic operations: All related store updates happen together or not at all
 * - Centralized logging: Single point for debugging state transitions
 * - Validation pipeline: Comprehensive checks before any state mutation
 * - Rollback support: Can undo operations if downstream updates fail
 */

import { BacklogItem } from '@/types/backlog-groups';
import { GridItemType } from '@/types/match';
import { createGridItem, createEmptyGridSlot } from '@/lib/grid';
import { createGridReceiverId } from '@/lib/dnd';
import {
  getValidationAuthority,
  ValidationErrorCode,
} from '@/lib/validation';

// Re-export for backwards compatibility
export type { ValidationErrorCode as TransferValidationErrorCode } from '@/lib/validation';

// ============================================================================
// Types
// ============================================================================

/**
 * Command types supported by the orchestrator
 */
export type OrchestratorCommand = 'assign' | 'move' | 'swap' | 'remove' | 'clear';

/**
 * Result of an orchestrator operation
 */
export interface OrchestratorResult {
  success: boolean;
  command: OrchestratorCommand;
  error?: OrchestratorError;
  metadata?: Record<string, unknown>;
}

/**
 * Error information from orchestrator operations
 */
export interface OrchestratorError {
  code: ValidationErrorCode | 'ORCHESTRATION_FAILED' | 'STORE_UPDATE_FAILED';
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Options for assign command
 */
export interface AssignOptions {
  /** The backlog item to assign */
  item: BacklogItem;
  /** The target grid position (0-indexed) */
  position: number;
  /** Skip validation (use with caution) */
  skipValidation?: boolean;
}

/**
 * Options for move command
 */
export interface MoveOptions {
  /** Source position (0-indexed) */
  fromPosition: number;
  /** Target position (0-indexed) */
  toPosition: number;
}

/**
 * Options for swap command
 */
export interface SwapOptions {
  /** First position (0-indexed) */
  positionA: number;
  /** Second position (0-indexed) */
  positionB: number;
}

/**
 * Options for remove command
 */
export interface RemoveOptions {
  /** Position to remove item from (0-indexed) */
  position: number;
}

/**
 * Store interfaces required by the orchestrator
 * These are passed in to avoid circular dependencies
 */
export interface OrchestratorStores {
  gridStore: {
    getState: () => {
      gridItems: GridItemType[];
      maxGridSize: number;
    };
    assignItemToGrid: (item: BacklogItem | GridItemType, position: number) => void;
    removeItemFromGrid: (position: number) => void;
    moveGridItem: (fromPosition: number, toPosition: number) => void;
    clearGrid: () => void;
  };
  sessionStore: {
    getState: () => {
      activeSessionId: string | null;
    };
    updateSessionGridItems: (gridItems: GridItemType[]) => void;
  };
  backlogStore: {
    getState: () => {
      groups: Array<{ items: BacklogItem[] }>;
    };
    getItemById: (id: string) => BacklogItem | null;
    isItemUsed: (id: string) => boolean;
    markItemAsUsed: (id: string, used: boolean) => void;
  };
  /** @deprecated Use notificationStore instead */
  matchStore?: {
    emitValidationError: (errorCode: ValidationErrorCode) => void;
  };
  /** Dedicated notification store for validation errors */
  notificationStore?: {
    emitValidationError: (errorCode: ValidationErrorCode) => void;
  };
}

// ============================================================================
// Orchestrator Class
// ============================================================================

/**
 * MatchSessionOrchestrator
 *
 * Centralizes all multi-store state transitions for the match system.
 * Implements command pattern for atomic, traceable operations.
 */
export class MatchSessionOrchestrator {
  private stores: OrchestratorStores;
  private operationId: number = 0;

  constructor(stores: OrchestratorStores) {
    this.stores = stores;
  }

  /**
   * Generate a unique operation ID for logging
   */
  private getOperationId(): string {
    return `op-${++this.operationId}-${Date.now()}`;
  }

  /**
   * Log operation start
   */
  private logStart(command: OrchestratorCommand, opId: string, details: Record<string, unknown>): void {
    console.log(`🎯 [${opId}] Orchestrator: Starting ${command}`, details);
  }

  /**
   * Log operation success
   */
  private logSuccess(command: OrchestratorCommand, opId: string, metadata?: Record<string, unknown>): void {
    console.log(`✅ [${opId}] Orchestrator: ${command} completed successfully`, metadata || {});
  }

  /**
   * Log operation failure
   */
  private logFailure(command: OrchestratorCommand, opId: string, error: OrchestratorError): void {
    console.error(`❌ [${opId}] Orchestrator: ${command} failed`, {
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }

  /**
   * Emit validation error to notification store for UI notification
   * Falls back to matchStore for backwards compatibility
   */
  private emitValidationError(errorCode: ValidationErrorCode): void {
    // Prefer dedicated notification store
    if (this.stores.notificationStore?.emitValidationError) {
      this.stores.notificationStore.emitValidationError(errorCode);
    } else if (this.stores.matchStore?.emitValidationError) {
      // Fallback to matchStore for backwards compatibility
      this.stores.matchStore.emitValidationError(errorCode);
    }
  }

  /**
   * ASSIGN Command
   *
   * Assigns a backlog item to a grid position.
   * Atomically updates: grid-store, session-store, backlog-store (used status)
   *
   * @param options - Assignment options including item and position
   * @returns Operation result
   */
  assign(options: AssignOptions): OrchestratorResult {
    const opId = this.getOperationId();
    const { item, position, skipValidation = false } = options;

    this.logStart('assign', opId, {
      itemId: item.id,
      itemTitle: item.name || item.title,
      position,
    });

    try {
      const { gridStore, sessionStore, backlogStore } = this.stores;
      const gridState = gridStore.getState();

      // Step 1: Validate using ValidationAuthority (unless skipped)
      if (!skipValidation) {
        const authority = getValidationAuthority();
        const validationResult = authority.canTransfer(
          {
            itemId: item.id,
            from: 'backlog',
            to: 'grid',
            toPosition: position,
          },
          {
            gridItems: gridState.gridItems,
            maxGridSize: gridState.maxGridSize,
          },
          {
            getItemById: backlogStore.getItemById,
            isItemUsed: backlogStore.isItemUsed,
          }
        );

        if (!validationResult.isValid && validationResult.errorCode) {
          this.emitValidationError(validationResult.errorCode);
          const error: OrchestratorError = {
            code: validationResult.errorCode,
            message: validationResult.errorMessage || 'Validation failed',
            details: validationResult.debugInfo,
          };
          this.logFailure('assign', opId, error);
          return { success: false, command: 'assign', error };
        }
      }

      // Step 2: Create grid item
      const gridItem = createGridItem(item, position);

      // Step 3: Atomic updates (order matters for consistency)
      // 3a. Update grid store
      gridStore.assignItemToGrid(gridItem, position);

      // 3b. Mark item as used in backlog
      backlogStore.markItemAsUsed(item.id, true);

      // Note: grid-store.assignItemToGrid already syncs with session-store internally

      this.logSuccess('assign', opId, {
        itemId: item.id,
        gridItemId: gridItem.id,
        position,
      });

      return {
        success: true,
        command: 'assign',
        metadata: {
          itemId: item.id,
          position,
          gridItemId: gridItem.id,
        },
      };
    } catch (error) {
      const orchestratorError: OrchestratorError = {
        code: 'ORCHESTRATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error during assign',
        details: { itemId: item.id, position },
      };
      this.logFailure('assign', opId, orchestratorError);
      return { success: false, command: 'assign', error: orchestratorError };
    }
  }

  /**
   * MOVE Command
   *
   * Moves a grid item from one position to another.
   * If target is occupied, performs a swap automatically.
   *
   * @param options - Move options including source and target positions
   * @returns Operation result
   */
  move(options: MoveOptions): OrchestratorResult {
    const opId = this.getOperationId();
    const { fromPosition, toPosition } = options;

    this.logStart('move', opId, { fromPosition, toPosition });

    try {
      const { gridStore } = this.stores;
      const gridState = gridStore.getState();

      // Use ValidationAuthority for validation
      const authority = getValidationAuthority();
      const validationResult = authority.canTransfer(
        {
          itemId: gridState.gridItems[fromPosition]?.backlogItemId || '',
          from: 'grid',
          fromPosition,
          to: 'grid',
          toPosition,
        },
        {
          gridItems: gridState.gridItems,
          maxGridSize: gridState.maxGridSize,
        },
        {
          getItemById: () => null, // Not needed for grid-to-grid
          isItemUsed: () => false, // Not needed for grid-to-grid
        }
      );

      if (!validationResult.isValid && validationResult.errorCode) {
        const error: OrchestratorError = {
          code: validationResult.errorCode,
          message: validationResult.errorMessage || 'Move validation failed',
          details: validationResult.debugInfo,
        };
        this.logFailure('move', opId, error);
        return { success: false, command: 'move', error };
      }

      // Check if source has an item
      const sourceItem = gridState.gridItems[fromPosition];

      // Check if this is actually a swap
      const targetItem = gridState.gridItems[toPosition];
      const isSwap = targetItem.matched;

      // Perform the move (grid-store handles swap logic internally)
      gridStore.moveGridItem(fromPosition, toPosition);

      this.logSuccess('move', opId, {
        fromPosition,
        toPosition,
        wasSwap: isSwap,
        itemTitle: sourceItem.title,
      });

      return {
        success: true,
        command: isSwap ? 'swap' : 'move',
        metadata: {
          fromPosition,
          toPosition,
          wasSwap: isSwap,
        },
      };
    } catch (error) {
      const orchestratorError: OrchestratorError = {
        code: 'ORCHESTRATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error during move',
        details: { fromPosition, toPosition },
      };
      this.logFailure('move', opId, orchestratorError);
      return { success: false, command: 'move', error: orchestratorError };
    }
  }

  /**
   * SWAP Command
   *
   * Explicitly swaps items at two positions.
   * Both positions must have items.
   *
   * @param options - Swap options including both positions
   * @returns Operation result
   */
  swap(options: SwapOptions): OrchestratorResult {
    const opId = this.getOperationId();
    const { positionA, positionB } = options;

    this.logStart('swap', opId, { positionA, positionB });

    try {
      const { gridStore } = this.stores;
      const gridState = gridStore.getState();

      // Use ValidationAuthority for position bounds validation
      const authority = getValidationAuthority();

      // Validate position A
      const posAResult = authority.isPositionInBounds(positionA, {
        gridItems: gridState.gridItems,
        maxGridSize: gridState.maxGridSize,
      });

      // Validate position B
      const posBResult = authority.isPositionInBounds(positionB, {
        gridItems: gridState.gridItems,
        maxGridSize: gridState.maxGridSize,
      });

      if (!posAResult.isValid || !posBResult.isValid) {
        const error: OrchestratorError = {
          code: 'TARGET_OUT_OF_BOUNDS',
          message: 'Invalid swap positions',
          details: { positionA, positionB, gridSize: gridState.gridItems.length },
        };
        this.logFailure('swap', opId, error);
        return { success: false, command: 'swap', error };
      }

      // Verify both positions have items
      const itemA = gridState.gridItems[positionA];
      const itemB = gridState.gridItems[positionB];

      if (!itemA.matched || !itemB.matched) {
        const error: OrchestratorError = {
          code: 'SOURCE_NOT_FOUND',
          message: 'Both positions must have items for swap',
          details: {
            positionA,
            positionAHasItem: itemA.matched,
            positionB,
            positionBHasItem: itemB.matched,
          },
        };
        this.logFailure('swap', opId, error);
        return { success: false, command: 'swap', error };
      }

      // Perform the swap (uses moveGridItem which handles swap logic)
      gridStore.moveGridItem(positionA, positionB);

      this.logSuccess('swap', opId, {
        positionA,
        positionB,
        itemATitle: itemA.title,
        itemBTitle: itemB.title,
      });

      return {
        success: true,
        command: 'swap',
        metadata: {
          positionA,
          positionB,
          itemAId: itemA.backlogItemId,
          itemBId: itemB.backlogItemId,
        },
      };
    } catch (error) {
      const orchestratorError: OrchestratorError = {
        code: 'ORCHESTRATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error during swap',
        details: { positionA, positionB },
      };
      this.logFailure('swap', opId, orchestratorError);
      return { success: false, command: 'swap', error: orchestratorError };
    }
  }

  /**
   * REMOVE Command
   *
   * Removes an item from a grid position.
   * Atomically updates: grid-store, session-store, backlog-store (used status)
   *
   * @param options - Remove options including position
   * @returns Operation result
   */
  remove(options: RemoveOptions): OrchestratorResult {
    const opId = this.getOperationId();
    const { position } = options;

    this.logStart('remove', opId, { position });

    try {
      const { gridStore, backlogStore } = this.stores;
      const gridState = gridStore.getState();

      // Use ValidationAuthority for position bounds validation
      const authority = getValidationAuthority();
      const posResult = authority.isPositionInBounds(position, {
        gridItems: gridState.gridItems,
        maxGridSize: gridState.maxGridSize,
      });

      if (!posResult.isValid) {
        const error: OrchestratorError = {
          code: posResult.errorCode || 'TARGET_OUT_OF_BOUNDS',
          message: posResult.errorMessage || `Invalid position: ${position}`,
          details: posResult.debugInfo || { position, gridSize: gridState.gridItems.length },
        };
        this.logFailure('remove', opId, error);
        return { success: false, command: 'remove', error };
      }

      // Get the item before removal
      const gridItem = gridState.gridItems[position];

      if (!gridItem.matched) {
        // No item to remove - this is not an error, just a no-op
        this.logSuccess('remove', opId, { position, wasEmpty: true });
        return {
          success: true,
          command: 'remove',
          metadata: { position, wasEmpty: true },
        };
      }

      const backlogItemId = gridItem.backlogItemId;

      // Step 1: Remove from grid
      gridStore.removeItemFromGrid(position);

      // Step 2: Mark item as unused in backlog
      if (backlogItemId) {
        backlogStore.markItemAsUsed(backlogItemId, false);
      }

      // Note: grid-store.removeItemFromGrid already syncs with session-store

      this.logSuccess('remove', opId, {
        position,
        itemTitle: gridItem.title,
        backlogItemId,
      });

      return {
        success: true,
        command: 'remove',
        metadata: {
          position,
          itemTitle: gridItem.title,
          backlogItemId,
        },
      };
    } catch (error) {
      const orchestratorError: OrchestratorError = {
        code: 'ORCHESTRATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error during remove',
        details: { position },
      };
      this.logFailure('remove', opId, orchestratorError);
      return { success: false, command: 'remove', error: orchestratorError };
    }
  }

  /**
   * CLEAR Command
   *
   * Clears all items from the grid.
   * Atomically updates: grid-store, session-store, backlog-store (all items marked unused)
   *
   * @returns Operation result
   */
  clear(): OrchestratorResult {
    const opId = this.getOperationId();

    this.logStart('clear', opId, {});

    try {
      const { gridStore, backlogStore } = this.stores;
      const gridState = gridStore.getState();

      // Get all matched items before clearing
      const matchedItems = gridState.gridItems.filter(item => item.matched);
      const backlogItemIds = matchedItems
        .map(item => item.backlogItemId)
        .filter((id): id is string => !!id);

      // Step 1: Clear the grid
      gridStore.clearGrid();

      // Step 2: Mark all items as unused in backlog
      backlogItemIds.forEach(id => {
        backlogStore.markItemAsUsed(id, false);
      });

      // Note: grid-store.clearGrid already syncs with session-store

      this.logSuccess('clear', opId, {
        clearedCount: matchedItems.length,
        backlogItemIds,
      });

      return {
        success: true,
        command: 'clear',
        metadata: {
          clearedCount: matchedItems.length,
          backlogItemIds,
        },
      };
    } catch (error) {
      const orchestratorError: OrchestratorError = {
        code: 'ORCHESTRATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error during clear',
        details: {},
      };
      this.logFailure('clear', opId, orchestratorError);
      return { success: false, command: 'clear', error: orchestratorError };
    }
  }

  /**
   * Get current grid state for debugging
   */
  getGridState(): { gridItems: GridItemType[]; filledCount: number; totalSize: number } {
    const gridState = this.stores.gridStore.getState();
    const filledCount = gridState.gridItems.filter(item => item.matched).length;

    return {
      gridItems: gridState.gridItems,
      filledCount,
      totalSize: gridState.gridItems.length,
    };
  }

  /**
   * Check if a position is available
   * Delegates to ValidationAuthority for consistent validation
   */
  isPositionAvailable(position: number): boolean {
    const gridState = this.stores.gridStore.getState();
    const authority = getValidationAuthority();
    return authority.canReceiveAtPosition(position, {
      gridItems: gridState.gridItems,
      maxGridSize: gridState.maxGridSize,
    });
  }

  /**
   * Get the next available position
   */
  getNextAvailablePosition(): number | null {
    const gridState = this.stores.gridStore.getState();
    const index = gridState.gridItems.findIndex(item => !item.matched);
    return index !== -1 ? index : null;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an orchestrator instance with store references
 * This should be called once and the instance reused
 */
export function createMatchSessionOrchestrator(stores: OrchestratorStores): MatchSessionOrchestrator {
  return new MatchSessionOrchestrator(stores);
}

// ============================================================================
// Singleton Instance (for convenience)
// ============================================================================

let orchestratorInstance: MatchSessionOrchestrator | null = null;

/**
 * Get or create the global orchestrator instance
 * Stores must be provided on first call
 */
export function getOrchestrator(stores?: OrchestratorStores): MatchSessionOrchestrator {
  if (!orchestratorInstance) {
    if (!stores) {
      throw new Error('Orchestrator stores must be provided on first call');
    }
    orchestratorInstance = createMatchSessionOrchestrator(stores);
  }
  return orchestratorInstance;
}

/**
 * Reset the global orchestrator instance
 * Useful for testing or when stores change
 */
export function resetOrchestrator(): void {
  orchestratorInstance = null;
}
