import type { DragContext, DragOperationResult, OperationStoreContext } from '../types';
import type { ValidationResult } from '@/lib/validation';
import { requireStore } from '../validation-helpers';
import { dndLogger } from '@/lib/logger';
import { BaseTierOperation } from './BaseTierOperation';

/**
 * Handles moving items from unranked pool to a tier
 */
export class RankFromPoolOperation extends BaseTierOperation {
  readonly type = 'rank-from-pool' as const;

  validate(context: DragContext, stores: OperationStoreContext): ValidationResult {
    const { source, target } = context;

    const storeCheck = requireStore(stores, 'tier');
    if (storeCheck) return storeCheck;

    if (source.type !== 'unranked-pool') {
      return {
        isValid: false,
        errorCode: 'SOURCE_NOT_FOUND',
        errorMessage: 'Source must be from unranked pool',
      };
    }

    if (!target.tierId) {
      return {
        isValid: false,
        errorCode: 'TARGET_POSITION_INVALID',
        errorMessage: 'Target must be a tier',
      };
    }

    return { isValid: true };
  }

  protected executeCore(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    const { source, target } = context;
    const { tier } = stores;
    const toTierId = target.tierId!;

    dndLogger.debug('Executing rank-from-pool operation', {
      itemId: source.itemId,
      toTierId,
    });

    tier!.assignToTier(source.itemId, toTierId);

    return {
      success: true,
      operationType: 'rank-from-pool',
      action: 'assign',
      metadata: {
        toTierId,
      },
    };
  }
}
