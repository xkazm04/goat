import { dndLogger } from '@/lib/logger';

import { requireStore } from '../validation-helpers';
import { BaseTierOperation } from './BaseTierOperation';

import type { DragContext, DragOperationResult, OperationStoreContext } from '../types';
import type { ValidationResult } from '@/lib/validation';


/**
 * Handles moving items between different tiers
 */
export class TierTransferOperation extends BaseTierOperation {
  readonly type = 'tier-transfer' as const;

  validate(context: DragContext, stores: OperationStoreContext): ValidationResult {
    const { source, target } = context;

    const storeCheck = requireStore(stores, 'tier');
    if (storeCheck) return storeCheck;

    if (!source.tierId) {
      return {
        isValid: false,
        errorCode: 'SOURCE_NOT_FOUND',
        errorMessage: 'Source tier not identified',
      };
    }

    if (!target.tierId || source.tierId === target.tierId) {
      return {
        isValid: false,
        errorCode: 'TARGET_POSITION_INVALID',
        errorMessage: 'Target must be a different tier',
        debugInfo: { sourceTier: source.tierId, targetTier: target.tierId },
      };
    }

    return { isValid: true };
  }

  protected executeCore(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    const { source, target } = context;
    const { tier } = stores;
    const fromTierId = source.tierId!;
    const toTierId = target.tierId!;

    dndLogger.debug('Executing tier-transfer operation', {
      itemId: source.itemId,
      fromTierId,
      toTierId,
    });

    tier!.moveBetweenTiers(source.itemId, fromTierId, toTierId, target.position);

    return {
      success: true,
      operationType: 'tier-transfer',
      action: 'move',
      metadata: {
        fromTierId,
        toTierId,
      },
    };
  }
}
