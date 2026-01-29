/**
 * DnD Operations Module
 *
 * Unified drag-and-drop operation system with router pattern.
 * This module consolidates all drag handling logic into reusable,
 * testable operation classes.
 *
 * Usage:
 * ```typescript
 * import {
 *   DragOperationRouter,
 *   getDragOperationRouter,
 *   AssignOperation,
 *   MoveOperation,
 *   SwapOperation,
 * } from '@/lib/dnd/operations';
 *
 * // Setup router with operations
 * const router = getDragOperationRouter({ debug: true });
 * router.registerOperation(new AssignOperation());
 * router.registerOperation(new MoveOperation());
 * router.registerOperation(new SwapOperation());
 *
 * // Handle drag end in component
 * const handleDragEnd = (event: DragEndEvent) => {
 *   const result = router.handleDragEnd(event, storeContext);
 *   if (!result.success) {
 *     showError(result.errorCode);
 *   }
 * };
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
export {
  DragOperationRouter,
  getDragOperationRouter,
  resetDragOperationRouter,
} from './DragOperationRouter';

// Core Grid Operations
export { AssignOperation } from './AssignOperation';
export { MoveOperation } from './MoveOperation';
export { SwapOperation } from './SwapOperation';

// Tier Operations
export {
  TierAssignOperation,
  TierMoveOperation,
  TierTransferOperation,
  UnrankOperation,
  RankFromPoolOperation,
  TierToGridOperation,
  GridToTierOperation,
} from './TierOperations';

// Result Handler
export {
  DragResultHandler,
  getDragResultHandler,
  resetDragResultHandler,
  createConsoleNotificationCallback,
  connectToNotificationStore,
  type DragNotification,
  type NotificationCallback,
  type ValidationErrorEmitter,
  type DragResultHandlerConfig,
} from './DragResultHandler';

// ============================================================================
// Pre-configured Router Factory
// ============================================================================

import { DragOperationRouter } from './DragOperationRouter';
import { AssignOperation } from './AssignOperation';
import { MoveOperation } from './MoveOperation';
import { SwapOperation } from './SwapOperation';
import {
  TierAssignOperation,
  TierMoveOperation,
  TierTransferOperation,
  UnrankOperation,
  RankFromPoolOperation,
  TierToGridOperation,
  GridToTierOperation,
} from './TierOperations';
import { DragResultHandler, type ValidationErrorEmitter } from './DragResultHandler';
import type { RouterConfig } from './types';

/**
 * Create a pre-configured router with all standard operations registered
 */
export function createStandardRouter(config?: RouterConfig): DragOperationRouter {
  const router = new DragOperationRouter(config);

  // Register grid operations
  router.registerOperation(new AssignOperation());
  router.registerOperation(new MoveOperation());
  router.registerOperation(new SwapOperation());

  // Register tier operations
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
 * Create a router configured only for grid operations (no tier support)
 */
export function createGridOnlyRouter(config?: RouterConfig): DragOperationRouter {
  const router = new DragOperationRouter(config);

  router.registerOperation(new AssignOperation());
  router.registerOperation(new MoveOperation());
  router.registerOperation(new SwapOperation());

  return router;
}

/**
 * Create a fully connected drag system with router and result handler
 */
export function createDragSystem(
  routerConfig?: RouterConfig,
  errorEmitter?: ValidationErrorEmitter
): {
  router: DragOperationRouter;
  resultHandler: DragResultHandler;
} {
  const router = createStandardRouter(routerConfig);
  const resultHandler = new DragResultHandler({
    showErrorNotifications: true,
    onValidationError: errorEmitter,
  });

  // Connect result handler to router
  router.setResultHandler((result, context) => {
    resultHandler.handle(result, context);
  });

  router.setValidationErrorHandler((errorCode, context) => {
    if (errorEmitter) {
      errorEmitter(errorCode);
    }
  });

  return { router, resultHandler };
}
