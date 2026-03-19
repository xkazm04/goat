/**
 * Shared validation helpers for drag operations.
 *
 * Centralizes repeated validation patterns so each operation can compose
 * the checks it needs without duplicating code.
 */

import type { ValidationResult } from '@/lib/validation';
import type {
  DragTarget,
  DragSource,
  OperationStoreContext,
  TierStoreContext,
} from './types';

/**
 * Require that a store context property is present (non-nullish).
 * Commonly used for the optional `tier` store.
 */
export function requireStore<K extends keyof OperationStoreContext>(
  stores: OperationStoreContext,
  key: K
): ValidationResult | null {
  if (!stores[key]) {
    return {
      isValid: false,
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: `${String(key)} store context not available`,
    };
  }
  return null;
}

/**
 * Require the target to be a valid grid slot with a defined position.
 */
export function requireGridSlotTarget(target: DragTarget): ValidationResult | null {
  if (target.type !== 'grid-slot' || target.position === undefined) {
    return {
      isValid: false,
      errorCode: 'TARGET_POSITION_INVALID',
      errorMessage: 'Target is not a valid grid slot',
      debugInfo: { targetType: target.type, targetPosition: target.position },
    };
  }
  return null;
}

/**
 * Require the target to be a valid tier row/item with a tier ID.
 */
export function requireTierTarget(target: DragTarget): ValidationResult | null {
  if ((target.type !== 'tier-row' && target.type !== 'tier-item') || !target.tierId) {
    return {
      isValid: false,
      errorCode: 'TARGET_POSITION_INVALID',
      errorMessage: 'Target is not a valid tier',
      debugInfo: { targetType: target.type, tierId: target.tierId },
    };
  }
  return null;
}

/**
 * Require the position to be within grid bounds.
 */
export function requirePositionInBounds(
  position: number,
  maxGridSize: number
): ValidationResult | null {
  if (position < 0 || position >= maxGridSize) {
    return {
      isValid: false,
      errorCode: 'TARGET_OUT_OF_BOUNDS',
      errorMessage: `Position ${position} is out of bounds`,
      debugInfo: { position, maxGridSize },
    };
  }
  return null;
}

/**
 * Require that a source grid position is defined.
 */
export function requireSourceGridPosition(source: DragSource): ValidationResult | null {
  if (source.gridPosition === undefined) {
    return {
      isValid: false,
      errorCode: 'TARGET_POSITION_INVALID',
      errorMessage: 'Source grid position is not defined',
      debugInfo: { sourceGridPosition: source.gridPosition },
    };
  }
  return null;
}

/**
 * Require that a backlog item exists and is not already used.
 */
export function requireAvailableBacklogItem(
  itemId: string,
  stores: OperationStoreContext
): ValidationResult | null {
  const { backlog } = stores;

  const item = backlog.getItemById(itemId);
  if (!item) {
    return {
      isValid: false,
      errorCode: 'SOURCE_NOT_FOUND',
      errorMessage: 'Item not found in backlog',
      debugInfo: { itemId },
    };
  }

  if (backlog.isItemUsed(itemId)) {
    return {
      isValid: false,
      errorCode: 'SOURCE_ALREADY_USED',
      errorMessage: 'Item is already placed',
      debugInfo: { itemId },
    };
  }

  return null;
}

/**
 * Run a sequence of validation checks, returning the first failure or null if all pass.
 */
export function validateAll(
  ...checks: Array<ValidationResult | null>
): ValidationResult | null {
  for (const check of checks) {
    if (check !== null) return check;
  }
  return null;
}
