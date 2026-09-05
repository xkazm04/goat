import { dndLogger } from '@/lib/logger';

import { toTransferableItem } from '../../transfer-protocol';
import { isBacklogItem, isGridItem, DndTypeAssertionError } from '../../type-guards';
import { requireGridSlotTarget, requirePositionInBounds, validateAll } from '../validation-helpers';
import { BaseTierOperation } from './BaseTierOperation';

import type { DragContext, DragOperationResult, OperationStoreContext } from '../types';
import type { ValidationResult } from '@/lib/validation';
import type { GridItemType } from '@/types/match';


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

    // Normalize item to a type accepted by assignItemToGrid (BacklogItem | GridItemType).
    // source.item can also be a TransferableItem from tier state — wrap it as a GridItemType.
    let gridCompatibleItem: Parameters<typeof grid.assignItemToGrid>[0];
    if (isBacklogItem(item)) {
      gridCompatibleItem = item;
    } else if (isGridItem(item)) {
      gridCompatibleItem = item;
    } else {
      // TransferableItem from tier state — wrap as a minimal GridItemType
      const transferable = toTransferableItem(item);
      if (!transferable) {
        throw new DndTypeAssertionError(
          'Item could not be converted to a grid-compatible type (missing id or required fields)',
          'BacklogItem | GridItemType | TransferableItem',
          item,
          `tier-to-grid to position ${position}`,
        );
      }
      const wrapped: GridItemType = {
        id: `tier-to-grid-${transferable.id}-${position}`,
        position,
        item: transferable,
        context: { matched: true, source: 'tier' as const },
      };
      gridCompatibleItem = wrapped;
    }

    dndLogger.debug('Executing tier-to-grid operation', {
      itemId: source.itemId,
      fromTierId: source.tierId,
      toPosition: position,
    });

    grid.assignItemToGrid(gridCompatibleItem, position);
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
