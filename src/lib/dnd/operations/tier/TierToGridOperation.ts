import type { DragContext, DragOperationResult, OperationStoreContext } from '../types';
import type { ValidationResult } from '@/lib/validation';
import { requireGridSlotTarget, requirePositionInBounds, validateAll } from '../validation-helpers';
import { dndLogger } from '@/lib/logger';
import { BaseTierOperation } from './BaseTierOperation';

/**
 * Handles moving items from tier to grid
 */
export class TierToGridOperation extends BaseTierOperation {
  readonly type = 'tier-to-grid' as const;

  validate(context: DragContext, stores: OperationStoreContext): ValidationResult {
    const { source, target } = context;
    const { grid } = stores;

    if (source.type !== 'tier' && source.type !== 'unranked-pool') {
      return {
        isValid: false,
        errorCode: 'SOURCE_NOT_FOUND',
        errorMessage: 'Source must be from tier or unranked pool',
      };
    }

    const failure = validateAll(
      requireGridSlotTarget(target),
      target.position !== undefined ? requirePositionInBounds(target.position, grid.maxGridSize) : null,
    );
    if (failure) return failure;

    return { isValid: true };
  }

  protected executeCore(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    const { source, target } = context;
    const { grid, backlog } = stores;
    const position = target.position!;

    const item = source.item;

    if (!item) {
      return {
        success: false,
        operationType: 'tier-to-grid',
        opId: context.opId,
        action: 'reject',
        errorCode: 'SOURCE_NOT_FOUND',
        errorMessage: `Item ${source.itemId} data not available for tier-to-grid to position ${position}`,
        metadata: { itemId: source.itemId, fromTierId: source.tierId, toPosition: position },
      };
    }

    dndLogger.debug('Executing tier-to-grid operation', {
      itemId: source.itemId,
      fromTierId: source.tierId,
      toPosition: position,
    });

    grid.assignItemToGrid(item as any, position);
    backlog.markItemAsUsed(source.itemId, true);

    return {
      success: true,
      operationType: 'tier-to-grid',
      action: 'assign',
      metadata: {
        fromTierId: source.tierId,
        toPosition: position,
      },
    };
  }
}
