/**
 * useOrchestrator Hook
 *
 * React hook that provides access to the MatchSessionOrchestrator
 * with proper store bindings and memoization.
 */

import { useMemo, useCallback } from 'react';
import { useGridStore } from '@/stores/grid-store';
import { useSessionStore } from '@/stores/session-store';
import { useBacklogStore } from '@/stores/backlog-store';
import { useValidationNotificationStore } from '@/stores/validation-notification-store';
import { BacklogItem } from '@/types/backlog-groups';
import {
  MatchSessionOrchestrator,
  OrchestratorStores,
  OrchestratorResult,
  AssignOptions,
  MoveOptions,
  SwapOptions,
  RemoveOptions,
} from './orchestrator';

// ============================================================================
// Types
// ============================================================================

/**
 * Return type of the useOrchestrator hook
 */
export interface UseOrchestratorReturn {
  // Commands
  assign: (item: BacklogItem, position: number, skipValidation?: boolean) => OrchestratorResult;
  move: (fromPosition: number, toPosition: number) => OrchestratorResult;
  swap: (positionA: number, positionB: number) => OrchestratorResult;
  remove: (position: number) => OrchestratorResult;
  clear: () => OrchestratorResult;

  // Utilities
  isPositionAvailable: (position: number) => boolean;
  getNextAvailablePosition: () => number | null;
  getGridState: () => {
    gridItems: import('@/types/match').GridItemType[];
    filledCount: number;
    totalSize: number;
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * useOrchestrator
 *
 * Provides access to the MatchSessionOrchestrator with proper store bindings.
 * The orchestrator is created once and memoized for the component lifetime.
 *
 * @example
 * ```tsx
 * const { assign, move, remove, isPositionAvailable } = useOrchestrator();
 *
 * // Assign a backlog item to position 0
 * const result = assign(backlogItem, 0);
 * if (!result.success) {
 *   console.error('Failed to assign:', result.error);
 * }
 *
 * // Move item from position 0 to position 5
 * move(0, 5);
 *
 * // Remove item at position 3
 * remove(3);
 * ```
 */
export function useOrchestrator(): UseOrchestratorReturn {
  // Get store references
  // Note: We use direct Zustand selectors instead of getState() to ensure
  // we have fresh references when the hook is called
  const gridStore = useGridStore;
  const sessionStore = useSessionStore;
  const backlogStore = useBacklogStore;
  const notificationStore = useValidationNotificationStore;

  // Create orchestrator instance with store bindings
  const orchestrator = useMemo(() => {
    const stores: OrchestratorStores = {
      gridStore: {
        getState: () => gridStore.getState(),
        assignItemToGrid: (item, position) => gridStore.getState().assignItemToGrid(item, position),
        removeItemFromGrid: (position) => gridStore.getState().removeItemFromGrid(position),
        moveGridItem: (from, to) => gridStore.getState().moveGridItem(from, to),
        clearGrid: () => gridStore.getState().clearGrid(),
      },
      sessionStore: {
        getState: () => sessionStore.getState(),
        updateSessionGridItems: (items) => sessionStore.getState().updateSessionGridItems(items),
      },
      backlogStore: {
        getState: () => backlogStore.getState(),
        getItemById: (id) => backlogStore.getState().getItemById(id),
        isItemUsed: (id) => backlogStore.getState().isItemUsed(id),
        markItemAsUsed: (id, used) => backlogStore.getState().markItemAsUsed(id, used),
      },
      notificationStore: {
        emitValidationError: (errorCode) => notificationStore.getState().emitValidationError(errorCode),
      },
    };

    return new MatchSessionOrchestrator(stores);
  }, [gridStore, sessionStore, backlogStore, notificationStore]);

  // Memoized command wrappers
  const assign = useCallback(
    (item: BacklogItem, position: number, skipValidation = false): OrchestratorResult => {
      return orchestrator.assign({ item, position, skipValidation });
    },
    [orchestrator]
  );

  const move = useCallback(
    (fromPosition: number, toPosition: number): OrchestratorResult => {
      return orchestrator.move({ fromPosition, toPosition });
    },
    [orchestrator]
  );

  const swap = useCallback(
    (positionA: number, positionB: number): OrchestratorResult => {
      return orchestrator.swap({ positionA, positionB });
    },
    [orchestrator]
  );

  const remove = useCallback(
    (position: number): OrchestratorResult => {
      return orchestrator.remove({ position });
    },
    [orchestrator]
  );

  const clear = useCallback((): OrchestratorResult => {
    return orchestrator.clear();
  }, [orchestrator]);

  // Memoized utility wrappers
  const isPositionAvailable = useCallback(
    (position: number): boolean => {
      return orchestrator.isPositionAvailable(position);
    },
    [orchestrator]
  );

  const getNextAvailablePosition = useCallback((): number | null => {
    return orchestrator.getNextAvailablePosition();
  }, [orchestrator]);

  const getGridState = useCallback(() => {
    return orchestrator.getGridState();
  }, [orchestrator]);

  return {
    assign,
    move,
    swap,
    remove,
    clear,
    isPositionAvailable,
    getNextAvailablePosition,
    getGridState,
  };
}
