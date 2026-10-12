import { dndLogger } from '@/lib/logger';

import { backlogToTransferable, gridToTransferable, isBacklogItem, isGridItem, isTransferableItem , DndTypeAssertionError } from '../../type-guards';
import { requireStore, requireTierTarget, validateAll } from '../validation-helpers';
import { BaseTierOperation } from './BaseTierOperation';

import type { TransferableItem } from '../../transfer-protocol';
import type { DragContext, DragOperationResult, OperationStoreContext } from '../types';
import type { ValidationResult } from '@/lib/validation';



/**
 * Handles assigning items from backlog/collection to a tier
 */
export class TierAssignOperation extends BaseTierOperation {
  readonly type = 'tier-assign' as const;

  validate(context: DragContext, stores: OperationStoreContext): ValidationResult {
    const { source: _source, target } = context;

    // Tier assign only requires a tier store and a valid tier target.
    // We intentionally skip requireAvailableBacklogItem here because:
    // 1. The backlog index may not resolve collection-item IDs reliably
    // 2. Tier mode manages its own item tracking independently of grid "used" state
    // 3. The source item is carried on the drag event and used as fallback in executeCore
    const failure = validateAll(
      requireStore(stores, 'tier'),
      requireTierTarget(target),
    );
    if (failure) return failure;

    return { isValid: true };
  }

  protected executeCore(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    const { source, target } = context;
    const { backlog, tier } = stores;
    const tierId = target.tierId!;

    const item = source.item || backlog.getItemById(source.itemId);

    if (!item) {
      return {
        success: false,
        operationType: 'tier-assign',
        opId: context.opId,
        action: 'reject',
        errorCode: 'SOURCE_NOT_FOUND',
        errorMessage: `Item ${source.itemId} not found for tier-assign to tier ${tierId}`,
        metadata: { itemId: source.itemId, toTierId: tierId },
      };
    }

    // Normalize to TransferableItem using exhaustive type guards
    let transferable: TransferableItem;
    if (isBacklogItem(item)) {
      transferable = backlogToTransferable(item);
    } else if (isGridItem(item)) {
      const converted = gridToTransferable(item);
      if (!converted) {
        throw new DndTypeAssertionError(
          'GridItem could not be converted to TransferableItem (missing inner item data)',
          'TransferableItem',
          item,
          `tier-assign to tier ${tierId}`,
        );
      }
      transferable = converted;
    } else if (isTransferableItem(item)) {
      transferable = item;
    } else {
      throw new DndTypeAssertionError(
        'Item does not match BacklogItem, GridItemType, or TransferableItem',
        'BacklogItem | GridItemType | TransferableItem',
        item,
        `tier-assign to tier ${tierId}`,
      );
    }

    dndLogger.debug('Executing tier-assign operation', {
      itemId: source.itemId,
      tierId,
    });

    tier!.assignToTier(source.itemId, tierId, transferable);
    backlog.markItemAsUsed(source.itemId, true);

    return {
      success: true,
      operationType: 'tier-assign',
      action: 'assign',
      item: transferable,
      metadata: {
        toTierId: tierId,
      },
    };
  }
}
