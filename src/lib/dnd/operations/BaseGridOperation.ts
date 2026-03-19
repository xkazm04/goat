/**
 * BaseGridOperation - Shared logic for grid-to-grid operations (Move, Swap)
 *
 * Provides:
 * - Common grid-to-grid validation (source/target position checks, same-position guard)
 * - ValidationAuthority integration
 * - Error-wrapped execute with consistent result construction
 * - Rollback via reverse moveGridItem
 */

import { dndLogger } from '@/lib/logger';
import { getValidationAuthority } from '@/lib/validation';

import type {
  DragOperation,
  DragContext,
  DragOperationType,
  DragOperationResult,
  OperationStoreContext,
} from './types';
import type { ValidationResult } from '@/lib/validation';

/**
 * Abstract base for grid-to-grid operations (move and swap).
 * Subclasses implement:
 * - `additionalValidation()` for operation-specific checks
 * - `executeCore()` for the actual grid mutation + result
 */
export abstract class BaseGridOperation implements DragOperation {
  abstract readonly type: DragOperationType;

  /**
   * Common grid-to-grid validation.
   * Checks source/target positions, same-position guard, and calls ValidationAuthority.
   * Then delegates to `additionalValidation()` for operation-specific checks.
   */
  validate(context: DragContext, stores: OperationStoreContext): ValidationResult {
    const { source, target } = context;
    const { grid } = stores;

    if (source.gridPosition === undefined) {
      return {
        isValid: false,
        errorCode: 'TARGET_POSITION_INVALID',
        errorMessage: 'Source grid position is not defined',
        debugInfo: { sourceGridPosition: source.gridPosition },
      };
    }

    if (target.type !== 'grid-slot' || target.position === undefined) {
      return {
        isValid: false,
        errorCode: 'TARGET_POSITION_INVALID',
        errorMessage: 'Target is not a valid grid slot',
        debugInfo: { targetType: target.type, targetPosition: target.position },
      };
    }

    if (source.gridPosition === target.position) {
      return {
        isValid: false,
        errorCode: 'SAME_POSITION',
        errorMessage: 'Source and target positions are the same',
        debugInfo: { fromPosition: source.gridPosition, toPosition: target.position },
      };
    }

    const authority = getValidationAuthority();
    const validationResult = authority.canTransfer(
      {
        itemId: source.itemId,
        from: 'grid',
        fromPosition: source.gridPosition,
        to: 'grid',
        toPosition: target.position,
      },
      {
        gridItems: grid.gridItems,
        maxGridSize: grid.maxGridSize,
      },
      {
        getItemById: () => null,
        isItemUsed: () => false,
      }
    );

    if (!validationResult.isValid) {
      return validationResult;
    }

    return this.additionalValidation(context, stores, validationResult);
  }

  /**
   * Override to add operation-specific validation after common checks pass.
   * Default: pass through the validation result unchanged.
   */
  protected additionalValidation(
    _context: DragContext,
    _stores: OperationStoreContext,
    result: ValidationResult
  ): ValidationResult {
    return result;
  }

  /**
   * Wraps executeCore() in error handling with consistent logging and result format.
   */
  execute(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    try {
      return this.executeCore(context, stores);
    } catch (error) {
      dndLogger.error(`${this.type} operation failed`, error);
      return {
        success: false,
        operationType: this.type,
        action: 'reject',
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: error instanceof Error ? error.message : `Unknown error during ${this.type}`,
      };
    }
  }

  /**
   * Implement the actual grid mutation. Errors are caught by execute().
   */
  protected abstract executeCore(
    context: DragContext,
    stores: OperationStoreContext
  ): DragOperationResult;

  /**
   * Common rollback: reverse the moveGridItem call.
   */
  rollback(
    _context: DragContext,
    result: DragOperationResult,
    stores: OperationStoreContext
  ): void {
    const { grid } = stores;

    if (
      result.success &&
      result.metadata?.fromPosition !== undefined &&
      result.metadata?.toPosition !== undefined
    ) {
      grid.moveGridItem(result.metadata.toPosition, result.metadata.fromPosition);

      dndLogger.debug(`Rolled back ${this.type} operation`, {
        fromPosition: result.metadata.toPosition,
        toPosition: result.metadata.fromPosition,
      });
    }
  }
}
