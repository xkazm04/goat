/**
 * AssignOperation - Handles backlog/collection → grid assignment
 *
 * This operation validates that:
 * - The source item exists and is available
 * - The target grid position is valid and within bounds
 * - The item is not already used (or slot allows swap)
 *
 * Then assigns the item to the grid position.
 */

import type {
  DragOperation,
  DragContext,
  DragOperationResult,
  OperationStoreContext,
} from './types';
import type { ValidationResult } from '@/lib/validation';
import { getValidationAuthority, logValidationFailure } from '@/lib/validation';
import { createGridItem } from '@/lib/grid';
import { dndLogger } from '@/lib/logger';

/**
 * LockManager - Provides timeout-based locking for items being assigned.
 *
 * Prevents race conditions from rapid double-drag by making
 * validation-assignment-marking atomic. Locks auto-expire after a timeout
 * so that a stuck lock from an unhandled error won't permanently block
 * all subsequent assignments.
 */
class LockManager {
  private locks = new Map<string, { acquiredAt: number; timer: ReturnType<typeof setTimeout> }>();
  private defaultTimeoutMs: number;

  constructor(defaultTimeoutMs = 5000) {
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  /**
   * Attempt to acquire a lock for an item.
   * Returns true if lock acquired, false if item is already locked.
   */
  acquireLock(itemId: string, timeoutMs?: number): boolean {
    const existing = this.locks.get(itemId);
    if (existing) {
      return false;
    }

    const timeout = timeoutMs ?? this.defaultTimeoutMs;
    const timer = setTimeout(() => {
      this.locks.delete(itemId);
    }, timeout);

    this.locks.set(itemId, { acquiredAt: Date.now(), timer });
    return true;
  }

  /**
   * Release the lock for an item after operation completes.
   */
  releaseLock(itemId: string): void {
    const lock = this.locks.get(itemId);
    if (lock) {
      clearTimeout(lock.timer);
      this.locks.delete(itemId);
    }
  }

  /**
   * Check if an item is currently locked (without acquiring).
   */
  isLocked(itemId: string): boolean {
    return this.locks.has(itemId);
  }

  /**
   * Clear all locks. Useful for testing and HMR recovery.
   */
  reset(): void {
    for (const [, lock] of Array.from(this.locks)) {
      clearTimeout(lock.timer);
    }
    this.locks.clear();
  }
}

/** Singleton lock manager for assignment operations */
const assignmentLocks = new LockManager(5000);

/**
 * AssignOperation handles dropping items from backlog/collection onto grid slots
 */
export class AssignOperation implements DragOperation {
  readonly type = 'assign' as const;

  validate(context: DragContext, stores: OperationStoreContext): ValidationResult {
    const { source, target } = context;
    const { grid, backlog } = stores;

    // Target must be a grid slot
    if (target.type !== 'grid-slot' || target.position === undefined) {
      return {
        isValid: false,
        errorCode: 'TARGET_POSITION_INVALID',
        errorMessage: 'Target is not a valid grid slot',
        debugInfo: { targetType: target.type, targetPosition: target.position },
      };
    }

    // Try to acquire lock to prevent race conditions
    if (!assignmentLocks.acquireLock(source.itemId)) {
      return {
        isValid: false,
        errorCode: 'SOURCE_ALREADY_USED',
        errorMessage: 'Item is already being assigned (concurrent drag blocked)',
        debugInfo: { itemId: source.itemId },
      };
    }

    // Use ValidationAuthority for comprehensive validation
    const authority = getValidationAuthority();
    const validationResult = authority.canTransfer(
      {
        itemId: source.itemId,
        from: 'backlog',
        to: 'grid',
        toPosition: target.position,
      },
      {
        gridItems: grid.gridItems,
        maxGridSize: grid.maxGridSize,
      },
      {
        getItemById: backlog.getItemById,
        isItemUsed: backlog.isItemUsed,
        isItemLocked: (id) => assignmentLocks.isLocked(id) && id !== source.itemId,
      }
    );

    // If validation failed, release the lock
    if (!validationResult.isValid) {
      assignmentLocks.releaseLock(source.itemId);

      logValidationFailure(validationResult, {
        activeId: source.itemId,
        overId: `grid-${target.position}`,
        operation: 'assign',
      });
    }

    // Store the validated item in debug info for execute to use
    if (validationResult.isValid && validationResult.item) {
      validationResult.debugInfo = {
        ...validationResult.debugInfo,
        validatedItem: validationResult.item,
      };
    }

    return validationResult;
  }

  execute(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    const { source, target } = context;
    const { grid, backlog } = stores;
    const position = target.position!;

    try {
      // Re-validate item availability to close TOCTOU gap.
      // Between validate() and execute(), a keyboard shortcut or click handler
      // could have assigned this item elsewhere (those paths bypass the LockManager).
      if (backlog.isItemUsed(source.itemId)) {
        assignmentLocks.releaseLock(source.itemId);
        dndLogger.warn('TOCTOU: item marked used between validate and execute', {
          itemId: source.itemId,
          position,
        });
        return {
          success: false,
          operationType: 'assign',
          action: 'reject',
          errorCode: 'SOURCE_ALREADY_USED',
          errorMessage: 'Item was assigned by another operation between validation and execution',
        };
      }

      // Also verify item isn't already in the grid (belt-and-suspenders against duplicate placement)
      const duplicatePosition = grid.gridItems.findIndex(
        (slot) => slot && slot.matched && slot.backlogItemId === source.itemId
      );
      if (duplicatePosition !== -1) {
        assignmentLocks.releaseLock(source.itemId);
        dndLogger.warn('TOCTOU: item already in grid at another position', {
          itemId: source.itemId,
          existingPosition: duplicatePosition,
          requestedPosition: position,
        });
        return {
          success: false,
          operationType: 'assign',
          action: 'reject',
          errorCode: 'SOURCE_ALREADY_USED',
          errorMessage: `Item already placed at grid position ${duplicatePosition}`,
        };
      }

      // Get the item to assign
      const item = source.item || backlog.getItemById(source.itemId);

      if (!item) {
        assignmentLocks.releaseLock(source.itemId);
        return {
          success: false,
          operationType: 'assign',
          action: 'reject',
          errorCode: 'SOURCE_NOT_FOUND',
          errorMessage: 'Item not found after validation',
        };
      }

      const itemTitle = 'title' in item && typeof item.title === 'string'
        ? item.title
        : ('name' in item && typeof (item as { name?: string }).name === 'string'
          ? (item as { name: string }).name
          : 'unknown');

      dndLogger.debug('Executing assign operation', {
        itemId: source.itemId,
        itemTitle,
        position,
      });

      // If target position is occupied, remove the existing item first and return it to backlog
      const displacementStart = performance.now();
      const existingItem = grid.gridItems[position];
      if (existingItem && existingItem.matched && existingItem.backlogItemId) {
        const displacedItemId = existingItem.backlogItemId;
        grid.removeItemFromGrid(position);
        backlog.markItemAsUsed(displacedItemId, false);
        dndLogger.debug(`Displaced item ${displacedItemId} from position ${position}`);
      }
      const displacementDuration = performance.now() - displacementStart;

      // Create grid item using factory
      const gridItem = createGridItem(item, position);

      // ATOMIC OPERATION: Assign item to grid and mark as used together
      // This prevents race condition where item appears in multiple positions
      const gridMutationStart = performance.now();
      grid.assignItemToGrid(gridItem, position);
      const gridMutationDuration = performance.now() - gridMutationStart;

      const backlogUpdateStart = performance.now();
      backlog.markItemAsUsed(source.itemId, true);
      const backlogUpdateDuration = performance.now() - backlogUpdateStart;

      // Release lock after both operations complete
      assignmentLocks.releaseLock(source.itemId);

      console.debug(
        `[DnD Perf] assign execute phases | ` +
        `displacement=${displacementDuration.toFixed(2)}ms ` +
        `gridMutation=${gridMutationDuration.toFixed(2)}ms ` +
        `backlogUpdate=${backlogUpdateDuration.toFixed(2)}ms`
      );

      dndLogger.info(`Successfully assigned item to position ${position}`);

      return {
        success: true,
        operationType: 'assign',
        action: 'assign',
        item: {
          id: gridItem.backlogItemId || gridItem.id,
          title: gridItem.title,
          description: gridItem.description,
          image_url: gridItem.image_url,
          tags: gridItem.tags,
        },
        metadata: {
          toPosition: position,
        },
      };
    } catch (error) {
      assignmentLocks.releaseLock(source.itemId);
      dndLogger.error('Assign operation failed', error);

      return {
        success: false,
        operationType: 'assign',
        action: 'reject',
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error during assign',
      };
    }
  }

  rollback(
    context: DragContext,
    result: DragOperationResult,
    stores: OperationStoreContext
  ): void {
    const { source } = context;
    const { grid, backlog } = stores;

    if (result.success && result.metadata?.toPosition !== undefined) {
      // Remove from grid
      grid.removeItemFromGrid(result.metadata.toPosition);
      // Mark as unused
      backlog.markItemAsUsed(source.itemId, false);

      dndLogger.debug('Rolled back assign operation', {
        itemId: source.itemId,
        position: result.metadata.toPosition,
      });
    }
  }
}
