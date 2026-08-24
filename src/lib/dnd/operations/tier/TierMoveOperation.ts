import { dndLogger } from '@/lib/logger';

import { requireStore } from '../validation-helpers';
import { BaseTierOperation } from './BaseTierOperation';

import type { DragContext, DragOperationResult, OperationStoreContext } from '../types';
import type { ValidationResult } from '@/lib/validation';


/**
 * Handles reordering items within the same tier
 */
export class TierMoveOperation extends BaseTierOperation {
  readonly type = 'tier-move' as const;

  validate(context: DragContext, stores: OperationStoreContext): ValidationResult {
    const { source, target } = context;

    const storeCheck = requireStore(stores, 'tier');
    if (storeCheck) return storeCheck;

    if (source.tierId !== target.tierId) {
      return {
        isValid: false,
        errorCode: 'TARGET_POSITION_INVALID',
        errorMessage: 'Source and target tiers are different - use tier-transfer',
        debugInfo: { sourceTier: source.tierId, targetTier: target.tierId },
      };
    }

    return { isValid: true };
  }

  protected executeCore(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    const { source, target } = context;
    const { tier } = stores;
    const tierId = source.tierId!;
    const fromIndex = source.orderInTier ?? 0;
    const toIndex = target.position ?? 0;

    dndLogger.debug('Executing tier-move operation', {
      itemId: source.itemId,
      tierId,
      fromIndex,
      toIndex,
    });

    tier!.moveWithinTier(tierId, fromIndex, toIndex);

    return {
      success: true,
      operationType: 'tier-move',
      action: 'reorder',
      metadata: {
        fromTierId: tierId,
        toTierId: tierId,
      },
    };
  }
}
