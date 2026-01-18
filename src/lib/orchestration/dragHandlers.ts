/**
 * Orchestrated Drag Handlers
 *
 * Drag-and-drop handlers that use the GlobalOrchestrator for atomic
 * multi-store operations. These handlers replace the direct store
 * manipulation in grid-store.handleDragEnd with command-based mutations.
 *
 * Benefits:
 * - Atomic transactions (all-or-nothing)
 * - Automatic undo support
 * - Centralized logging
 * - Consistent validation
 */

import { DragEndEvent, DragStartEvent, DragMoveEvent } from '@dnd-kit/core';
import { getOrchestrator } from './GlobalOrchestrator';
import { assignItem, moveItem, swapItems } from './commands';
import { isGridReceiverId, extractGridPosition } from '@/lib/dnd';
import { BacklogItem } from '@/types/backlog-groups';

// =============================================================================
// Types
// =============================================================================

export interface OrchestratedDragResult {
  success: boolean;
  action: 'assign' | 'move' | 'swap' | 'none' | 'error';
  error?: string;
  fromPosition?: number;
  toPosition?: number;
  itemId?: string;
}

export interface DragHandlerOptions {
  /** Source for command tracking */
  source?: string;
  /** Callback on successful drag */
  onSuccess?: (result: OrchestratedDragResult) => void;
  /** Callback on failed drag */
  onError?: (result: OrchestratedDragResult) => void;
  /** Custom item resolver for backlog items */
  getBacklogItem?: (id: string) => BacklogItem | null;
}

// =============================================================================
// Orchestrated Drag End Handler
// =============================================================================

/**
 * Handle drag end events using the GlobalOrchestrator.
 *
 * This handler replaces direct store manipulation with command-based
 * mutations, providing atomic transactions and undo support.
 *
 * @param event - DnD kit drag end event
 * @param options - Handler options
 * @returns Result of the drag operation
 *
 * @example
 * import { handleDragEndOrchestrated } from '@/lib/orchestration/dragHandlers';
 *
 * <DndContext onDragEnd={(e) => handleDragEndOrchestrated(e, {
 *   onSuccess: () => console.log('Drag succeeded'),
 *   onError: (r) => showError(r.error),
 * })}>
 */
export async function handleDragEndOrchestrated(
  event: DragEndEvent,
  options: DragHandlerOptions = {}
): Promise<OrchestratedDragResult> {
  const { active, over } = event;
  const { source = 'drag', onSuccess, onError, getBacklogItem } = options;

  // No drop target
  if (!active || !over) {
    return { success: false, action: 'none' };
  }

  const activeId = String(active.id);
  const overId = String(over.id);

  // Same position - no-op
  if (activeId === overId) {
    return { success: true, action: 'none' };
  }

  const orchestrator = getOrchestrator();
  const isActiveFromGrid = isGridReceiverId(activeId);
  const isTargetGrid = isGridReceiverId(overId);

  // ===========================================================================
  // Grid to Grid: Move or Swap
  // ===========================================================================
  if (isActiveFromGrid && isTargetGrid) {
    const fromPosition = extractGridPosition(activeId);
    const toPosition = extractGridPosition(overId);

    if (fromPosition === null || toPosition === null) {
      const result: OrchestratedDragResult = {
        success: false,
        action: 'error',
        error: 'Invalid grid positions',
      };
      onError?.(result);
      return result;
    }

    // Execute move (handles swap internally if target is occupied)
    const execResult = await orchestrator.execute(
      moveItem(fromPosition, toPosition, source)
    );

    const result: OrchestratedDragResult = {
      success: execResult.success,
      action: execResult.success ? 'move' : 'error',
      error: execResult.error,
      fromPosition,
      toPosition,
    };

    if (execResult.success) {
      onSuccess?.(result);
    } else {
      onError?.(result);
    }

    return result;
  }

  // ===========================================================================
  // Backlog to Grid: Assign
  // ===========================================================================
  if (!isActiveFromGrid && isTargetGrid) {
    const toPosition = extractGridPosition(overId);

    if (toPosition === null) {
      const result: OrchestratedDragResult = {
        success: false,
        action: 'error',
        error: 'Invalid target position',
      };
      onError?.(result);
      return result;
    }

    // Get the backlog item
    let item: BacklogItem | null = null;

    if (getBacklogItem) {
      item = getBacklogItem(activeId);
    } else {
      // Fallback: try to get from backlog store
      try {
        const { useBacklogStore } = require('@/stores/backlog-store');
        item = useBacklogStore.getState().getItemById(activeId);
      } catch (e) {
        console.error('Failed to get backlog item:', e);
      }
    }

    if (!item) {
      const result: OrchestratedDragResult = {
        success: false,
        action: 'error',
        error: 'Backlog item not found',
        itemId: activeId,
      };
      onError?.(result);
      return result;
    }

    // Execute assign
    const execResult = await orchestrator.execute(
      assignItem(item, toPosition, source)
    );

    const result: OrchestratedDragResult = {
      success: execResult.success,
      action: execResult.success ? 'assign' : 'error',
      error: execResult.error,
      toPosition,
      itemId: item.id,
    };

    if (execResult.success) {
      onSuccess?.(result);
    } else {
      onError?.(result);
    }

    return result;
  }

  // ===========================================================================
  // Unsupported drag (e.g., grid to backlog - removal)
  // ===========================================================================
  return {
    success: false,
    action: 'none',
    error: 'Unsupported drag operation',
  };
}

// =============================================================================
// Drag State Tracking
// =============================================================================

interface DragState {
  isDragging: boolean;
  activeId: string | null;
  activeItem: BacklogItem | null;
  startPosition: number | null;
  startTime: number | null;
}

let dragState: DragState = {
  isDragging: false,
  activeId: null,
  activeItem: null,
  startPosition: null,
  startTime: null,
};

/**
 * Handle drag start - track active item for overlay.
 */
export function handleDragStartOrchestrated(
  event: DragStartEvent,
  options: { getBacklogItem?: (id: string) => BacklogItem | null } = {}
): void {
  const { active } = event;
  const activeId = String(active.id);

  dragState = {
    isDragging: true,
    activeId,
    activeItem: null,
    startPosition: isGridReceiverId(activeId) ? extractGridPosition(activeId) : null,
    startTime: Date.now(),
  };

  // Try to get the backlog item for overlay
  if (!isGridReceiverId(activeId)) {
    if (options.getBacklogItem) {
      dragState.activeItem = options.getBacklogItem(activeId);
    } else {
      try {
        const { useBacklogStore } = require('@/stores/backlog-store');
        dragState.activeItem = useBacklogStore.getState().getItemById(activeId);
      } catch (e) {
        // Ignore - overlay will work without item
      }
    }
  }
}

/**
 * Handle drag cancel - reset state.
 */
export function handleDragCancelOrchestrated(): void {
  dragState = {
    isDragging: false,
    activeId: null,
    activeItem: null,
    startPosition: null,
    startTime: null,
  };
}

/**
 * Get current drag state for UI rendering.
 */
export function getDragState(): Readonly<DragState> {
  return { ...dragState };
}

// =============================================================================
// Batch Drag Operations
// =============================================================================

/**
 * Assign multiple items in a single transaction.
 * All items are assigned atomically - if one fails, all are rolled back.
 *
 * @example
 * const items = [item1, item2, item3];
 * const positions = [0, 1, 2];
 * await batchAssign(items, positions, 'keyboard-batch');
 */
export async function batchAssign(
  items: BacklogItem[],
  positions: number[],
  source = 'batch'
): Promise<OrchestratedDragResult> {
  if (items.length !== positions.length) {
    return {
      success: false,
      action: 'error',
      error: 'Items and positions array length mismatch',
    };
  }

  const orchestrator = getOrchestrator();
  const commands = items.map((item, i) => assignItem(item, positions[i], source));

  const result = await orchestrator.transaction(commands, `Batch assign ${items.length} items`);

  return {
    success: result.success,
    action: result.success ? 'assign' : 'error',
    error: result.error,
  };
}

/**
 * Swap multiple pairs of positions in a single transaction.
 *
 * @example
 * // Swap positions 0<->3 and 1<->4
 * await batchSwap([[0, 3], [1, 4]], 'auto-arrange');
 */
export async function batchSwap(
  pairs: [number, number][],
  source = 'batch'
): Promise<OrchestratedDragResult> {
  const orchestrator = getOrchestrator();
  const commands = pairs.map(([a, b]) => swapItems(a, b, source));

  const result = await orchestrator.transaction(commands, `Batch swap ${pairs.length} pairs`);

  return {
    success: result.success,
    action: result.success ? 'swap' : 'error',
    error: result.error,
  };
}
