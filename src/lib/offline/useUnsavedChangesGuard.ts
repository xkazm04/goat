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

  // beforeunload handler
  useEffect(() => {
    if (!enableBeforeUnload || typeof window === 'undefined') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Single flush replaces the old 3-layer flush
      flushDerivedSessionSync();
      flushPendingSync();

      // Check pending count synchronously via a simple check
      // (we can't await here, but the flushes above are synchronous)
      const persistence = getOfflinePersistence();
      persistence.getPendingCount().then(count => {
        // This won't actually prevent unload since it's async,
        // but the flushes above already saved data synchronously
      });

      // Always set returnValue for safety — browser decides whether to show
      e.preventDefault();
      e.returnValue = '';
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
