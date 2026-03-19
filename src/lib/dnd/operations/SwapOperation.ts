/**
 * SwapOperation - Handles grid → grid swap (between occupied slots)
 *
 * Extends BaseGridOperation for common validation and error handling.
 * Adds: warning if target is unexpectedly empty.
 */

import { dndLogger } from '@/lib/logger';

import { BaseGridOperation } from './BaseGridOperation';

import type {
  DragContext,
  DragOperationResult,
  OperationStoreContext,
} from './types';
import type { ValidationResult } from '@/lib/validation';

/**
 * SwapOperation handles swapping two grid items
 */
export class SwapOperation extends BaseGridOperation {
  readonly type = 'swap' as const;

  protected additionalValidation(
    context: DragContext,
    _stores: OperationStoreContext,
    result: ValidationResult
  ): ValidationResult {
    if (!context.target.isOccupied) {
      dndLogger.warn('Swap operation on empty target - should be a move operation');
    }
    return result;
  }

  protected executeCore(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    const { source, target } = context;
    const { grid } = stores;
    const fromPosition = source.gridPosition!;
    const toPosition = target.position!;

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

    const gridMutationStart = performance.now();
    grid.moveGridItem(fromPosition, toPosition);
    const gridMutationDuration = performance.now() - gridMutationStart;

    console.debug(
      `[DnD Perf] swap execute phases | ` +
      `gridMutation=${gridMutationDuration.toFixed(2)}ms`
    );

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
  }
}
