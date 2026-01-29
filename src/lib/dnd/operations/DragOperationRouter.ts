/**
 * DragOperationRouter - Unified Router for All Drag Operations
 *
 * This router inspects drag events and routes them to the appropriate
 * operation handler. It provides a single entry point for all drag-and-drop
 * logic across the application.
 *
 * Usage:
 * ```typescript
 * const router = new DragOperationRouter();
 * router.registerOperation(new AssignOperation());
 * router.registerOperation(new MoveOperation());
 *
 * // In component
 * const handleDragEnd = (event: DragEndEvent) => {
 *   const result = router.handleDragEnd(event, storeContext);
 *   if (!result.success) {
 *     showError(result.errorCode);
 *   }
 * };
 * ```
 */

import type { DragEndEvent } from '@dnd-kit/core';
import type {
  DragOperation,
  DragOperationType,
  DragContext,
  DragSource,
  DragTarget,
  DragOperationResult,
  OperationStoreContext,
  RouterConfig,
  OperationResultHandler,
  ValidationErrorHandler,
} from './types';
import { isGridReceiverId, extractGridPosition } from '../transfer-protocol';
import { dndLogger } from '@/lib/logger';

// ============================================================================
// Context Parsing Utilities
// ============================================================================

/**
 * Parse the source information from a drag event's active element
 */
function parseSource(event: DragEndEvent): DragSource | null {
  const { active } = event;
  if (!active) return null;

  const activeId = String(active.id);
  const data = active.data.current;

  // Check if it's a grid item (by ID pattern)
  if (isGridReceiverId(activeId)) {
    const position = extractGridPosition(activeId);
    return {
      type: 'grid',
      itemId: data?.item?.backlogItemId || data?.item?.id || activeId,
      item: data?.item,
      gridPosition: position ?? undefined,
    };
  }

  // Check data type attribute for more specific identification
  const dataType = data?.type as string | undefined;

  if (dataType === 'collection-item' || dataType === 'backlog-item') {
    return {
      type: 'backlog',
      itemId: data?.item?.id || activeId,
      item: data?.item,
      collectionId: data?.collectionId || data?.groupId,
    };
  }

  if (dataType === 'grid-item') {
    const position = data?.position ?? data?.source?.gridPosition;
    return {
      type: 'grid',
      itemId: data?.item?.backlogItemId || data?.item?.id || activeId,
      item: data?.item,
      gridPosition: typeof position === 'number' ? position : undefined,
    };
  }

  if (dataType === 'tier-item') {
    return {
      type: data?.source?.from === 'unranked-pool' ? 'unranked-pool' : 'tier',
      itemId: data?.item?.id || activeId,
      item: data?.item,
      tierId: data?.source?.tierId,
      orderInTier: data?.source?.orderInTier,
    };
  }

  // Fallback: treat as backlog item (most common case for external drags)
  return {
    type: 'backlog',
    itemId: activeId,
    item: data?.item,
  };
}

/**
 * Parse the target information from a drag event's over element
 */
function parseTarget(event: DragEndEvent): DragTarget | null {
  const { over } = event;
  if (!over) return null;

  const overId = String(over.id);
  const data = over.data.current;
  const dataType = data?.type as string | undefined;

  // Grid slot detection
  if (dataType === 'grid-slot' || isGridReceiverId(overId)) {
    const position = data?.position ?? extractGridPosition(overId);
    return {
      type: 'grid-slot',
      position: position ?? undefined,
      isOccupied: data?.isOccupied ?? false,
      occupant: data?.occupant,
    };
  }

  // Tier row detection
  if (dataType === 'tier-row' || overId.startsWith('tier-')) {
    const tierId = data?.tierId || overId.replace('tier-', '');
    return {
      type: 'tier-row',
      tierId,
    };
  }

  // Tier item detection (for reordering)
  if (dataType === 'tier-item') {
    return {
      type: 'tier-item',
      tierId: data?.tierId,
      position: data?.position,
    };
  }

  // Unranked pool detection
  if (dataType === 'unranked-pool' || overId === 'unranked-pool') {
    return {
      type: 'unranked-pool',
    };
  }

  return { type: 'unknown' };
}

/**
 * Determine the operation type based on source and target
 */
function determineOperationType(source: DragSource, target: DragTarget): DragOperationType {
  // Unknown target - no operation
  if (target.type === 'unknown') {
    return 'noop';
  }

  // === Grid Target Operations ===
  if (target.type === 'grid-slot') {
    // From backlog/collection to grid
    if (source.type === 'backlog' || source.type === 'collection') {
      return 'assign';
    }

    // From grid to grid
    if (source.type === 'grid') {
      // Same position check
      if (source.gridPosition === target.position) {
        return 'noop';
      }
      // Occupied target = swap, empty = move
      return target.isOccupied ? 'swap' : 'move';
    }

    // From tier to grid
    if (source.type === 'tier' || source.type === 'unranked-pool') {
      return 'tier-to-grid';
    }
  }

  // === Tier Target Operations ===
  if (target.type === 'tier-row' || target.type === 'tier-item') {
    // From backlog/collection to tier
    if (source.type === 'backlog' || source.type === 'collection') {
      return 'tier-assign';
    }

    // From grid to tier
    if (source.type === 'grid') {
      return 'grid-to-tier';
    }

    // From tier to tier
    if (source.type === 'tier') {
      if (source.tierId === target.tierId) {
        return 'tier-move'; // Same tier reorder
      }
      return 'tier-transfer'; // Different tier
    }

    // From unranked to tier
    if (source.type === 'unranked-pool') {
      return 'rank-from-pool';
    }
  }

  // === Unranked Pool Target ===
  if (target.type === 'unranked-pool') {
    if (source.type === 'tier') {
      return 'unrank';
    }
  }

  return 'noop';
}

// ============================================================================
// DragOperationRouter Class
// ============================================================================

/**
 * Router that coordinates all drag-and-drop operations
 */
export class DragOperationRouter {
  private operations: Map<DragOperationType, DragOperation> = new Map();
  private config: RouterConfig;
  private onResult?: OperationResultHandler;
  private onValidationError?: ValidationErrorHandler;

  constructor(config: RouterConfig = {}) {
    this.config = {
      debug: false,
      ...config,
    };
  }

  /**
   * Register a drag operation handler
   */
  registerOperation(operation: DragOperation): void {
    this.operations.set(operation.type, operation);
    if (this.config.debug) {
      dndLogger.debug(`Registered operation: ${operation.type}`);
    }
  }

  /**
   * Unregister a drag operation handler
   */
  unregisterOperation(type: DragOperationType): void {
    this.operations.delete(type);
  }

  /**
   * Set the result handler callback
   */
  setResultHandler(handler: OperationResultHandler): void {
    this.onResult = handler;
  }

  /**
   * Set the validation error handler callback
   */
  setValidationErrorHandler(handler: ValidationErrorHandler): void {
    this.onValidationError = handler;
  }

  /**
   * Get registered operation types
   */
  getRegisteredOperations(): DragOperationType[] {
    return Array.from(this.operations.keys());
  }

  /**
   * Parse a drag event into a DragContext
   */
  parseContext(event: DragEndEvent): DragContext | null {
    const source = parseSource(event);
    const target = parseTarget(event);

    if (!source || !target) {
      if (this.config.debug) {
        dndLogger.debug('Failed to parse drag context', { source, target });
      }
      return null;
    }

    const operationType = determineOperationType(source, target);

    return {
      event,
      source,
      target,
      operationType,
    };
  }

  /**
   * Handle a drag end event
   *
   * This is the main entry point for processing drag operations.
   * It parses the event, determines the operation type, validates,
   * and executes the appropriate operation.
   */
  handleDragEnd(event: DragEndEvent, stores: OperationStoreContext): DragOperationResult {
    // Parse the drag context
    const context = this.parseContext(event);

    if (!context) {
      return {
        success: false,
        operationType: 'noop',
        action: 'reject',
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: 'Could not parse drag event',
      };
    }

    if (this.config.debug) {
      dndLogger.debug('Drag context parsed', {
        operationType: context.operationType,
        source: context.source,
        target: context.target,
      });
    }

    // Handle noop operations
    if (context.operationType === 'noop') {
      return {
        success: true,
        operationType: 'noop',
        action: 'reject',
      };
    }

    // Find the operation handler
    const operation = this.operations.get(context.operationType);

    if (!operation) {
      if (this.config.debug) {
        dndLogger.warn(`No handler registered for operation: ${context.operationType}`);
      }
      return {
        success: false,
        operationType: context.operationType,
        action: 'reject',
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: `No handler for operation type: ${context.operationType}`,
      };
    }

    // Validate the operation
    const validationResult = operation.validate(context, stores);

    if (!validationResult.isValid) {
      if (this.config.debug) {
        dndLogger.debug('Operation validation failed', {
          operationType: context.operationType,
          errorCode: validationResult.errorCode,
        });
      }

      // Notify error handler
      if (this.onValidationError && validationResult.errorCode) {
        this.onValidationError(validationResult.errorCode, context);
      }

      return {
        success: false,
        operationType: context.operationType,
        action: 'reject',
        errorCode: validationResult.errorCode,
        errorMessage: validationResult.errorMessage,
      };
    }

    // Execute the operation
    const result = operation.execute(context, stores);

    if (this.config.debug) {
      dndLogger.debug('Operation executed', {
        operationType: context.operationType,
        success: result.success,
        action: result.action,
      });
    }

    // Notify result handler
    if (this.onResult) {
      this.onResult(result, context);
    }

    return result;
  }

  /**
   * Check if the router can handle a particular operation type
   */
  canHandle(operationType: DragOperationType): boolean {
    return this.operations.has(operationType);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let routerInstance: DragOperationRouter | null = null;

/**
 * Get the global DragOperationRouter instance
 */
export function getDragOperationRouter(config?: RouterConfig): DragOperationRouter {
  if (!routerInstance) {
    routerInstance = new DragOperationRouter(config);
  }
  return routerInstance;
}

/**
 * Reset the global router instance (useful for testing)
 */
export function resetDragOperationRouter(): void {
  routerInstance = null;
}
