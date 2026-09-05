/**
 * useUndoKeyboard - Global keyboard handler for Ctrl+Z / Ctrl+Shift+Z
 *
 * Listens for undo/redo key combinations and dispatches to the undo store.
 * Must be provided a getStoreContext callback so the undo store can access
 * current grid/backlog state for rollback/re-execute.
 */

import { useEffect, useCallback } from 'react';

import { useShortcutScope } from '@/lib/keyboard';
import { useUndoStore } from '@/stores/undo-store';

import type { OperationStoreContext } from '@/lib/dnd/operations/types';

interface UseUndoKeyboardOptions {
  /** Callback to get current store context for undo/redo operations */
  getStoreContext: () => OperationStoreContext | null;
  /** Whether the keyboard listener is active (default: true) */
  enabled?: boolean;
}

/**
 * Hook that registers global Ctrl+Z (undo) and Ctrl+Shift+Z (redo) handlers.
 *
 * This is the BASE scope: it claims the keyboard on mount and yields it to any
 * overlay that claims one later (MatchupScreen's useMatchupKeyboard is the one
 * that does today). Before 2026-08-24 there was no arbitration and one Ctrl+Z
 * fired both handlers, because window listeners do not nest.
 *
 * Usage:
 * ```tsx
 * useUndoKeyboard({
 *   getStoreContext: () => gridStore.getStoreContext(),
 * });
 * ```
 */
export function useUndoKeyboard({ getStoreContext, enabled = true }: UseUndoKeyboardOptions) {
  const undo = useUndoStore((s) => s.undo);
  const redo = useUndoStore((s) => s.redo);
  const scope = useShortcutScope('grid-undo', enabled);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // An overlay above us owns the keyboard; do not also act on its keypress.
      if (!scope.isActive()) return;

      // Only handle Ctrl+Z / Cmd+Z variants
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd || e.key.toLowerCase() !== 'z') return;

      // Don't intercept when user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      e.preventDefault();

      if (e.shiftKey) {
        redo(getStoreContext);
      } else {
        undo(getStoreContext);
      }
    },
    [undo, redo, getStoreContext, scope]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}
