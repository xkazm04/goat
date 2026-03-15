/**
 * Validation functions for item transformations
 */

import type { GridItemType } from '@/types/match';
import { createGridReceiverId, isGridReceiverId } from '@/lib/dnd/transfer-protocol';

/**
 * Validation result for item transformations
 */
export interface ItemValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that an item has required fields for grid display
 */
export function validateForGrid(item: unknown): ItemValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!item || typeof item !== 'object') {
    errors.push('Item is null or not an object');
    return { isValid: false, errors, warnings };
  }

  const obj = item as Record<string, unknown>;

  if (typeof obj.id !== 'string' || !obj.id) {
    errors.push('Missing required field: id');
  }

  if (typeof obj.title !== 'string' && typeof obj.name !== 'string') {
    warnings.push('Missing title and name fields');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a GridItemType for consistency
 */
export function validateGridItem(item: GridItemType): ItemValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!item.id) {
    errors.push('Missing required field: id');
  } else if (!isGridReceiverId(item.id)) {
    warnings.push(`ID "${item.id}" does not follow grid-{position} convention`);
  }

  if (typeof item.position !== 'number' || item.position < 0) {
    errors.push(`Invalid position: ${item.position}`);
  }

  if (typeof item.matched !== 'boolean') {
    errors.push('Missing required field: matched');
  }

  if (item.matched && !item.title) {
    warnings.push('Matched item has empty title');
  }

  if (item.matched && !item.backlogItemId) {
    warnings.push('Matched item has no backlogItemId');
  }

  const expectedId = createGridReceiverId(item.position);
  if (item.id !== expectedId) {
    warnings.push(
      `ID "${item.id}" does not match position ${item.position} (expected "${expectedId}")`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
