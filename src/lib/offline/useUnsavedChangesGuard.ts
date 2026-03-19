/**
 * useUnsavedChangesGuard - Beforeunload + visibilitychange sync guard
 *
 * Prevents data loss by:
 * 1. Warning users via beforeunload when they have pending changes
 * 2. Force-syncing on visibilitychange (tab focus) like Linear
 * 3. Flushing debounced saves on beforeunload
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { getSyncEngine } from './SyncEngine';
import { getNetworkMonitor } from './NetworkMonitor';
import { getSyncQueue } from './SyncQueue';
import { flushPendingSync } from './sessionStoreIntegration';
import { flushPendingSessionSave } from '@/stores/session-store';
import { flushPendingGridSync } from '@/stores/grid-store';

export interface UseUnsavedChangesGuardOptions {
  /** Enable beforeunload warning (default: true) */
  enableBeforeUnload?: boolean;
  /** Enable visibilitychange sync trigger (default: true) */
  enableVisibilitySync?: boolean;
  /** Minimum pending changes to trigger beforeunload (default: 1) */
  minPendingForWarning?: number;
}

export function useUnsavedChangesGuard(
  options: UseUnsavedChangesGuardOptions = {}
): void {
  const {
    enableBeforeUnload = true,
    enableVisibilitySync = true,
    minPendingForWarning = 1,
  } = options;

  const isSyncingOnFocusRef = useRef(false);

  const hasPendingOperations = useCallback((): boolean => {
    try {
      const engine = getSyncEngine();
      return engine.hasPendingChanges();
    } catch {
      return false;
    }
  }, []);

  // beforeunload handler - warns user about unsaved changes
  useEffect(() => {
    if (!enableBeforeUnload || typeof window === 'undefined') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Flush the grid store's microtask-debounced sync first so pending
      // grid items reach the session store before it saves.
      flushPendingGridSync();

      // Flush the Zustand session store's debounced save so the latest
      // grid/backlog state is persisted to localStorage before unload.
      flushPendingSessionSave();

      // Flush any debounced sync queue enqueue before the page unloads.
      // The IndexedDB write already happened immediately in saveSessionToOffline,
      // but the sync queue enqueue may still be pending.
      flushPendingSync();

      try {
        const engine = getSyncEngine();
        const state = engine.getState();

        if (state.pendingChanges >= minPendingForWarning) {
          // Standard beforeunload pattern
          e.preventDefault();
          // Chrome requires returnValue to be set
          e.returnValue = '';
        }
      } catch {
        // Engine not initialized - no pending changes to warn about
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enableBeforeUnload, minPendingForWarning]);

  // visibilitychange handler - force sync when tab regains focus
  useEffect(() => {
    if (!enableVisibilitySync || typeof document === 'undefined') return;

    const handleVisibilityChange = async () => {
      // When tab becomes hidden, flush any pending debounced saves
      // so the data is up-to-date if the tab is later closed
      if (document.visibilityState === 'hidden') {
        flushPendingGridSync();
        flushPendingSessionSave();
        flushPendingSync();
        return;
      }

      // Only sync when tab becomes visible (user returns to tab)
      if (document.visibilityState !== 'visible') return;
      if (isSyncingOnFocusRef.current) return;

      try {
        const networkMonitor = getNetworkMonitor();
        if (!networkMonitor.isOnline()) return;

        if (!hasPendingOperations()) return;

        isSyncingOnFocusRef.current = true;
        const engine = getSyncEngine();
        await engine.forceSync();
      } catch {
        // Engine not initialized yet - skip
      } finally {
        isSyncingOnFocusRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enableVisibilitySync, hasPendingOperations]);
}
