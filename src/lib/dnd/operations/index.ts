/**
 * DnD Operations Module
 *
 * Grid operations (assign, move, swap) are handled via algebraic primitives
 * (Place, Remove, Swap) — no class hierarchy. The DragOperationRouter
 * decomposes drag events into primitive sequences and executes them directly.
 *
 * Tier operations use registered class instances via the DragOperation interface.
 *
 * Usage:
 * ```typescript
 * import { createStandardRouter } from '@/lib/dnd/operations';
 *
 * const router = createStandardRouter({ debug: true });
 * const result = router.handleDragEnd(event, storeContext);
 * ```
 */

// Types
export type {
  DragOperationType,
  DragSource,
  DragTarget,
  DragContext,
  DragOperationResult,
  GridStoreContext,
  BacklogStoreContext,
  TierStoreContext,
  OperationStoreContext,
  DragOperation,
  RouterConfig,
  OperationResultHandler,
  ValidationErrorHandler,
} from './types';

// Router
export { DragOperationRouter } from './DragOperationRouter';

// Algebraic Primitives
export {
  type GridPrimitive,
  type PlacePrimitive,
  type RemovePrimitive,
  type SwapPrimitive,
  type GridState,
  validatePrimitive,
  validateSequence,
  executeSequence,
} from './primitives';

// Grid Operation Plans (decomposition layer)
export {
  type GridOperationPlan,
  type BacklogEffect,
  planAssign,
  planMove,
  planSwap,
  isPlan,
  executePlan,
  createUndoableOperation,
} from './grid-plans';

// Tier Operations (class-based, registered with router)
export {
  BaseTierOperation,
  TierAssignOperation,
  TierMoveOperation,
  TierTransferOperation,
  UnrankOperation,
  RankFromPoolOperation,
  TierToGridOperation,
  GridToTierOperation,
} from './tier';

// Validation Helpers (used by tier operations)
export {
  requireStore,
  requireGridSlotTarget,
  requireTierTarget,
  requirePositionInBounds,
  requireSourceGridPosition,
  validateAll,
} from './validation-helpers';

// ============================================================================
// Pre-configured Router Factory
// ============================================================================

import { DragOperationRouter } from './DragOperationRouter';
import {
  TierAssignOperation,
  TierMoveOperation,
  TierTransferOperation,
  UnrankOperation,
  RankFromPoolOperation,
  TierToGridOperation,
  GridToTierOperation,
} from './tier';

import type { RouterConfig } from './types';

/**
 * Create a pre-configured router with all operations available.
 *
 * Grid operations (assign, move, swap) are handled via algebraic primitives
 * built into the router. Tier operations are registered as class instances.
 */
export function createStandardRouter(config?: RouterConfig): DragOperationRouter {
  const router = new DragOperationRouter(config);

  // Register tier operations (grid ops are handled by primitives in the router)
  router.registerOperation(new TierAssignOperation());
  router.registerOperation(new TierMoveOperation());
  router.registerOperation(new TierTransferOperation());
  router.registerOperation(new UnrankOperation());
  router.registerOperation(new RankFromPoolOperation());
  router.registerOperation(new TierToGridOperation());
  router.registerOperation(new GridToTierOperation());

  return router;
}

/**
 * Create a router configured only for grid operations (no tier support).
 * Grid operations are built-in via algebraic primitives — no registration needed.
 */
export function createGridOnlyRouter(config?: RouterConfig): DragOperationRouter {
  return new DragOperationRouter(config);
}
