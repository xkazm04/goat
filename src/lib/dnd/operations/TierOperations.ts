/**
 * TierOperations - Handles all tier-related drag operations
 *
 * This module contains operations for:
 * - TierAssignOperation: Backlog/Collection → Tier
 * - TierMoveOperation: Reordering within the same tier
 * - TierTransferOperation: Moving between different tiers
 * - UnrankOperation: Tier → Unranked Pool
 * - RankFromPoolOperation: Unranked Pool → Tier
 * - TierToGridOperation: Tier → Grid
 * - GridToTierOperation: Grid → Tier
 */

import type {
  DragOperation,
  DragContext,
  DragOperationResult,
  OperationStoreContext,
} from './types';
import type { ValidationResult } from '@/lib/validation';
import { backlogToTransferable } from '../type-guards';
import type { BacklogItem } from '@/types/backlog-groups';
import { dndLogger } from '@/lib/logger';

// ============================================================================
// TierAssignOperation
// ============================================================================

/**
 * Handles assigning items from backlog/collection to a tier
 */
export class TierAssignOperation implements DragOperation {
  readonly type = 'tier-assign' as const;

  validate(context: DragContext, stores: OperationStoreContext): ValidationResult {
    const { source, target } = context;
    const { backlog, tier } = stores;

    // Must have tier store context
    if (!tier) {
      return {
        isValid: false,
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: 'Tier store context not available',
      };
    }

    // Target must be a tier row
    if ((target.type !== 'tier-row' && target.type !== 'tier-item') || !target.tierId) {
      return {
        isValid: false,
        errorCode: 'TARGET_POSITION_INVALID',
        errorMessage: 'Target is not a valid tier',
        debugInfo: { targetType: target.type, tierId: target.tierId },
      };
    }

    // Check if item exists
    const item = backlog.getItemById(source.itemId);
    if (!item) {
      return {
        isValid: false,
        errorCode: 'SOURCE_NOT_FOUND',
        errorMessage: 'Item not found in backlog',
        debugInfo: { itemId: source.itemId },
      };
    }

    // Check if item is already used
    if (backlog.isItemUsed(source.itemId)) {
      return {
        isValid: false,
        errorCode: 'SOURCE_ALREADY_USED',
        errorMessage: 'Item is already placed',
        debugInfo: { itemId: source.itemId },
      };
    }

    return { isValid: true };
  }

  execute(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    const { source, target } = context;
    const { backlog, tier } = stores;
    const tierId = target.tierId!;

    try {
      const item = source.item || backlog.getItemById(source.itemId);

      if (!item) {
        return {
          success: false,
          operationType: 'tier-assign',
          action: 'reject',
          errorCode: 'SOURCE_NOT_FOUND',
          errorMessage: 'Item not found',
        };
      }

      const transferable = 'category' in item
        ? backlogToTransferable(item as BacklogItem)
        : item;

      dndLogger.debug('Executing tier-assign operation', {
        itemId: source.itemId,
        tierId,
      });

      // Assign to tier and mark as used
      tier!.assignToTier(source.itemId, tierId, transferable);
      backlog.markItemAsUsed(source.itemId, true);

      return {
        success: true,
        operationType: 'tier-assign',
        action: 'assign',
        item: transferable,
        metadata: {
          toTierId: tierId,
        },
      };
    } catch (error) {
      dndLogger.error('Tier-assign operation failed', error);

      return {
        success: false,
        operationType: 'tier-assign',
        action: 'reject',
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ============================================================================
// TierMoveOperation
// ============================================================================

/**
 * Handles reordering items within the same tier
 */
export class TierMoveOperation implements DragOperation {
  readonly type = 'tier-move' as const;

  validate(context: DragContext, stores: OperationStoreContext): ValidationResult {
    const { source, target } = context;
    const { tier } = stores;

    if (!tier) {
      return {
        isValid: false,
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: 'Tier store context not available',
      };
    }

    // Source and target should be in the same tier
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

  execute(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    const { source, target } = context;
    const { tier } = stores;
    const tierId = source.tierId!;
    const fromIndex = source.orderInTier ?? 0;
    const toIndex = target.position ?? 0;

    try {
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
    } catch (error) {
      dndLogger.error('Tier-move operation failed', error);

      return {
        success: false,
        operationType: 'tier-move',
        action: 'reject',
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ============================================================================
// TierTransferOperation
// ============================================================================

/**
 * Handles moving items between different tiers
 */
export class TierTransferOperation implements DragOperation {
  readonly type = 'tier-transfer' as const;

  validate(context: DragContext, stores: OperationStoreContext): ValidationResult {
    const { source, target } = context;
    const { tier } = stores;

    if (!tier) {
      return {
        isValid: false,
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: 'Tier store context not available',
      };
    }

    // Source must be from a tier
    if (!source.tierId) {
      return {
        isValid: false,
        errorCode: 'SOURCE_NOT_FOUND',
        errorMessage: 'Source tier not identified',
      };
    }

    // Target must be a different tier
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

  execute(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    const { source, target } = context;
    const { tier } = stores;
    const fromTierId = source.tierId!;
    const toTierId = target.tierId!;

    try {
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
    } catch (error) {
      dndLogger.error('Tier-transfer operation failed', error);

      return {
        success: false,
        operationType: 'tier-transfer',
        action: 'reject',
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ============================================================================
// UnrankOperation
// ============================================================================

/**
 * Handles moving items from tier to unranked pool
 */
export class UnrankOperation implements DragOperation {
  readonly type = 'unrank' as const;

  validate(context: DragContext, stores: OperationStoreContext): ValidationResult {
    const { source, target } = context;
    const { tier } = stores;

    if (!tier) {
      return {
        isValid: false,
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: 'Tier store context not available',
      };
    }

    // Source must be from a tier
    if (source.type !== 'tier' || !source.tierId) {
      return {
        isValid: false,
        errorCode: 'SOURCE_NOT_FOUND',
        errorMessage: 'Source must be from a tier',
      };
    }

    // Target must be unranked pool
    if (target.type !== 'unranked-pool') {
      return {
        isValid: false,
        errorCode: 'TARGET_POSITION_INVALID',
        errorMessage: 'Target must be unranked pool',
      };
    }

    return { isValid: true };
  }

  execute(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    const { source } = context;
    const { tier } = stores;

    try {
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
    } catch (error) {
      dndLogger.error('Unrank operation failed', error);

      return {
        success: false,
        operationType: 'unrank',
        action: 'reject',
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ============================================================================
// RankFromPoolOperation
// ============================================================================

/**
 * Handles moving items from unranked pool to a tier
 */
export class RankFromPoolOperation implements DragOperation {
  readonly type = 'rank-from-pool' as const;

  validate(context: DragContext, stores: OperationStoreContext): ValidationResult {
    const { source, target } = context;
    const { tier } = stores;

    if (!tier) {
      return {
        isValid: false,
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: 'Tier store context not available',
      };
    }

    // Source must be from unranked pool
    if (source.type !== 'unranked-pool') {
      return {
        isValid: false,
        errorCode: 'SOURCE_NOT_FOUND',
        errorMessage: 'Source must be from unranked pool',
      };
    }

    // Target must be a tier
    if (!target.tierId) {
      return {
        isValid: false,
        errorCode: 'TARGET_POSITION_INVALID',
        errorMessage: 'Target must be a tier',
      };
    }

    return { isValid: true };
  }

  execute(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    const { source, target } = context;
    const { tier } = stores;
    const toTierId = target.tierId!;

    try {
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
    } catch (error) {
      dndLogger.error('Rank-from-pool operation failed', error);

      return {
        success: false,
        operationType: 'rank-from-pool',
        action: 'reject',
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ============================================================================
// TierToGridOperation
// ============================================================================

/**
 * Handles moving items from tier to grid
 */
export class TierToGridOperation implements DragOperation {
  readonly type = 'tier-to-grid' as const;

  validate(context: DragContext, stores: OperationStoreContext): ValidationResult {
    const { source, target } = context;
    const { grid } = stores;

    // Source must be from tier or unranked pool
    if (source.type !== 'tier' && source.type !== 'unranked-pool') {
      return {
        isValid: false,
        errorCode: 'SOURCE_NOT_FOUND',
        errorMessage: 'Source must be from tier or unranked pool',
      };
    }

    // Target must be a grid slot
    if (target.type !== 'grid-slot' || target.position === undefined) {
      return {
        isValid: false,
        errorCode: 'TARGET_POSITION_INVALID',
        errorMessage: 'Target must be a grid slot',
      };
    }

    // Check grid bounds
    if (target.position < 0 || target.position >= grid.maxGridSize) {
      return {
        isValid: false,
        errorCode: 'TARGET_OUT_OF_BOUNDS',
        errorMessage: `Position ${target.position} is out of bounds`,
      };
    }

    return { isValid: true };
  }

  execute(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    const { source, target } = context;
    const { grid, backlog } = stores;
    const position = target.position!;

    try {
      const item = source.item;

      if (!item) {
        return {
          success: false,
          operationType: 'tier-to-grid',
          action: 'reject',
          errorCode: 'SOURCE_NOT_FOUND',
          errorMessage: 'Item data not available',
        };
      }

      dndLogger.debug('Executing tier-to-grid operation', {
        itemId: source.itemId,
        fromTierId: source.tierId,
        toPosition: position,
      });

      // Assign to grid
      grid.assignItemToGrid(item as any, position);
      backlog.markItemAsUsed(source.itemId, true);

      return {
        success: true,
        operationType: 'tier-to-grid',
        action: 'assign',
        metadata: {
          fromTierId: source.tierId,
          toPosition: position,
        },
      };
    } catch (error) {
      dndLogger.error('Tier-to-grid operation failed', error);

      return {
        success: false,
        operationType: 'tier-to-grid',
        action: 'reject',
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ============================================================================
// GridToTierOperation
// ============================================================================

/**
 * Handles moving items from grid to tier
 */
export class GridToTierOperation implements DragOperation {
  readonly type = 'grid-to-tier' as const;

  validate(context: DragContext, stores: OperationStoreContext): ValidationResult {
    const { source, target } = context;
    const { grid, tier } = stores;

    if (!tier) {
      return {
        isValid: false,
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: 'Tier store context not available',
      };
    }

    // Source must be from grid
    if (source.type !== 'grid' || source.gridPosition === undefined) {
      return {
        isValid: false,
        errorCode: 'SOURCE_NOT_FOUND',
        errorMessage: 'Source must be from grid with valid position',
      };
    }

    // Target must be a tier
    if (!target.tierId) {
      return {
        isValid: false,
        errorCode: 'TARGET_POSITION_INVALID',
        errorMessage: 'Target must be a tier',
      };
    }

    // Check source has an item
    const sourceItem = grid.gridItems[source.gridPosition];
    if (!sourceItem || !sourceItem.matched) {
      return {
        isValid: false,
        errorCode: 'SOURCE_NOT_FOUND',
        errorMessage: `No item at grid position ${source.gridPosition}`,
      };
    }

    return { isValid: true };
  }

  execute(context: DragContext, stores: OperationStoreContext): DragOperationResult {
    const { source, target } = context;
    const { grid, tier } = stores;
    const fromPosition = source.gridPosition!;
    const toTierId = target.tierId!;

    try {
      const sourceItem = grid.gridItems[fromPosition];

      if (!sourceItem || !sourceItem.matched) {
        return {
          success: false,
          operationType: 'grid-to-tier',
          action: 'reject',
          errorCode: 'SOURCE_NOT_FOUND',
          errorMessage: 'Source item not found',
        };
      }

      const itemId = sourceItem.backlogItemId || sourceItem.id;
      const transferable = {
        id: itemId,
        title: sourceItem.title,
        description: sourceItem.description,
        image_url: sourceItem.image_url,
        tags: sourceItem.tags,
      };

      dndLogger.debug('Executing grid-to-tier operation', {
        itemId,
        fromPosition,
        toTierId,
      });

      // Remove from grid and add to tier
      grid.removeItemFromGrid(fromPosition);
      tier!.assignToTier(itemId, toTierId, transferable);

      return {
        success: true,
        operationType: 'grid-to-tier',
        action: 'move',
        item: transferable,
        metadata: {
          fromPosition,
          toTierId,
        },
      };
    } catch (error) {
      dndLogger.error('Grid-to-tier operation failed', error);

      return {
        success: false,
        operationType: 'grid-to-tier',
        action: 'reject',
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
