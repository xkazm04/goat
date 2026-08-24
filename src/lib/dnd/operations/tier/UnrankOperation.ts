import { dndLogger } from '@/lib/logger';

import { requireStore } from '../validation-helpers';
import { BaseTierOperation } from './BaseTierOperation';

import type { DragContext, DragOperationResult, OperationStoreContext } from '../types';
import type { ValidationResult } from '@/lib/validation';


/**
 * Handles moving items from tier to unranked pool
 */
export class UnrankOperation extends BaseTierOperation {
  readonly type = 'unrank' as const;

  validate(context: DragContext, stores: OperationStoreContext): ValidationResult {
    const { source, target } = context;

    const storeCheck = requireStore(stores, 'tier');
    if (storeCheck) return storeCheck;

    if (source.type !== 'tier' || !source.tierId) {
      return {
        isValid: false,
        errorCode: 'SOURCE_NOT_FOUND',
        errorMessage: 'Source must be from a tier',
      };
    }

    if (target.type !== 'unranked-pool') {
      return {
        isValid: false,
        errorCode: 'TARGET_POSITION_INVALID',
        errorMessage: 'Target must be unranked pool',
      };
    }

    return { isValid: true };
  }

  protected executeCore(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    const { source } = context;
    const { tier } = stores;

    dndLogger.debug('Executing unrank operation', {
      itemId: source.itemId,
      fromTierId: source.tierId,
    });

    tier!.addToUnranked(source.itemId);

    return {
      success: true,
      operationType: 'unrank',
      action: 'remove',
      metadata: {
        fromTierId: source.tierId,
      },
    };
  }
}
