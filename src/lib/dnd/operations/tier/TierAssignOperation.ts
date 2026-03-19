import type { DragContext, DragOperationResult, OperationStoreContext } from '../types';
import type { ValidationResult } from '@/lib/validation';
import type { BacklogItem } from '@/types/backlog-groups';
import { backlogToTransferable } from '../../type-guards';
import { requireStore, requireTierTarget, requireAvailableBacklogItem, validateAll } from '../validation-helpers';
import { dndLogger } from '@/lib/logger';
import { BaseTierOperation } from './BaseTierOperation';

/**
 * Handles assigning items from backlog/collection to a tier
 */
export class TierAssignOperation extends BaseTierOperation {
  readonly type = 'tier-assign' as const;

  validate(context: DragContext, stores: OperationStoreContext): ValidationResult {
    const { source, target } = context;

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

    const transferable = 'category' in item
      ? backlogToTransferable(item as BacklogItem)
      : item;

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
