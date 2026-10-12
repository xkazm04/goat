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
  /**
   * Gesture tag. Consecutive pushes carrying the SAME tag merge into the step
   * at the top of the stack; a different tag — or no tag — closes the open step.
   *
   * The tag names the GESTURE INSTANCE, not the operation type: "move:item-42",
   * never "move". A bare type merges dragging item A with dragging item B if the
   * user alternates quickly, and undo then reverts both at once.
   */
  tag?: string;
  /** Set once the step is sealed. A sealed step never merges again. */
  closed?: boolean;
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
  /**
   * Push a step that belongs to a named gesture. Merges into the top of the
   * stack when that step carries the same tag and is still open.
   *
   * A `description` may be supplied; otherwise it is derived as for `push`.
   */
  pushTagged: (
    command: Omit<UndoCommand, 'timestamp' | 'description' | 'closed'> & {
      tag: string;
      description?: string;
    },
  ) => void;
  /**
   * Seal the open step. Called by the gesture's own terminal event, by
   * commit-grade actions, and by undo/redo themselves.
   */
  closeStep: () => void;
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

/**
 * A step open for longer than this is sealed as a BACKSTOP, not as policy.
 * Explicit tags are the policy; this only stops a single marathon gesture
 * swallowing the session. If it fires often, the tag design is wrong.
 */
const OPEN_STEP_CEILING_MS = 60_000;

function describeCommand(command: Omit<UndoCommand, 'timestamp' | 'description'>): string {
  const { result } = command;
  // A caller may name its own step — a slice command's description says what
  // the user did ("Clear grid"), which no operationType switch could derive.
  const supplied = (command as Partial<UndoCommand>).description;
  if (supplied) return supplied;
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

    // A STEP THAT REACHES THE STACK IS UNDOABLE BY CONSTRUCTION. Before this,
    // an operation with no `rollback` was pushed happily and `undo()` returned
    // false when it reached the top — so Ctrl+Z failed AFTER the press, which
    // is worse than a disabled control because the user has already committed
    // to the gesture. Tier operations were exactly this case.
    if (!command.operation.rollback) {
      dndLogger.warn('Undo stack: REFUSED a step with no rollback', {
        type: command.operation.type,
      });
      return;
    }

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

  /**
   * Coalesced push (undo-history/gesture-coalescing).
   *
   * MERGING IS ASYMMETRIC: the open step keeps the BEFORE of its first mutation
   * and takes the AFTER of the latest. Everything between is noise — undo
   * restores where the gesture started, redo restores where it ended — so the
   * merge REPLACES the step's forward half and touches nothing else. A step's
   * memory cost is therefore flat no matter how many events merged into it. An
   * implementation that appended instead has reimplemented the uncoalesced
   * stack with extra bookkeeping.
   *
   * MERGING IS ONLY LEGAL INTO THE CURRENT TOP OF STACK. "move:A", other edits,
   * then "move:A" again is two steps, not one; merging into anything else
   * rewrites settled history.
   */
  pushTagged: (command) => {
    if (get().isUndoRedoInProgress) return;
    if (!command.operation.rollback) {
      dndLogger.warn('Undo stack: REFUSED a tagged step with no rollback', {
        tag: command.tag,
      });
      return;
    }

    const now = Date.now();
    const state = get();
    const top = state.undoStack[state.undoStack.length - 1];

    const mergeable =
      top !== undefined &&
      top.tag === command.tag &&
      top.closed !== true &&
      now - top.timestamp < OPEN_STEP_CEILING_MS;

    if (mergeable) {
      set((s) => {
        const stack = s.undoStack.slice();
        const open = stack[stack.length - 1];
        stack[stack.length - 1] = {
          ...open,
          // Keep the FIRST before (open.operation carries it), take the LATEST
          // forward half. The description follows the latest too, so the step
          // names what it will redo.
          operation: {
            ...command.operation,
            rollback: open.operation.rollback,
          },
          context: open.context,
          result: command.result,
          description: command.description ?? open.description,
          timestamp: now,
        };
        return { undoStack: stack, redoStack: [] };
      });
      dndLogger.debug('Undo stack: merged into open step', { tag: command.tag });
      return;
    }

    // A different tag closes whatever was open, then starts a new step.
    get().closeStep();

    const fullCommand: UndoCommand = {
      ...command,
      timestamp: now,
      description: command.description ?? describeCommand(command),
    };

    set((s) => {
      const newStack = [...s.undoStack, fullCommand];
      if (newStack.length > s.maxDepth) {
        newStack.splice(0, newStack.length - s.maxDepth);
      }
      return { undoStack: newStack, redoStack: [] };
    });
    dndLogger.debug('Undo stack: opened step', { tag: command.tag });
  },

  /**
   * Seal the open step. Boundary events are the authoritative close: the
   * gesture's own terminal event, a commit-grade action, focus leaving the
   * edited object, and undo itself.
   */
  closeStep: () => {
    set((s) => {
      if (s.undoStack.length === 0) return s;
      const top = s.undoStack[s.undoStack.length - 1];
      if (top.closed || top.tag === undefined) return s;
      const stack = s.undoStack.slice();
      stack[stack.length - 1] = { ...top, closed: true };
      return { undoStack: stack };
    });
  },

  undo: (getStores) => {
    // UNDO ITSELF IS A BOUNDARY EVENT. Invoking undo closes any open step
    // first, then reverts a whole step — it never reverts the PREVIOUS step
    // while the current one is still accumulating.
    get().closeStep();
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
    get().closeStep();
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
