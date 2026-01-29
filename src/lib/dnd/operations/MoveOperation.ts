/**
 * MoveOperation - Handles grid → grid movement (to empty slot)
 *
 * This operation validates that:
 * - The source grid position has an item
 * - The target grid position is valid and empty
 * - Source and target are different positions
 *
 * Then moves the item from source to target position.
 */

import type {
  DragOperation,
  DragContext,
  DragOperationResult,
  OperationStoreContext,
} from './types';
import type { ValidationResult } from '@/lib/validation';
import { getValidationAuthority } from '@/lib/validation';
import { dndLogger } from '@/lib/logger';

/**
 * MoveOperation handles moving grid items to empty slots
 */
export class MoveOperation implements DragOperation {
  readonly type = 'move' as const;

  validate(context: DragContext, stores: OperationStoreContext): ValidationResult {
    const { source, target } = context;
    const { grid } = stores;

    // Source must have a grid position
    if (source.gridPosition === undefined) {
      return {
        isValid: false,
        errorCode: 'TARGET_POSITION_INVALID',
        errorMessage: 'Source grid position is not defined',
        debugInfo: { sourceGridPosition: source.gridPosition },
      };
    }

    // Target must be a grid slot with a position
    if (target.type !== 'grid-slot' || target.position === undefined) {
      return {
        isValid: false,
        errorCode: 'TARGET_POSITION_INVALID',
        errorMessage: 'Target is not a valid grid slot',
        debugInfo: { targetType: target.type, targetPosition: target.position },
      };
    }

    // Same position check
    if (source.gridPosition === target.position) {
      return {
        isValid: false,
        errorCode: 'SAME_POSITION',
        errorMessage: 'Source and target positions are the same',
        debugInfo: { fromPosition: source.gridPosition, toPosition: target.position },
      };
    }

    // Use ValidationAuthority for grid-to-grid validation
    const authority = getValidationAuthority();
    const validationResult = authority.canTransfer(
      {
        itemId: source.itemId,
        from: 'grid',
        fromPosition: source.gridPosition,
        to: 'grid',
        toPosition: target.position,
      },
      {
        gridItems: grid.gridItems,
        maxGridSize: grid.maxGridSize,
      },
      {
        getItemById: () => null, // Not needed for grid-to-grid
        isItemUsed: () => false, // Not needed for grid-to-grid
      }
    );

    // For move operations, the target should be empty
    if (validationResult.isValid && target.isOccupied) {
      return {
        isValid: false,
        errorCode: 'TARGET_POSITION_OCCUPIED',
        errorMessage: 'Target position is occupied - this should be a swap operation',
        debugInfo: { toPosition: target.position, isOccupied: target.isOccupied },
      };
    }

    return validationResult;
  }

  execute(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    const { source, target } = context;
    const { grid } = stores;
    const fromPosition = source.gridPosition!;
    const toPosition = target.position!;

    try {
      // Get the item being moved for result data
      const sourceItem = grid.gridItems[fromPosition];

      if (!sourceItem || !sourceItem.matched) {
        return {
          success: false,
          operationType: 'move',
          action: 'reject',
          errorCode: 'SOURCE_NOT_FOUND',
          errorMessage: `No item at source position ${fromPosition}`,
        };
      }

      dndLogger.debug('Executing move operation', {
        itemId: sourceItem.backlogItemId || sourceItem.id,
        fromPosition,
        toPosition,
      });

      // Perform the move
      grid.moveGridItem(fromPosition, toPosition);

      dndLogger.info(`Successfully moved item from position ${fromPosition} to ${toPosition}`);

      return {
        success: true,
        operationType: 'move',
        action: 'move',
        item: {
          id: sourceItem.backlogItemId || sourceItem.id,
          title: sourceItem.title,
          description: sourceItem.description,
          image_url: sourceItem.image_url,
          tags: sourceItem.tags,
        },
        metadata: {
          fromPosition,
          toPosition,
          wasSwap: false,
        },
      };
    } catch (error) {
      dndLogger.error('Move operation failed', error);

      return {
        success: false,
        operationType: 'move',
        action: 'reject',
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error during move',
      };
    }
  }

  rollback(
    context: DragContext,
    result: DragOperationResult,
    stores: OperationStoreContext
  ): void {
    const { grid } = stores;

    if (
      result.success &&
      result.metadata?.fromPosition !== undefined &&
      result.metadata?.toPosition !== undefined
    ) {
      // Reverse the move
      grid.moveGridItem(result.metadata.toPosition, result.metadata.fromPosition);

      dndLogger.debug('Rolled back move operation', {
        fromPosition: result.metadata.toPosition,
        toPosition: result.metadata.fromPosition,
      });
    }
  }
}
