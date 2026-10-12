/**
 * useUnsavedChangesGuard - Beforeunload + visibilitychange sync guard
 *
 * Prevents data loss by:
 * 1. Warning users via beforeunload when they have pending changes
 * 2. Force-syncing on visibilitychange (tab regains focus)
 * 3. Flushing derived session sync on beforeunload/tab hidden
 */

'use client';

import { useEffect, useRef } from 'react';

import { flushDerivedSessionSync } from '@/stores/derived-session-sync';

import { getOfflinePersistence } from './OfflinePersistence';
import { flushPendingSync } from './sessionStoreIntegration';

export interface UseUnsavedChangesGuardOptions {
  enableBeforeUnload?: boolean;
  enableVisibilitySync?: boolean;
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
  const cachedPendingCountRef = useRef(0);

  // Track pending count synchronously via queue change listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const persistence = getOfflinePersistence();

      // Seed the cached count
      persistence.getPendingCount().then(count => {
        cachedPendingCountRef.current = count;
      });

      // Keep it updated on every queue change
      const unsubscribe = persistence.onQueueChange((count) => {
        cachedPendingCountRef.current = count;
      });

      return unsubscribe;
    } catch {
      // Not initialized yet — count stays 0
    }
  }, []);

  // beforeunload handler
  useEffect(() => {
    if (!enableBeforeUnload || typeof window === 'undefined') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Always flush synchronously to persist data
      flushDerivedSessionSync();
      flushPendingSync();

      // Only show the leave-page warning when there are enough pending changes
      if (cachedPendingCountRef.current >= minPendingForWarning) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enableBeforeUnload, minPendingForWarning]);

  // visibilitychange handler
  useEffect(() => {
    if (!enableVisibilitySync || typeof document === 'undefined') return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        flushDerivedSessionSync();
        flushPendingSync();
        return;
      }

      if (document.visibilityState !== 'visible') return;
      if (isSyncingOnFocusRef.current) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;

      try {
        const persistence = getOfflinePersistence();
        const count = await persistence.getPendingCount();
        if (count === 0) return;

        isSyncingOnFocusRef.current = true;
        await persistence.processQueue();
      } catch {
        // Not initialized yet — skip
      } finally {
        isSyncingOnFocusRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enableVisibilitySync]);
}
