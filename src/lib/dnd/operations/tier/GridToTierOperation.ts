import { dndLogger } from '@/lib/logger';

import { requireStore, requireSourceGridPosition, validateAll } from '../validation-helpers';
import { BaseTierOperation } from './BaseTierOperation';

import type { DragContext, DragOperationResult, OperationStoreContext } from '../types';
import type { ValidationResult } from '@/lib/validation';


/**
 * Handles moving items from grid to tier
 */
export class GridToTierOperation extends BaseTierOperation {
  readonly type = 'grid-to-tier' as const;

  validate(context: DragContext, stores: OperationStoreContext): ValidationResult {
    const { source, target } = context;
    const { grid } = stores;

    const failure = validateAll(
      requireStore(stores, 'tier'),
      requireSourceGridPosition(source),
    );
    if (failure) return failure;

    if (source.type !== 'grid') {
      return {
        isValid: false,
        errorCode: 'SOURCE_NOT_FOUND',
        errorMessage: 'Source must be from grid with valid position',
      };
    }

    if (!target.tierId) {
      return {
        isValid: false,
        errorCode: 'TARGET_POSITION_INVALID',
        errorMessage: 'Target must be a tier',
      };
    }

    const sourceItem = grid.gridItems[source.gridPosition!];
    if (!sourceItem || !sourceItem.matched) {
      return {
        isValid: false,
        errorCode: 'SOURCE_NOT_FOUND',
        errorMessage: `No item at grid position ${source.gridPosition}`,
      };
    }

    return { isValid: true };
  }

  protected executeCore(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    const { source, target } = context;
    const { grid, tier } = stores;
    const fromPosition = source.gridPosition!;
    const toTierId = target.tierId!;

    const sourceItem = grid.gridItems[fromPosition];

    if (!sourceItem || !sourceItem.matched) {
      return {
        success: false,
        operationType: 'grid-to-tier',
        opId: context.opId,
        action: 'reject',
        errorCode: 'SOURCE_NOT_FOUND',
        errorMessage: `Source item not found at grid position ${fromPosition} for grid-to-tier to tier ${toTierId}`,
        metadata: { itemId: source.itemId, fromPosition, toTierId },
      };
    }

    const itemId = sourceItem.backlogItemId || sourceItem.id;
    const transferable = {
      id: itemId,
      title: sourceItem.title,
      description: sourceItem.description,
      image_url: sourceItem.image_url,
      tags: sourceItem.tags,
    };

    dndLogger.debug('Executing grid-to-tier operation', {
      itemId,
      fromPosition,
      toTierId,
    });

    grid.removeItemFromGrid(fromPosition);
    tier!.assignToTier(itemId, toTierId, transferable);

    return {
      success: true,
      operationType: 'grid-to-tier',
      action: 'move',
      item: transferable,
      metadata: {
        fromPosition,
        toTierId,
      },
    };
  }
}
