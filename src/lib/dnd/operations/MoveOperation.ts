/**
 * MoveOperation - Handles grid → grid movement (to empty slot)
 *
 * Extends BaseGridOperation for common validation and error handling.
 * Adds: target must be empty (not occupied).
 */

import type {
  DragContext,
  DragOperationResult,
  OperationStoreContext,
} from './types';
import type { ValidationResult } from '@/lib/validation';
import { BaseGridOperation } from './BaseGridOperation';
import { dndLogger } from '@/lib/logger';

/**
 * MoveOperation handles moving grid items to empty slots
 */
export class MoveOperation extends BaseGridOperation {
  readonly type = 'move' as const;

  protected additionalValidation(
    context: DragContext,
    _stores: OperationStoreContext,
    result: ValidationResult
  ): ValidationResult {
    if (context.target.isOccupied) {
      return {
        isValid: false,
        errorCode: 'TARGET_POSITION_OCCUPIED',
        errorMessage: 'Target position is occupied - this should be a swap operation',
        debugInfo: { toPosition: context.target.position, isOccupied: context.target.isOccupied },
      };
    }
    return result;
  }

  protected executeCore(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    const { source, target } = context;
    const { grid } = stores;
    const fromPosition = source.gridPosition!;
    const toPosition = target.position!;

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
  }
}
