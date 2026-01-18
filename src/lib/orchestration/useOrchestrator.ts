/**
 * React Hook for State Orchestrator
 *
 * Provides React components with access to the orchestrator
 * and reactive updates to undo/redo state.
 */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  getOrchestrator,
  OrchestratorEvent,
  createLoggingMiddleware,
  createPersistenceMiddleware,
} from './GlobalOrchestrator';
import {
  assignItem,
  moveItem,
  swapItems,
  removeItem,
  removeItemById,
  clearGrid,
  initializeSession,
  resetSession,
  saveSession,
  openComparison,
  closeComparison,
  clearComparison,
  setKeyboardMode,
  quickAssign,
  showResultModal,
  hideResultModal,
} from './commands';
import { BacklogItem } from '@/types/backlog-groups';
import { UndoEntry } from './types';

// =============================================================================
// Hook: useOrchestrator
// =============================================================================

export interface UseOrchestratorReturn {
  // Grid operations
  assign: (item: BacklogItem, position: number) => Promise<boolean>;
  move: (fromPosition: number, toPosition: number) => Promise<boolean>;
  swap: (positionA: number, positionB: number) => Promise<boolean>;
  remove: (position: number) => Promise<boolean>;
  removeById: (itemId: string) => Promise<boolean>;
  clear: () => Promise<boolean>;

  // Session operations
  initSession: (listId: string, listSize: number, category?: string) => Promise<boolean>;
  resetSession: () => Promise<boolean>;
  saveSession: () => Promise<boolean>;

  // Comparison operations
  openComparison: () => Promise<boolean>;
  closeComparison: () => Promise<boolean>;
  clearComparison: () => Promise<boolean>;

  // Match UI operations
  setKeyboardMode: (enabled: boolean) => Promise<boolean>;
  quickAssign: (position: number) => Promise<boolean>;
  showResult: () => Promise<boolean>;
  hideResult: () => Promise<boolean>;

  // Undo/Redo
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  canUndo: boolean;
  canRedo: boolean;
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];

  // Transaction batching
  batch: <T>(fn: () => Promise<T>) => Promise<T>;

  // Debug
  isExecuting: boolean;
}

/**
 * Hook for accessing the orchestrator with reactive undo/redo state.
 */
export function useOrchestrator(): UseOrchestratorReturn {
  const orchestrator = useMemo(() => getOrchestrator(), []);

  // Reactive undo/redo state
  const [undoState, setUndoState] = useState({
    canUndo: orchestrator.canUndo(),
    canRedo: orchestrator.canRedo(),
    undoStack: orchestrator.getUndoStack(),
    redoStack: orchestrator.getRedoStack(),
  });

  const [isExecuting, setIsExecuting] = useState(false);

  // Subscribe to orchestrator events
  useEffect(() => {
    const unsubscribe = orchestrator.subscribe((event: OrchestratorEvent) => {
      if (
        event.type === 'undo:push' ||
        event.type === 'undo:undo' ||
        event.type === 'undo:redo'
      ) {
        setUndoState({
          canUndo: orchestrator.canUndo(),
          canRedo: orchestrator.canRedo(),
          undoStack: orchestrator.getUndoStack(),
          redoStack: orchestrator.getRedoStack(),
        });
      }
    });

    return unsubscribe;
  }, [orchestrator]);

  // Grid operations
  const assign = useCallback(
    async (item: BacklogItem, position: number): Promise<boolean> => {
      setIsExecuting(true);
      try {
        const result = await orchestrator.execute(assignItem(item, position, 'hook'));
        return result.success;
      } finally {
        setIsExecuting(false);
      }
    },
    [orchestrator]
  );

  const move = useCallback(
    async (fromPosition: number, toPosition: number): Promise<boolean> => {
      setIsExecuting(true);
      try {
        const result = await orchestrator.execute(moveItem(fromPosition, toPosition, 'hook'));
        return result.success;
      } finally {
        setIsExecuting(false);
      }
    },
    [orchestrator]
  );

  const swap = useCallback(
    async (positionA: number, positionB: number): Promise<boolean> => {
      setIsExecuting(true);
      try {
        const result = await orchestrator.execute(swapItems(positionA, positionB, 'hook'));
        return result.success;
      } finally {
        setIsExecuting(false);
      }
    },
    [orchestrator]
  );

  const remove = useCallback(
    async (position: number): Promise<boolean> => {
      setIsExecuting(true);
      try {
        const result = await orchestrator.execute(removeItem(position, 'hook'));
        return result.success;
      } finally {
        setIsExecuting(false);
      }
    },
    [orchestrator]
  );

  const removeByIdFn = useCallback(
    async (itemId: string): Promise<boolean> => {
      setIsExecuting(true);
      try {
        const result = await orchestrator.execute(removeItemById(itemId, 'hook'));
        return result.success;
      } finally {
        setIsExecuting(false);
      }
    },
    [orchestrator]
  );

  const clear = useCallback(async (): Promise<boolean> => {
    setIsExecuting(true);
    try {
      const result = await orchestrator.execute(clearGrid('hook'));
      return result.success;
    } finally {
      setIsExecuting(false);
    }
  }, [orchestrator]);

  // Session operations
  const initSession = useCallback(
    async (listId: string, listSize: number, category?: string): Promise<boolean> => {
      setIsExecuting(true);
      try {
        const result = await orchestrator.execute(
          initializeSession(listId, listSize, category, 'hook')
        );
        return result.success;
      } finally {
        setIsExecuting(false);
      }
    },
    [orchestrator]
  );

  const resetSessionFn = useCallback(async (): Promise<boolean> => {
    setIsExecuting(true);
    try {
      const result = await orchestrator.execute(resetSession('hook'));
      return result.success;
    } finally {
      setIsExecuting(false);
    }
  }, [orchestrator]);

  const saveSessionFn = useCallback(async (): Promise<boolean> => {
    setIsExecuting(true);
    try {
      const result = await orchestrator.execute(saveSession(undefined, 'hook'));
      return result.success;
    } finally {
      setIsExecuting(false);
    }
  }, [orchestrator]);

  // Comparison operations
  const openComparisonFn = useCallback(async (): Promise<boolean> => {
    setIsExecuting(true);
    try {
      const result = await orchestrator.execute(openComparison('hook'));
      return result.success;
    } finally {
      setIsExecuting(false);
    }
  }, [orchestrator]);

  const closeComparisonFn = useCallback(async (): Promise<boolean> => {
    setIsExecuting(true);
    try {
      const result = await orchestrator.execute(closeComparison('hook'));
      return result.success;
    } finally {
      setIsExecuting(false);
    }
  }, [orchestrator]);

  const clearComparisonFn = useCallback(async (): Promise<boolean> => {
    setIsExecuting(true);
    try {
      const result = await orchestrator.execute(clearComparison('hook'));
      return result.success;
    } finally {
      setIsExecuting(false);
    }
  }, [orchestrator]);

  // Match UI operations
  const setKeyboardModeFn = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      setIsExecuting(true);
      try {
        const result = await orchestrator.execute(setKeyboardMode(enabled, 'hook'));
        return result.success;
      } finally {
        setIsExecuting(false);
      }
    },
    [orchestrator]
  );

  const quickAssignFn = useCallback(
    async (position: number): Promise<boolean> => {
      setIsExecuting(true);
      try {
        const result = await orchestrator.execute(quickAssign(position, 'hook'));
        return result.success;
      } finally {
        setIsExecuting(false);
      }
    },
    [orchestrator]
  );

  const showResultFn = useCallback(async (): Promise<boolean> => {
    setIsExecuting(true);
    try {
      const result = await orchestrator.execute(showResultModal('hook'));
      return result.success;
    } finally {
      setIsExecuting(false);
    }
  }, [orchestrator]);

  const hideResultFn = useCallback(async (): Promise<boolean> => {
    setIsExecuting(true);
    try {
      const result = await orchestrator.execute(hideResultModal('hook'));
      return result.success;
    } finally {
      setIsExecuting(false);
    }
  }, [orchestrator]);

  // Undo/Redo
  const undoFn = useCallback(async (): Promise<boolean> => {
    setIsExecuting(true);
    try {
      const result = await orchestrator.undo();
      return result.success;
    } finally {
      setIsExecuting(false);
    }
  }, [orchestrator]);

  const redoFn = useCallback(async (): Promise<boolean> => {
    setIsExecuting(true);
    try {
      const result = await orchestrator.redo();
      return result.success;
    } finally {
      setIsExecuting(false);
    }
  }, [orchestrator]);

  // Transaction batching
  const batch = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      setIsExecuting(true);
      try {
        return await fn();
      } finally {
        setIsExecuting(false);
      }
    },
    []
  );

  return {
    // Grid
    assign,
    move,
    swap,
    remove,
    removeById: removeByIdFn,
    clear,

    // Session
    initSession,
    resetSession: resetSessionFn,
    saveSession: saveSessionFn,

    // Comparison
    openComparison: openComparisonFn,
    closeComparison: closeComparisonFn,
    clearComparison: clearComparisonFn,

    // Match UI
    setKeyboardMode: setKeyboardModeFn,
    quickAssign: quickAssignFn,
    showResult: showResultFn,
    hideResult: hideResultFn,

    // Undo/Redo
    undo: undoFn,
    redo: redoFn,
    canUndo: undoState.canUndo,
    canRedo: undoState.canRedo,
    undoStack: undoState.undoStack,
    redoStack: undoState.redoStack,

    // Transaction
    batch,

    // Debug
    isExecuting,
  };
}

// =============================================================================
// Hook: useUndoRedo (lightweight)
// =============================================================================

/**
 * Lightweight hook for just undo/redo state and actions.
 */
export function useUndoRedo(): {
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  canUndo: boolean;
  canRedo: boolean;
} {
  const orchestrator = useMemo(() => getOrchestrator(), []);

  const [state, setState] = useState({
    canUndo: orchestrator.canUndo(),
    canRedo: orchestrator.canRedo(),
  });

  useEffect(() => {
    const unsubscribe = orchestrator.subscribe((event) => {
      if (
        event.type === 'undo:push' ||
        event.type === 'undo:undo' ||
        event.type === 'undo:redo'
      ) {
        setState({
          canUndo: orchestrator.canUndo(),
          canRedo: orchestrator.canRedo(),
        });
      }
    });

    return unsubscribe;
  }, [orchestrator]);

  const undo = useCallback(async () => {
    const result = await orchestrator.undo();
    return result.success;
  }, [orchestrator]);

  const redo = useCallback(async () => {
    const result = await orchestrator.redo();
    return result.success;
  }, [orchestrator]);

  return {
    undo,
    redo,
    canUndo: state.canUndo,
    canRedo: state.canRedo,
  };
}

// =============================================================================
// Hook: useOrchestratorDebug
// =============================================================================

/**
 * Debug hook for development tools.
 */
export function useOrchestratorDebug() {
  const orchestrator = useMemo(() => getOrchestrator(), []);

  const [debugInfo, setDebugInfo] = useState(orchestrator.getDebugInfo());

  useEffect(() => {
    const interval = setInterval(() => {
      setDebugInfo(orchestrator.getDebugInfo());
    }, 1000);

    return () => clearInterval(interval);
  }, [orchestrator]);

  return {
    ...debugInfo,
    transactionHistory: orchestrator.getTransactionHistory(),
    config: orchestrator.getConfig(),
    clearHistory: () => orchestrator.clearHistory(),
    enableLogging: () => orchestrator.use(createLoggingMiddleware()),
    enablePersistence: () => orchestrator.use(createPersistenceMiddleware()),
  };
}

// =============================================================================
// Keyboard Shortcut Hook
// =============================================================================

/**
 * Hook that sets up keyboard shortcuts for undo/redo.
 */
export function useUndoRedoKeyboardShortcuts() {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
        }
      }
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y = Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);
}
