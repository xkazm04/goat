import { dndLogger } from '@/lib/logger';

import type {
  DragOperation,
  DragContext,
  DragOperationType,
  DragOperationResult,
  OperationStoreContext,
} from '../types';
import type { ValidationResult } from '@/lib/validation';

/**
 * Abstract base for tier operations.
 * Provides error-wrapped execute with consistent logging and result format.
 * Subclasses implement validate() and executeCore().
 */
export abstract class BaseTierOperation implements DragOperation {
  abstract readonly type: DragOperationType;

  abstract validate(context: DragContext, stores: OperationStoreContext): ValidationResult;

  execute(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    try {
      return this.executeCore(context, stores);
    } catch (error) {
      const { source, target, opId } = context;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      dndLogger.error(`${this.type} operation failed`, {
        opId,
        error: errorMessage,
        itemId: source.itemId,
        sourceTierId: source.tierId,
        targetTierId: target.tierId,
        sourceType: source.type,
        targetType: target.type,
        position: target.position,
      });

      return {
        success: false,
        operationType: this.type,
        opId,
        action: 'reject',
        errorCode: 'UNKNOWN_ERROR',
        errorMessage,
        metadata: {
          itemId: source.itemId,
          fromTierId: source.tierId,
          toTierId: target.tierId,
          fromPosition: source.gridPosition,
          toPosition: target.position,
        },
      };
    }
  }

  protected abstract executeCore(
    context: DragContext,
    stores: OperationStoreContext
  ): DragOperationResult;
}
