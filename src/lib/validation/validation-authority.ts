/**
 * ValidationAuthority - Single Source of Truth for All Validation Rules
 *
 * This module centralizes ALL validation logic for the match/ranking system.
 * All validation now delegates to this authority, ensuring consistent behavior
 * across the entire application.
 *
 * Key responsibilities:
 * - canTransfer(itemId, from, to): Validates if an item can move between locations
 * - isValidPosition(position): Validates if a grid position is valid
 * - isItemAvailable(itemId): Validates if an item can be used
 *
 * Benefits:
 * - Single source of truth for validation rules
 * - Declarative configuration instead of scattered conditionals
 * - Consistent behavior across all stores and components
 * - Easy to modify validation rules in one place
 */

import { BacklogItem } from '@/types/backlog-groups';
import { GridItemType } from '@/types/match';

// ============================================================================
// Types
// ============================================================================

/**
 * Validation error codes - unified across all validation operations
 */
export type ValidationErrorCode =
  | 'SOURCE_NOT_FOUND'
  | 'SOURCE_ALREADY_USED'
  | 'TARGET_POSITION_INVALID'
  | 'TARGET_POSITION_OCCUPIED'
  | 'TARGET_OUT_OF_BOUNDS'
  | 'GRID_NOT_INITIALIZED'
  | 'ITEM_LOCKED'
  | 'SAME_POSITION'
  | 'UNKNOWN_ERROR';

/**
 * Result of any validation operation
 */
export interface ValidationResult {
  /** Whether the validation passed */
  isValid: boolean;
  /** Error code if validation failed */
  errorCode?: ValidationErrorCode;
  /** User-friendly error message */
  errorMessage?: string;
  /** Technical details for debugging */
  debugInfo?: Record<string, unknown>;
}

/**
 * Extended validation result that includes the validated item
 */
export interface ItemValidationResult extends ValidationResult {
  /** The validated item if found */
  item?: BacklogItem;
}

/**
 * Transfer context - describes a transfer operation
 */
export interface TransferContext {
  /** The item being transferred (ID) */
  itemId: string;
  /** Source location type */
  from: 'backlog' | 'grid';
  /** Source position (if from grid) */
  fromPosition?: number;
  /** Target location type */
  to: 'backlog' | 'grid';
  /** Target position (if to grid) */
  toPosition?: number;
}

/**
 * Grid context for validation
 */
export interface GridContext {
  /** Current grid items */
  gridItems: GridItemType[];
  /** Maximum grid size */
  maxGridSize: number;
}

/**
 * Item lookup context for validation
 */
export interface ItemLookupContext {
  /** Function to get item by ID */
  getItemById: (id: string) => BacklogItem | null;
  /** Function to check if item is used */
  isItemUsed: (id: string) => boolean;
  /** Function to check if item is locked (being dragged) */
  isItemLocked?: (id: string) => boolean;
}

/**
 * Validation rules configuration (declarative)
 */
export interface ValidationRules {
  /** Allow dropping on occupied slots (triggers swap) */
  allowSwap: boolean;
  /** Require item to be available (not used elsewhere) */
  requireAvailableItem: boolean;
  /** Allow same-position "move" (no-op) */
  allowSamePosition: boolean;
}

/**
 * Default validation rules
 */
const DEFAULT_RULES: ValidationRules = {
  allowSwap: true,
  requireAvailableItem: true,
  allowSamePosition: false,
};

// ============================================================================
// ValidationAuthority Class
// ============================================================================

/**
 * ValidationAuthority - Centralized validation for all transfer operations
 *
 * Usage:
 * ```typescript
 * const authority = new ValidationAuthority();
 * const result = authority.canTransfer(context, gridContext, itemContext);
 * if (!result.isValid) {
 *   showError(result.errorCode);
 * }
 * ```
 */
export class ValidationAuthority {
  private rules: ValidationRules;

  constructor(rules: Partial<ValidationRules> = {}) {
    this.rules = { ...DEFAULT_RULES, ...rules };
  }

  /**
   * Update validation rules
   */
  setRules(rules: Partial<ValidationRules>): void {
    this.rules = { ...this.rules, ...rules };
  }

  /**
   * Get current validation rules
   */
  getRules(): ValidationRules {
    return { ...this.rules };
  }

  // ==========================================================================
  // Core Validation Methods
  // ==========================================================================

  /**
   * Validate if an item can be transferred between locations
   *
   * This is the main entry point for transfer validation.
   * Combines item availability check and position validation.
   *
   * @param context - Transfer context describing the operation
   * @param gridContext - Grid state for position validation
   * @param itemContext - Item lookup functions
   * @returns Validation result with optional item
   */
  canTransfer(
    context: TransferContext,
    gridContext: GridContext,
    itemContext: ItemLookupContext
  ): ItemValidationResult {
    const { itemId, from, fromPosition, to, toPosition } = context;

    // Validate item availability (for backlog -> grid transfers)
    if (from === 'backlog') {
      const itemResult = this.isItemAvailable(itemId, itemContext);
      if (!itemResult.isValid) {
        return itemResult;
      }

      // If transferring to grid, validate target position
      if (to === 'grid' && toPosition !== undefined) {
        const positionResult = this.isValidPosition(toPosition, gridContext);
        if (!positionResult.isValid) {
          // Check if this is an occupied position that could be a swap
          if (positionResult.errorCode === 'TARGET_POSITION_OCCUPIED' && this.rules.allowSwap) {
            // Allow the transfer - swap will be handled by the caller
            return { isValid: true, item: itemResult.item };
          }
          return { ...positionResult, item: itemResult.item };
        }
      }

      return { isValid: true, item: itemResult.item };
    }

    // Validate grid -> grid transfers (move/swap)
    if (from === 'grid' && to === 'grid') {
      // Validate fromPosition
      if (fromPosition === undefined) {
        return {
          isValid: false,
          errorCode: 'TARGET_POSITION_INVALID',
          errorMessage: 'Source position is required for grid-to-grid transfer',
          debugInfo: { from, fromPosition },
        };
      }

      // Validate toPosition
      if (toPosition === undefined) {
        return {
          isValid: false,
          errorCode: 'TARGET_POSITION_INVALID',
          errorMessage: 'Target position is required for grid-to-grid transfer',
          debugInfo: { to, toPosition },
        };
      }

      // Check same position
      if (fromPosition === toPosition) {
        if (!this.rules.allowSamePosition) {
          return {
            isValid: false,
            errorCode: 'SAME_POSITION',
            errorMessage: 'Source and target positions are the same',
            debugInfo: { fromPosition, toPosition },
          };
        }
        return { isValid: true };
      }

      // Validate both positions are in bounds
      const fromValid = this.isPositionInBounds(fromPosition, gridContext);
      if (!fromValid.isValid) {
        return fromValid;
      }

      const toValid = this.isPositionInBounds(toPosition, gridContext);
      if (!toValid.isValid) {
        return toValid;
      }

      // Check source has an item
      const sourceItem = gridContext.gridItems[fromPosition];
      if (!sourceItem || !sourceItem.matched) {
        return {
          isValid: false,
          errorCode: 'SOURCE_NOT_FOUND',
          errorMessage: `No item at source position ${fromPosition + 1}`,
          debugInfo: { fromPosition },
        };
      }

      return { isValid: true };
    }

    // Grid -> backlog (remove) - always valid if position has item
    if (from === 'grid' && to === 'backlog') {
      if (fromPosition === undefined) {
        return {
          isValid: false,
          errorCode: 'TARGET_POSITION_INVALID',
          errorMessage: 'Position is required for removal',
        };
      }

      const posValid = this.isPositionInBounds(fromPosition, gridContext);
      if (!posValid.isValid) {
        return posValid;
      }

      return { isValid: true };
    }

    return { isValid: true };
  }

  /**
   * Validate if a grid position is valid for placing an item
   *
   * Checks:
   * - Grid is initialized
   * - Position is within bounds
   * - Position is not occupied (unless swap is allowed)
   *
   * @param position - The grid position to validate (0-indexed)
   * @param gridContext - Grid state
   * @returns Validation result
   */
  isValidPosition(position: number, gridContext: GridContext): ValidationResult {
    const { gridItems, maxGridSize } = gridContext;

    // Check grid initialization
    if (!gridItems || gridItems.length === 0) {
      return {
        isValid: false,
        errorCode: 'GRID_NOT_INITIALIZED',
        errorMessage: 'The ranking grid is not ready. Please wait a moment and try again.',
        debugInfo: { gridItemsLength: gridItems?.length ?? 0 },
      };
    }

    // Check bounds
    const boundsResult = this.isPositionInBounds(position, gridContext);
    if (!boundsResult.isValid) {
      return boundsResult;
    }

    // Check if occupied
    const targetSlot = gridItems[position];
    if (targetSlot && targetSlot.matched) {
      return {
        isValid: false,
        errorCode: 'TARGET_POSITION_OCCUPIED',
        errorMessage: `Position ${position + 1} already has an item. Drop on an empty slot or swap items.`,
        debugInfo: {
          position,
          occupyingItem: targetSlot.title,
          occupyingItemId: targetSlot.backlogItemId,
        },
      };
    }

    return { isValid: true };
  }

  /**
   * Validate if a position is within grid bounds
   *
   * @param position - The grid position to validate (0-indexed)
   * @param gridContext - Grid state
   * @returns Validation result
   */
  isPositionInBounds(position: number, gridContext: GridContext): ValidationResult {
    const { gridItems, maxGridSize } = gridContext;

    if (position < 0 || position >= maxGridSize || position >= gridItems.length) {
      return {
        isValid: false,
        errorCode: 'TARGET_OUT_OF_BOUNDS',
        errorMessage: `Position ${position + 1} is outside the valid range (1-${gridItems.length}).`,
        debugInfo: { position, maxGridSize, actualGridSize: gridItems.length },
      };
    }

    return { isValid: true };
  }

  /**
   * Validate if an item is available for use
   *
   * Checks:
   * - Item exists
   * - Item is not already used
   * - Item is not locked (being dragged)
   *
   * @param itemId - The item ID to validate
   * @param context - Item lookup context
   * @returns Validation result with the item if valid
   */
  isItemAvailable(itemId: string, context: ItemLookupContext): ItemValidationResult {
    const { getItemById, isItemUsed, isItemLocked } = context;

    // Check item exists
    const item = getItemById(itemId);
    if (!item) {
      return {
        isValid: false,
        errorCode: 'SOURCE_NOT_FOUND',
        errorMessage: 'The item you tried to drag could not be found. It may have been removed.',
        debugInfo: { itemId },
      };
    }

    // Check if item is locked (concurrent drag prevention)
    if (isItemLocked && isItemLocked(itemId)) {
      return {
        isValid: false,
        errorCode: 'ITEM_LOCKED',
        errorMessage: 'This item is currently being moved. Please wait.',
        debugInfo: { itemId, itemTitle: item.name || item.title },
      };
    }

    // Check if item is already used
    if (this.rules.requireAvailableItem && isItemUsed(itemId)) {
      return {
        isValid: false,
        errorCode: 'SOURCE_ALREADY_USED',
        errorMessage: 'This item is already placed on the grid. Remove it first to move it.',
        debugInfo: { itemId, itemTitle: item.name || item.title },
      };
    }

    return { isValid: true, item };
  }

  /**
   * Check if a position can receive an item (simple boolean check)
   *
   * @param position - The grid position to check
   * @param gridContext - Grid state
   * @returns True if position can receive an item
   */
  canReceiveAtPosition(position: number, gridContext: GridContext): boolean {
    const result = this.isValidPosition(position, gridContext);
    return result.isValid;
  }

  /**
   * Check if a swap is possible at a position
   *
   * @param position - The grid position to check
   * @param gridContext - Grid state
   * @returns True if position has an item that can be swapped
   */
  canSwapAtPosition(position: number, gridContext: GridContext): boolean {
    if (!this.rules.allowSwap) return false;

    const boundsResult = this.isPositionInBounds(position, gridContext);
    if (!boundsResult.isValid) return false;

    const slot = gridContext.gridItems[position];
    return slot && slot.matched;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let authorityInstance: ValidationAuthority | null = null;

/**
 * Get the global ValidationAuthority instance
 *
 * @param rules - Optional rules to apply (only used on first call or reset)
 * @returns The ValidationAuthority instance
 */
export function getValidationAuthority(rules?: Partial<ValidationRules>): ValidationAuthority {
  if (!authorityInstance) {
    authorityInstance = new ValidationAuthority(rules);
  } else if (rules) {
    authorityInstance.setRules(rules);
  }
  return authorityInstance;
}

/**
 * Reset the global ValidationAuthority instance
 * Useful for testing or rule changes
 */
export function resetValidationAuthority(): void {
  authorityInstance = null;
}

// ============================================================================
// Notification Helpers
// ============================================================================

/**
 * Get a user-friendly notification message for a validation error
 *
 * @param errorCode - The validation error code
 * @returns Object with title and description for notification
 */
export function getValidationNotification(errorCode: ValidationErrorCode): {
  title: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
} {
  switch (errorCode) {
    case 'SOURCE_NOT_FOUND':
      return {
        title: 'Item Not Found',
        description: 'The item could not be found. Try refreshing the page.',
        severity: 'error',
      };

    case 'SOURCE_ALREADY_USED':
      return {
        title: 'Item Already Placed',
        description: 'This item is already on your grid. Remove it first to reposition.',
        severity: 'warning',
      };

    case 'TARGET_POSITION_INVALID':
      return {
        title: 'Invalid Position',
        description: 'Could not determine the target position. Please try again.',
        severity: 'error',
      };

    case 'TARGET_POSITION_OCCUPIED':
      return {
        title: 'Position Occupied',
        description: 'Drop on an empty slot, or drag directly onto another item to swap.',
        severity: 'info',
      };

    case 'TARGET_OUT_OF_BOUNDS':
      return {
        title: 'Out of Range',
        description: 'That position is outside your current grid size.',
        severity: 'warning',
      };

    case 'GRID_NOT_INITIALIZED':
      return {
        title: 'Grid Not Ready',
        description: 'The ranking grid is still loading. Please wait a moment.',
        severity: 'warning',
      };

    case 'ITEM_LOCKED':
      return {
        title: 'Item In Use',
        description: 'This item is currently being moved. Please wait.',
        severity: 'warning',
      };

    case 'SAME_POSITION':
      return {
        title: 'Same Position',
        description: 'The item is already at this position.',
        severity: 'info',
      };

    case 'UNKNOWN_ERROR':
    default:
      return {
        title: 'Something Went Wrong',
        description: 'An unexpected error occurred. Please try again.',
        severity: 'error',
      };
  }
}

// ============================================================================
// Logging Helpers
// ============================================================================

/**
 * Log a validation failure for debugging
 *
 * @param result - The validation result
 * @param context - Additional context about the operation
 */
export function logValidationFailure(
  result: ValidationResult,
  context: { activeId?: string; overId?: string; operation?: string } = {}
): void {
  if (result.isValid) return;

  console.warn(
    `⚠️ ValidationAuthority [${result.errorCode}]:`,
    result.errorMessage,
    {
      ...context,
      debugInfo: result.debugInfo,
    }
  );
}
