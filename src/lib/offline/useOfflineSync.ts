/**
 * useOfflineSync - React hook for offline sync management
 *
 * Subscribes read-only to SyncEngine state. SyncEngine is the single
 * orchestrator that owns periodic sync intervals, network listeners,
 * and SyncQueue event handlers. This hook never calls setEvents()
 * on singletons directly.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import { ListSession } from '@/stores/item-store/types';

import { getNetworkMonitor } from './NetworkMonitor';
import { getOfflineStorage } from './OfflineStorage';
import { getSyncEngine } from './SyncEngine';
import { getSyncQueue } from './SyncQueue';
import {
  SyncState,
  ConflictRecord,
  ConflictResolutionStrategy,
} from './types';


export interface UseOfflineSyncReturn {
  // State
  syncState: SyncState;
  isOnline: boolean;
  isSyncing: boolean;
  hasPendingChanges: boolean;
  hasConflicts: boolean;
  conflicts: ConflictRecord[];

  // Actions
  saveSession: (session: ListSession) => Promise<void>;
  loadSession: (listId: string) => Promise<ListSession | null>;
  syncNow: () => Promise<void>;
  resolveConflict: (
    conflictId: string,
    strategy: ConflictResolutionStrategy,
    mergedData?: unknown
  ) => Promise<void>;
  retryFailed: () => Promise<void>;
  clearSyncQueue: () => Promise<void>;
}

const SYNC_DEBOUNCE_MS = 500;

export function useOfflineSync(): UseOfflineSyncReturn {
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    lastSyncedAt: null,
    pendingChanges: 0,
    syncProgress: 0,
    currentOperation: null,
    error: null,
    conflicts: [],
  });

  const [isOnline, setIsOnline] = useState(true);
  const syncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize: subscribe to SyncEngine as read-only consumer
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const syncEngine = getSyncEngine();
    const networkMonitor = getNetworkMonitor();

    // Initialize SyncEngine (idempotent — safe to call multiple times)
    syncEngine.initialize().then(() => {
      // Set initial state from engine
      const engineState = syncEngine.getState();
      setSyncState(engineState);
    });

    // Subscribe to SyncEngine state changes (read-only, no overwrite)
    const unsubscribeEngine = syncEngine.subscribeEvents({
      onStateChange: (state) => {
        setSyncState(state);
      },
      onNetworkChange: (state) => {
        setIsOnline(state.status !== 'offline');
      },
    });

    // Subscribe to network status for the isOnline flag
    const unsubscribeNetwork = networkMonitor.subscribe((state) => {
      setIsOnline(state.status !== 'offline');
    });

    return () => {
      unsubscribeEngine();
      unsubscribeNetwork();
    };
  }, []);

  // Save session with debounced sync
  const saveSession = useCallback(async (session: ListSession): Promise<void> => {
    const storage = getOfflineStorage();
    const syncQueue = getSyncQueue();

    // Save to IndexedDB immediately
    await storage.saveSession(session);

    // Queue for sync
    await syncQueue.enqueueSessionUpdate(session.listId, session);

    // Debounced sync trigger
    if (syncDebounceRef.current) {
      clearTimeout(syncDebounceRef.current);
    }

    syncDebounceRef.current = setTimeout(() => {
      syncDebounceRef.current = null;
      if (getNetworkMonitor().isOnline()) {
        syncQueue.processQueue();
      }
    }, SYNC_DEBOUNCE_MS);
  }, []);

  // Load session from offline storage
  const loadSession = useCallback(async (listId: string): Promise<ListSession | null> => {
    const storage = getOfflineStorage();
    return storage.getSession(listId);
  }, []);

  // Manual sync trigger — delegate to SyncEngine
  const syncNow = useCallback(async (): Promise<void> => {
    const syncEngine = getSyncEngine();

    if (!getNetworkMonitor().isOnline()) {
      setSyncState((prev) => ({
        ...prev,
        error: 'Cannot sync while offline',
      }));
      return;
    }

    await syncEngine.sync();
  }, []);

  // Resolve conflict — delegate to SyncEngine
  const resolveConflict = useCallback(
    async (
      conflictId: string,
      strategy: ConflictResolutionStrategy,
      mergedData?: unknown
    ): Promise<void> => {
      const syncEngine = getSyncEngine();
      await syncEngine.resolveConflict(
        conflictId,
        strategy as 'local_wins' | 'server_wins' | 'merge',
        mergedData
      );
    },
    []
  );

  // Retry failed operations
  const retryFailed = useCallback(async (): Promise<void> => {
    const syncQueue = getSyncQueue();
    await syncQueue.retryFailed();
  }, []);

  // Clear sync queue
  const clearSyncQueue = useCallback(async (): Promise<void> => {
    const syncQueue = getSyncQueue();
    await syncQueue.clearAll();
  }, []);

  return {
    syncState,
    isOnline,
    isSyncing: syncState.status === 'syncing',
    hasPendingChanges: syncState.pendingChanges > 0,
    hasConflicts: syncState.conflicts.length > 0,
    conflicts: syncState.conflicts,
    saveSession,
    loadSession,
    syncNow,
    resolveConflict,
    retryFailed,
    clearSyncQueue,
  };
}
