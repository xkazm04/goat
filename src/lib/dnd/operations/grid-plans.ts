/**
 * Grid Operation Plans — Decomposition Layer
 *
 * Decomposes high-level grid operations (assign, move, swap) into sequences
 * of algebraic primitives (Place, Remove, Swap).
 *
 * Each plan function:
 * 1. Performs pre-checks (backlog availability, lock management)
 * 2. Returns a GridOperationPlan with primitives + backlog side-effects
 * 3. Or returns a ValidationResult on early failure
 *
 * The DragOperationRouter calls these to get a plan, validates the primitives,
 * then executes them.
 */

import { dndLogger } from '@/lib/logger';
import { getValidationAuthority, logValidationFailure } from '@/lib/validation';

import { validateSequence, executeSequence } from './primitives';

import type { GridPrimitive, GridState } from './primitives';
import type { TransferableItem } from '../transfer-protocol';
import type {
  DragContext,
  DragOperation,
  DragOperationType,
  DragOperationResult,
  OperationStoreContext,
} from './types';
import type { ValidationResult } from '@/lib/validation';

// ============================================================================
// Plan Types
// ============================================================================

export interface BacklogEffect {
  itemId: string;
  markUsed: boolean;
}

export interface GridOperationPlan {
  primitives: GridPrimitive[];
  backlogEffects: BacklogEffect[];
  resultMeta: {
    operationType: DragOperationType;
    action: TransferableItem extends never ? never : string;
    item?: TransferableItem;
    metadata?: DragOperationResult['metadata'];
  };
}

// ============================================================================
// LockManager (moved from AssignOperation)
// ============================================================================

class LockManager {
  private locks = new Map<string, { acquiredAt: number; timer: ReturnType<typeof setTimeout> }>();
  private defaultTimeoutMs: number;

  constructor(defaultTimeoutMs = 5000) {
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  acquireLock(itemId: string, timeoutMs?: number): boolean {
    if (this.locks.has(itemId)) return false;
    const timeout = timeoutMs ?? this.defaultTimeoutMs;
    const timer = setTimeout(() => { this.locks.delete(itemId); }, timeout);
    this.locks.set(itemId, { acquiredAt: Date.now(), timer });
    return true;
  }

  releaseLock(itemId: string): void {
    const lock = this.locks.get(itemId);
    if (lock) {
      clearTimeout(lock.timer);
      this.locks.delete(itemId);
    }
  }

  isLocked(itemId: string): boolean {
    return this.locks.has(itemId);
  }

  reset(): void {
    for (const [, lock] of Array.from(this.locks)) {
      clearTimeout(lock.timer);
    }
    this.locks.clear();
  }
}

/** Singleton lock manager for assignment operations */
const assignmentLocks = new LockManager(5000);

// ============================================================================
// Plan Functions
// ============================================================================

/**
 * Plan an assign operation (backlog/collection → grid).
 *
 * Handles:
 * - Lock acquisition to prevent double-drag race conditions
 * - ValidationAuthority checks (item exists, not used, position valid)
 * - Displacement of existing item at target position
 * - TOCTOU re-validation
 */
export function planAssign(
  context: DragContext,
  stores: OperationStoreContext
): GridOperationPlan | ValidationResult {
  const { source, target } = context;
  const { grid, backlog } = stores;
  const position = target.position;

  // Target must be a grid slot
  if (target.type !== 'grid-slot' || position === undefined) {
    return {
      isValid: false,
      errorCode: 'TARGET_POSITION_INVALID',
      errorMessage: 'Target is not a valid grid slot',
      debugInfo: { targetType: target.type, targetPosition: position },
    };
  }

  // Acquire lock to prevent concurrent assignment of same item
  if (!assignmentLocks.acquireLock(source.itemId)) {
    return {
      isValid: false,
      errorCode: 'SOURCE_ALREADY_USED',
      errorMessage: 'Item is already being assigned (concurrent drag blocked)',
      debugInfo: { itemId: source.itemId },
    };
  }

  // Use ValidationAuthority for comprehensive item + position validation
  const authority = getValidationAuthority();
  const validationResult = authority.canTransfer(
    {
      itemId: source.itemId,
      from: 'backlog',
      to: 'grid',
      toPosition: position,
    },
    {
      gridItems: grid.gridItems,
      maxGridSize: grid.maxGridSize,
    },
    {
      getItemById: backlog.getItemById,
      isItemUsed: backlog.isItemUsed,
      isItemLocked: (id) => assignmentLocks.isLocked(id) && id !== source.itemId,
    }
  );

  if (!validationResult.isValid) {
    assignmentLocks.releaseLock(source.itemId);
    logValidationFailure(validationResult, {
      activeId: source.itemId,
      overId: `grid-${position}`,
      operation: 'assign',
    });
    return validationResult;
  }

  // Get the item to assign
  const item = source.item || backlog.getItemById(source.itemId);
  if (!item) {
    assignmentLocks.releaseLock(source.itemId);
    return {
      isValid: false,
      errorCode: 'SOURCE_NOT_FOUND',
      errorMessage: 'Item not found after validation',
    };
  }

  // Build primitive sequence
  const primitives: GridPrimitive[] = [];
  const backlogEffects: BacklogEffect[] = [];
  let displacedItem: TransferableItem | undefined;

  // If target is occupied, remove the existing item first
  const existing = grid.gridItems[position];
  if (existing && existing.context.matched && existing.item?.id) {
    // The plan states WHICH ITEM it is displacing, not just which slot.
    // Execution refuses if the occupant changed between plan and apply.
    primitives.push({ kind: 'remove', position, expectItemId: existing.item.id });
    backlogEffects.push({ itemId: existing.item.id, markUsed: false });
    displacedItem = {
      id: existing.item.id,
      title: existing.item.title,
      description: existing.item.description,
      image_url: existing.item.image_url,
      tags: existing.item.tags,
    };
  }

  // Place the new item
  primitives.push({ kind: 'place', itemId: source.itemId, item, position });
  backlogEffects.push({ itemId: source.itemId, markUsed: true });

  // Build transferable item for result
  const itemTitle = 'title' in item && typeof item.title === 'string'
    ? item.title
    : ('name' in item && typeof (item as { name?: string }).name === 'string'
      ? (item as { name: string }).name
      : 'unknown');

  return {
    primitives,
    backlogEffects,
    resultMeta: {
      operationType: 'assign',
      action: 'assign',
      item: {
        id: source.itemId,
        title: itemTitle,
        description: 'description' in item ? (item as { description?: string }).description : undefined,
        image_url: 'image_url' in item ? (item as { image_url?: string | null }).image_url : undefined,
        tags: 'tags' in item ? (item as { tags?: string[] }).tags : undefined,
      },
      metadata: {
        toPosition: position,
        displacedItem,
      },
    },
  };
}

/**
 * Plan a move operation (grid → empty grid slot).
 * Decomposes to: Swap(from, to) — moveGridItem handles both cases.
 */
export function planMove(
  context: DragContext,
  stores: OperationStoreContext
): GridOperationPlan | ValidationResult {
  const { source, target } = context;
  const { grid } = stores;
  const fromPosition = source.gridPosition;
  const toPosition = target.position;

  if (fromPosition === undefined) {
    return {
      isValid: false,
      errorCode: 'TARGET_POSITION_INVALID',
      errorMessage: 'Source grid position is not defined',
    };
  }

  if (target.type !== 'grid-slot' || toPosition === undefined) {
    return {
      isValid: false,
      errorCode: 'TARGET_POSITION_INVALID',
      errorMessage: 'Target is not a valid grid slot',
    };
  }

  const sourceItem = grid.gridItems[fromPosition];
  if (!sourceItem || !sourceItem.context.matched) {
    return {
      isValid: false,
      errorCode: 'SOURCE_NOT_FOUND',
      errorMessage: `No item at source position ${fromPosition}`,
    };
  }

  return {
    primitives: [
      {
        kind: 'swap',
        posA: fromPosition,
        posB: toPosition,
        // Identities as of PLAN time. Execution refuses if either slot's
        // occupant changed in between — the drop was a statement about these
        // items, and applying it to whoever occupies those indices now would be
        // a different operation than the one the user watched.
        expectItemA: grid.gridItems[fromPosition]?.item?.id ?? null,
        expectItemB: grid.gridItems[toPosition]?.context.matched
          ? (grid.gridItems[toPosition]?.item?.id ?? null)
          : null,
      },
    ],
    backlogEffects: [],
    resultMeta: {
      operationType: 'move',
      action: 'move',
      item: {
        // NEVER `|| sourceItem.id`: that field is the SLOT ADDRESS ("grid-7"),
        // rewritten whenever the slot's occupant changes. Falling back to it
        // hands downstream consumers an "item id" that is a function of
        // position — the exact defect this pass exists to remove. A slot with
        // no item has no item identity, and empty is the honest answer.
        id: sourceItem.item?.id ?? '',
        title: sourceItem.item?.title ?? '',
        description: sourceItem.item?.description,
        image_url: sourceItem.item?.image_url,
        tags: sourceItem.item?.tags,
      },
      metadata: {
        fromPosition,
        toPosition,
        wasSwap: false,
      },
    },
  };
}

/**
 * Plan a swap operation (grid ↔ grid, both occupied).
 * Decomposes to: Swap(posA, posB).
 */
export function planSwap(
  context: DragContext,
  stores: OperationStoreContext
): GridOperationPlan | ValidationResult {
  const { source, target } = context;
  const { grid } = stores;
  const fromPosition = source.gridPosition;
  const toPosition = target.position;

  if (fromPosition === undefined) {
    return {
      isValid: false,
      errorCode: 'TARGET_POSITION_INVALID',
      errorMessage: 'Source grid position is not defined',
    };
  }

  if (target.type !== 'grid-slot' || toPosition === undefined) {
    return {
      isValid: false,
      errorCode: 'TARGET_POSITION_INVALID',
      errorMessage: 'Target is not a valid grid slot',
    };
  }

  const sourceItem = grid.gridItems[fromPosition];
  if (!sourceItem || !sourceItem.context.matched) {
    return {
      isValid: false,
      errorCode: 'SOURCE_NOT_FOUND',
      errorMessage: `No item at source position ${fromPosition}`,
    };
  }

  const targetItem = grid.gridItems[toPosition];

  return {
    primitives: [
      {
        kind: 'swap',
        posA: fromPosition,
        posB: toPosition,
        // Identities as of PLAN time. Execution refuses if either slot's
        // occupant changed in between — the drop was a statement about these
        // items, and applying it to whoever occupies those indices now would be
        // a different operation than the one the user watched.
        expectItemA: grid.gridItems[fromPosition]?.item?.id ?? null,
        expectItemB: grid.gridItems[toPosition]?.context.matched
          ? (grid.gridItems[toPosition]?.item?.id ?? null)
          : null,
      },
    ],
    backlogEffects: [],
    resultMeta: {
      operationType: 'swap',
      action: 'swap',
      item: {
        // NEVER `|| sourceItem.id`: that field is the SLOT ADDRESS ("grid-7"),
        // rewritten whenever the slot's occupant changes. Falling back to it
        // hands downstream consumers an "item id" that is a function of
        // position — the exact defect this pass exists to remove. A slot with
        // no item has no item identity, and empty is the honest answer.
        id: sourceItem.item?.id ?? '',
        title: sourceItem.item?.title ?? '',
        description: sourceItem.item?.description,
        image_url: sourceItem.item?.image_url,
        tags: sourceItem.item?.tags,
      },
      metadata: {
        fromPosition,
        toPosition,
        wasSwap: true,
        displacedItem: targetItem?.context.matched
          ? {
              id: targetItem.item?.id || targetItem.id,
              title: targetItem.item?.title ?? '',
              description: targetItem.item?.description,
              image_url: targetItem.item?.image_url,
              tags: targetItem.item?.tags,
            }
          : undefined,
      },
    },
  };
}

// ============================================================================
// Plan Execution
// ============================================================================

/** Type guard: is this a plan (not a validation failure)? */
export function isPlan(result: GridOperationPlan | ValidationResult): result is GridOperationPlan {
  return 'primitives' in result;
}

/**
 * Execute a grid operation plan: validate primitives, execute them, apply backlog effects.
 *
 * For assign operations, includes TOCTOU re-validation and lock release.
 */
export function executePlan(
  plan: GridOperationPlan,
  stores: OperationStoreContext
): DragOperationResult {
  const { grid, backlog } = stores;
  const isAssign = plan.resultMeta.operationType === 'assign';

  try {
    // TOCTOU re-validation for assign: check item hasn't been claimed between plan and execute
    if (isAssign) {
      const assignEffect = plan.backlogEffects.find(e => e.markUsed);
      if (assignEffect) {
        if (backlog.isItemUsed(assignEffect.itemId)) {
          assignmentLocks.releaseLock(assignEffect.itemId);
          dndLogger.warn('TOCTOU: item marked used between validate and execute', {
            itemId: assignEffect.itemId,
          });
          return {
            success: false,
            operationType: 'assign',
            action: 'reject',
            errorCode: 'SOURCE_ALREADY_USED',
            errorMessage: 'Item was assigned by another operation between validation and execution',
          };
        }

        // Belt-and-suspenders: check item isn't already in grid
        const duplicatePosition = grid.gridItems.findIndex(
          (slot) => slot && slot.context.matched && slot.item?.id === assignEffect.itemId
        );
        if (duplicatePosition !== -1) {
          assignmentLocks.releaseLock(assignEffect.itemId);
          dndLogger.warn('TOCTOU: item already in grid at another position', {
            itemId: assignEffect.itemId,
            existingPosition: duplicatePosition,
          });
          return {
            success: false,
            operationType: 'assign',
            action: 'reject',
            errorCode: 'SOURCE_ALREADY_USED',
            errorMessage: `Item already placed at grid position ${duplicatePosition}`,
          };
        }
      }
    }

    // Validate primitive sequence against current grid state
    const state: GridState = { gridItems: grid.gridItems, maxGridSize: grid.maxGridSize };
    const validation = validateSequence(plan.primitives, state);
    if (!validation.isValid) {
      if (isAssign) {
        const assignEffect = plan.backlogEffects.find(e => e.markUsed);
        if (assignEffect) assignmentLocks.releaseLock(assignEffect.itemId);
      }
      return {
        success: false,
        operationType: plan.resultMeta.operationType,
        action: 'reject',
        errorCode: validation.errorCode,
        errorMessage: validation.errorMessage,
      };
    }

    // Execute all primitives
    executeSequence(plan.primitives, grid);

    // Apply backlog side-effects
    for (const effect of plan.backlogEffects) {
      backlog.markItemAsUsed(effect.itemId, effect.markUsed);
    }

    // Release lock after successful assign
    if (isAssign) {
      const assignEffect = plan.backlogEffects.find(e => e.markUsed);
      if (assignEffect) assignmentLocks.releaseLock(assignEffect.itemId);
    }

    dndLogger.info(`Successfully executed ${plan.resultMeta.operationType} operation`);

    return {
      success: true,
      operationType: plan.resultMeta.operationType,
      action: plan.resultMeta.action as DragOperationResult['action'],
      item: plan.resultMeta.item,
      metadata: plan.resultMeta.metadata,
    };
  } catch (error) {
    if (isAssign) {
      const assignEffect = plan.backlogEffects.find(e => e.markUsed);
      if (assignEffect) assignmentLocks.releaseLock(assignEffect.itemId);
    }
    dndLogger.error(`${plan.resultMeta.operationType} operation failed`, error);
    return {
      success: false,
      operationType: plan.resultMeta.operationType,
      action: 'reject',
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Undo Support
// ============================================================================

/**
 * Create a DragOperation-compatible wrapper for undo/redo support.
 *
 * The returned object implements the DragOperation interface so it can be
 * pushed onto the undo stack. Rollback executes the reverse primitive sequence.
 */
export function createUndoableOperation(
  plan: GridOperationPlan,
  _context: DragContext
): DragOperation {
  const operationType = plan.resultMeta.operationType;

  return {
    type: operationType,

    validate(_ctx: DragContext, stores: OperationStoreContext): ValidationResult {
      const state: GridState = { gridItems: stores.grid.gridItems, maxGridSize: stores.grid.maxGridSize };
      return validateSequence(plan.primitives, state);
    },

    execute(ctx: DragContext, stores: OperationStoreContext): DragOperationResult {
      return executePlan(plan, stores);
    },

    rollback(_ctx: DragContext, result: DragOperationResult, stores: OperationStoreContext): void {
      const { grid, backlog } = stores;

      switch (operationType) {
        case 'assign': {
          // Reverse assign: remove placed item, mark unused
          if (result.metadata?.toPosition !== undefined) {
            grid.removeItemFromGrid(result.metadata.toPosition);
          }
          if (plan.backlogEffects.length > 0) {
            const assignEffect = plan.backlogEffects.find(e => e.markUsed);
            if (assignEffect) backlog.markItemAsUsed(assignEffect.itemId, false);
          }
          // If there was a displaced item, we can't restore it without more info
          // (the displaced item's full data would be needed to re-place it)
          dndLogger.debug('Rolled back assign operation');
          break;
        }

        case 'move':
        case 'swap': {
          // Reverse move/swap: swap back
          if (
            result.metadata?.fromPosition !== undefined &&
            result.metadata?.toPosition !== undefined
          ) {
            grid.moveGridItem(result.metadata.toPosition, result.metadata.fromPosition);
          }
          dndLogger.debug(`Rolled back ${operationType} operation`);
          break;
        }
      }
    },
  };
}
