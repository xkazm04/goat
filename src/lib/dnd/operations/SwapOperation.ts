/**
 * SwapOperation - Handles grid → grid swap (between occupied slots)
 *
 * This operation validates that:
 * - The source grid position has an item
 * - The target grid position is valid and occupied
 * - Source and target are different positions
 *
 * Then swaps the items at both positions.
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
 * SwapOperation handles swapping two grid items
 */
export class SwapOperation implements DragOperation {
  readonly type = 'swap' as const;

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

    // For swap operations, target should be occupied (already validated by router)
    // But we double-check here for safety
    if (validationResult.isValid && !target.isOccupied) {
      dndLogger.warn('Swap operation on empty target - should be a move operation');
    }

    return validationResult;
  }

  execute(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    const { source, target } = context;
    const { grid } = stores;
    const fromPosition = source.gridPosition!;
    const toPosition = target.position!;

    try {
      // Get items at both positions
      const sourceItem = grid.gridItems[fromPosition];
      const targetItem = grid.gridItems[toPosition];

      if (!sourceItem || !sourceItem.matched) {
        return {
          success: false,
          operationType: 'swap',
          action: 'reject',
          errorCode: 'SOURCE_NOT_FOUND',
          errorMessage: `No item at source position ${fromPosition}`,
        };
      }

      dndLogger.debug('Executing swap operation', {
        sourceItemId: sourceItem.backlogItemId || sourceItem.id,
        targetItemId: targetItem?.backlogItemId || targetItem?.id,
        fromPosition,
        toPosition,
      });

      // Perform the swap (moveGridItem handles both move and swap)
      grid.moveGridItem(fromPosition, toPosition);

      dndLogger.info(`Successfully swapped items at positions ${fromPosition} and ${toPosition}`);

      return {
        success: true,
        operationType: 'swap',
        action: 'swap',
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
          wasSwap: true,
          displacedItem: targetItem?.matched
            ? {
                id: targetItem.backlogItemId || targetItem.id,
                title: targetItem.title,
                description: targetItem.description,
                image_url: targetItem.image_url,
                tags: targetItem.tags,
              }
            : undefined,
        },
      };
    } catch (error) {
      dndLogger.error('Swap operation failed', error);

      return {
        success: false,
        operationType: 'swap',
        action: 'reject',
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error during swap',
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
      // Swap again to reverse (swap is its own inverse)
      grid.moveGridItem(result.metadata.toPosition, result.metadata.fromPosition);

      dndLogger.debug('Rolled back swap operation', {
        fromPosition: result.metadata.toPosition,
        toPosition: result.metadata.fromPosition,
      });
    }
  }
}
