/**
 * Undo Store - Command Stack for Ranking Operations
 *
 * OWNERSHIP CONTRACT:
 *   Owns: undo/redo command stack, operation history
 *   Persists: None (ephemeral - stack resets on page reload)
 *   Sync: Reads DragOperation results; calls operation.rollback() / operation.execute() on undo/redo
 *
 * Provides Ctrl+Z undo and Ctrl+Shift+Z redo across all drag-and-drop ranking operations.
 * The stack wraps every successful DragOperation.execute() result, pushing
 * {context, result, operation} onto an undo stack. Undo pops and calls rollback();
 * redo re-executes the operation.
 */

import { create } from 'zustand';

import { dndLogger } from '@/lib/logger';

import type {
  DragOperation,
  DragContext,
  DragOperationResult,
  OperationStoreContext,
} from '@/lib/dnd/operations/types';

// ============================================================================
// Types
// ============================================================================

/** A recorded command that can be undone/redone */
export interface UndoCommand {
  /** The operation that was executed */
  operation: DragOperation;
  /** The drag context at time of execution */
  context: DragContext;
  /** The result from execute() */
  result: DragOperationResult;
  /** Timestamp for debugging */
  timestamp: number;
  /** Human-readable description */
  description: string;
}

interface UndoStoreState {
  /** Stack of operations that can be undone (most recent last) */
  undoStack: UndoCommand[];
  /** Stack of operations that were undone and can be redone */
  redoStack: UndoCommand[];
  /** Maximum stack depth */
  maxDepth: number;
  /** Whether an undo/redo is currently in progress (prevents re-entrant pushes) */
  isUndoRedoInProgress: boolean;

  // Actions
  /** Push a successfully executed operation onto the undo stack */
  push: (command: Omit<UndoCommand, 'timestamp' | 'description'>) => void;
  /** Undo the most recent operation */
  undo: (getStores: () => OperationStoreContext | null) => boolean;
  /** Redo the most recently undone operation */
  redo: (getStores: () => OperationStoreContext | null) => boolean;
  /** Clear both stacks (e.g., on session reset) */
  clear: () => void;
  /** Set max stack depth */
  setMaxDepth: (depth: number) => void;

  // Selectors
  canUndo: () => boolean;
  canRedo: () => boolean;
  undoDescription: () => string | null;
  redoDescription: () => string | null;
}

// ============================================================================
// Helpers
// ============================================================================

function describeCommand(command: Omit<UndoCommand, 'timestamp' | 'description'>): string {
  const { result } = command;
  const itemName = result.item?.title || 'item';
  const pos = result.metadata?.toPosition;

  switch (result.operationType) {
    case 'assign':
      return `Assign "${itemName}" to position ${pos !== undefined ? pos + 1 : '?'}`;
    case 'move':
      return `Move "${itemName}" from ${(result.metadata?.fromPosition ?? 0) + 1} to ${(pos ?? 0) + 1}`;
    case 'swap':
      return `Swap "${itemName}" at ${(result.metadata?.fromPosition ?? 0) + 1} with ${(pos ?? 0) + 1}`;
    default:
      return `${result.operationType} "${itemName}"`;
  }
}

// ============================================================================
// Store
// ============================================================================

export const useUndoStore = create<UndoStoreState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  maxDepth: 50,
  isUndoRedoInProgress: false,

  push: (command) => {
    // Don't record operations triggered by undo/redo themselves
    if (get().isUndoRedoInProgress) return;

    const fullCommand: UndoCommand = {
      ...command,
      timestamp: Date.now(),
      description: describeCommand(command),
    };

    set((state) => {
      const newStack = [...state.undoStack, fullCommand];
      // Trim to max depth
      if (newStack.length > state.maxDepth) {
        newStack.splice(0, newStack.length - state.maxDepth);
      }
      return {
        undoStack: newStack,
        // Clear redo stack on new action (standard undo/redo behavior)
        redoStack: [],
      };
    });

    dndLogger.debug('Undo stack: pushed', { description: fullCommand.description });
  },

  undo: (getStores) => {
    const state = get();
    if (state.undoStack.length === 0) return false;

    const stores = getStores();
    if (!stores) {
      dndLogger.warn('Undo: store context unavailable');
      return false;
    }

    const command = state.undoStack[state.undoStack.length - 1];

    if (!command.operation.rollback) {
      dndLogger.warn('Undo: operation has no rollback method', {
        type: command.operation.type,
      });
      return false;
    }

    set({ isUndoRedoInProgress: true });

    try {
      command.operation.rollback(command.context, command.result, stores);

      set((s) => ({
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack, command],
      }));

      dndLogger.info('Undo: rolled back', { description: command.description });
      return true;
    } catch (error) {
      dndLogger.error('Undo: rollback failed', error);
      return false;
    } finally {
      set({ isUndoRedoInProgress: false });
    }
  },

  redo: (getStores) => {
    const state = get();
    if (state.redoStack.length === 0) return false;

    const stores = getStores();
    if (!stores) {
      dndLogger.warn('Redo: store context unavailable');
      return false;
    }

    const command = state.redoStack[state.redoStack.length - 1];

    set({ isUndoRedoInProgress: true });

    try {
      const result = command.operation.execute(command.context, stores);

      if (result.success) {
        // Push back onto undo stack with the new result
        const updatedCommand: UndoCommand = {
          ...command,
          result,
          timestamp: Date.now(),
        };

        set((s) => ({
          redoStack: s.redoStack.slice(0, -1),
          undoStack: [...s.undoStack, updatedCommand],
        }));

        dndLogger.info('Redo: re-executed', { description: command.description });
        return true;
      } else {
        dndLogger.warn('Redo: re-execute failed', {
          description: command.description,
          errorCode: result.errorCode,
        });
        // Remove failed command from redo stack
        set((s) => ({
          redoStack: s.redoStack.slice(0, -1),
        }));
        return false;
      }
    } catch (error) {
      dndLogger.error('Redo: re-execute threw', error);
      return false;
    } finally {
      set({ isUndoRedoInProgress: false });
    }
  },

  clear: () => {
    set({ undoStack: [], redoStack: [] });
    dndLogger.debug('Undo stack: cleared');
  },

  setMaxDepth: (depth) => {
    set((state) => {
      const newStack = state.undoStack.length > depth
        ? state.undoStack.slice(state.undoStack.length - depth)
        : state.undoStack;
      return { maxDepth: depth, undoStack: newStack };
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  undoDescription: () => {
    const stack = get().undoStack;
    return stack.length > 0 ? stack[stack.length - 1].description : null;
  },

  redoDescription: () => {
    const stack = get().redoStack;
    return stack.length > 0 ? stack[stack.length - 1].description : null;
  },
}));
