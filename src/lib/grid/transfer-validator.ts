/**
 * Transfer Validator - Backwards Compatibility Layer
 *
 * This module now delegates to the centralized ValidationAuthority.
 * All exports are re-exported from the ValidationAuthority for backwards compatibility.
 *
 * For new code, prefer importing directly from '@/lib/validation'.
 *
 * @deprecated Use '@/lib/validation' directly for new code.
 */

import { BacklogItem } from '@/types/backlog-groups';
import { GridItemType } from '@/types/match';
import {
  getValidationAuthority,
  ValidationErrorCode,
  ValidationResult,
  ItemValidationResult,
  getValidationNotification as getNotification,
  logValidationFailure as logFailure,
} from '@/lib/validation';

// ============================================================================
// Types - Re-exported for backwards compatibility
// ============================================================================

/**
 * @deprecated Use ValidationErrorCode from '@/lib/validation' instead
 */
export type TransferValidationErrorCode = ValidationErrorCode;

/**
 * @deprecated Use ValidationResult from '@/lib/validation' instead
 */
export interface TransferValidationResult {
  isValid: boolean;
  errorCode?: TransferValidationErrorCode;
  errorMessage?: string;
  debugInfo?: Record<string, unknown>;
}

/**
 * Source item validation input
 */
export interface SourceItemValidationInput {
  itemId: string;
  getItemById: (id: string) => BacklogItem | null;
  isItemUsed?: (id: string) => boolean;
}

/**
 * Target position validation input
 */
export interface TargetPositionValidationInput {
  position: number;
  gridItems: GridItemType[];
  maxGridSize: number;
}

// ============================================================================
// Validation Functions - Now delegating to ValidationAuthority
// ============================================================================

/**
 * Validate that a source item exists and is available for transfer
 * @deprecated Use ValidationAuthority.isItemAvailable() directly
 */
export function validateSourceItem(
  input: SourceItemValidationInput
): TransferValidationResult & { item?: BacklogItem } {
  const { itemId, getItemById, isItemUsed } = input;
  const authority = getValidationAuthority();

  return authority.isItemAvailable(itemId, {
    getItemById,
    isItemUsed: isItemUsed || (() => false),
  });
}

/**
 * Validate that a target grid position is available
 * @deprecated Use ValidationAuthority.isValidPosition() directly
 */
export function validateTargetPosition(
  input: TargetPositionValidationInput
): TransferValidationResult {
  const { position, gridItems, maxGridSize } = input;
  const authority = getValidationAuthority();

  return authority.isValidPosition(position, { gridItems, maxGridSize });
}

/**
 * Validate a complete transfer operation (backlog to grid)
 * @deprecated Use ValidationAuthority.canTransfer() directly
 */
export function validateTransfer(
  sourceInput: SourceItemValidationInput,
  targetInput: TargetPositionValidationInput
): TransferValidationResult & { item?: BacklogItem } {
  const { itemId, getItemById, isItemUsed } = sourceInput;
  const { position, gridItems, maxGridSize } = targetInput;
  const authority = getValidationAuthority();

  return authority.canTransfer(
    {
      itemId,
      from: 'backlog',
      to: 'grid',
      toPosition: position,
    },
    { gridItems, maxGridSize },
    {
      getItemById,
      isItemUsed: isItemUsed || (() => false),
    }
  );
}

// ============================================================================
// Error Message Helpers - Re-exported from ValidationAuthority
// ============================================================================

/**
 * Get a user-friendly notification message for a validation error
 * @deprecated Use getValidationNotification from '@/lib/validation' directly
 */
export function getValidationNotification(errorCode: TransferValidationErrorCode): {
  title: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
} {
  return getNotification(errorCode);
}

// ============================================================================
// Logging Helpers - Re-exported from ValidationAuthority
// ============================================================================

/**
 * Log a validation failure for debugging
 * @deprecated Use logValidationFailure from '@/lib/validation' directly
 */
export function logValidationFailure(
  result: TransferValidationResult,
  context: { activeId?: string; overId?: string; operation?: string } = {}
): void {
  logFailure(result, context);
}
