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
 * Lock set for items currently being assigned to prevent race conditions.
 * When a user double-clicks drag rapidly, the second drag validates while
 * the first markItemAsUsed() is still pending. This lock prevents that
 * by making validation-assignment-marking atomic.
 */
const itemsBeingAssigned = new Set<string>();

/**
 * Atomically attempt to acquire a lock for an item.
 * Returns true if lock acquired, false if item is already locked.
 */
function acquireItemLock(itemId: string): boolean {
  if (itemsBeingAssigned.has(itemId)) {
    return false;
  }
  itemsBeingAssigned.add(itemId);
  return true;
}

/**
 * Release the lock for an item after assignment completes.
 */
function releaseItemLock(itemId: string): void {
  itemsBeingAssigned.delete(itemId);
}

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
    if (!acquireItemLock(source.itemId)) {
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
        isItemLocked: (id) => itemsBeingAssigned.has(id) && id !== source.itemId,
      }
    );

    // If validation failed, release the lock
    if (!validationResult.isValid) {
      releaseItemLock(source.itemId);

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
      // Get the item to assign
      const item = source.item || backlog.getItemById(source.itemId);

      if (!item) {
        releaseItemLock(source.itemId);
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

      // Create grid item using factory
      const gridItem = createGridItem(item, position);

      // ATOMIC OPERATION: Assign item to grid and mark as used together
      // This prevents race condition where item appears in multiple positions
      grid.assignItemToGrid(gridItem, position);
      backlog.markItemAsUsed(source.itemId, true);

      // Release lock after both operations complete
      releaseItemLock(source.itemId);

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
      releaseItemLock(source.itemId);
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
