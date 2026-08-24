/**
 * useOfflineSync - React hook for offline sync state
 *
 * Provides reactive sync state and actions for UI components.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

import { ListSession } from '@/stores/item-store/types';

import { getOfflinePersistence } from './OfflinePersistence';
import { SyncState } from './types';

export interface UseOfflineSyncReturn {
  syncState: SyncState;
  isOnline: boolean;
  isSyncing: boolean;
  hasPendingChanges: boolean;
  hasConflicts: boolean;
  conflicts: [];
  saveSession: (session: ListSession) => Promise<void>;
  loadSession: (listId: string) => Promise<ListSession | null>;
  syncNow: () => Promise<void>;
  resolveConflict: (
    conflictId: string,
    strategy: string,
    mergedData?: unknown
  ) => Promise<void>;
  retryFailed: () => Promise<void>;
  clearSyncQueue: () => Promise<void>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    lastSyncedAt: null,
    pendingChanges: 0,
    error: null,
  });

  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to queue changes
    const persistence = getOfflinePersistence();
    const unsubscribe = persistence.onQueueChange((pendingCount) => {
      setSyncState(prev => ({
        ...prev,
        pendingChanges: pendingCount,
        status: pendingCount > 0 ? 'pending' : 'idle',
      }));
    });

    // Load initial pending count
    persistence.getPendingCount().then(count => {
      setSyncState(prev => ({
        ...prev,
        pendingChanges: count,
        status: count > 0 ? 'pending' : 'idle',
      }));
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const saveSession = useCallback(async (session: ListSession) => {
    const persistence = getOfflinePersistence();
    await persistence.saveSession(session);
    await persistence.enqueueSessionUpdate(session.listId, session);

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      persistence.processQueue();
    }
  }, []);

  const loadSession = useCallback(async (listId: string) => {
    const persistence = getOfflinePersistence();
    return persistence.getSession(listId);
  }, []);

  const syncNow = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncState(prev => ({ ...prev, error: 'Cannot sync while offline' }));
      return;
    }

    setSyncState(prev => ({ ...prev, status: 'syncing', error: null }));

    try {
      const persistence = getOfflinePersistence();
      await persistence.processQueue();
      setSyncState(prev => ({
        ...prev,
        status: prev.pendingChanges > 0 ? 'pending' : 'synced',
        lastSyncedAt: Date.now(),
      }));
    } catch (error) {
      setSyncState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Sync failed',
      }));
    }
  }, []);

  const resolveConflict = useCallback(async () => {
    // No-op: conflict resolution was never triggered in practice
  }, []);

  const retryFailed = useCallback(async () => {
    const persistence = getOfflinePersistence();
    await persistence.retryFailed();
  }, []);

  const clearSyncQueue = useCallback(async () => {
    const persistence = getOfflinePersistence();
    await persistence.clearAll();
  }, []);

  return {
    syncState,
    isOnline,
    isSyncing: syncState.status === 'syncing',
    hasPendingChanges: syncState.pendingChanges > 0,
    hasConflicts: false,
    conflicts: [],
    saveSession,
    loadSession,
    syncNow,
    resolveConflict,
    retryFailed,
    clearSyncQueue,
  };
}
