/**
 * useOfflineSync - React hook for offline sync management
 *
 * Provides a unified interface for managing offline data synchronization,
 * including queue status, conflict handling, and sync triggers.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SyncStatus,
  SyncState,
  SyncQueueState,
  ConflictRecord,
  ConflictResolutionStrategy,
} from './types';
import { getOfflineStorage } from './OfflineStorage';
import { getSyncQueue, SyncExecutor } from './SyncQueue';
import { getConflictResolver } from './ConflictResolver';
import { getNetworkMonitor } from './NetworkMonitor';
import { ListSession } from '@/stores/item-store/types';

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
const AUTO_SYNC_INTERVAL_MS = 30000; // 30 seconds

export function useOfflineSync(
  syncExecutor?: SyncExecutor
): UseOfflineSyncReturn {
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
  const autoSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize sync infrastructure
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const storage = getOfflineStorage();
    const syncQueue = getSyncQueue();
    const networkMonitor = getNetworkMonitor();
    const conflictResolver = getConflictResolver();

    // Initialize storage
    storage.initialize();

    // Configure sync executor if provided
    if (syncExecutor) {
      syncQueue.setExecutor(syncExecutor);
    }

    // Set up conflict handler
    syncQueue.setConflictHandler(async (operation, serverData) => {
      return conflictResolver.createConflictRecord(operation, serverData);
    });

    // Set up sync queue events
    syncQueue.setEvents({
      onSyncStart: () => {
        setSyncState((prev) => ({
          ...prev,
          status: 'syncing',
          currentOperation: 'Starting sync...',
        }));
      },
      onSyncComplete: (successful, failed) => {
        setSyncState((prev) => ({
          ...prev,
          status: failed > 0 ? 'error' : 'synced',
          lastSyncedAt: Date.now(),
          currentOperation: null,
          error: failed > 0 ? `${failed} operations failed` : null,
        }));
      },
      onSyncError: (error) => {
        setSyncState((prev) => ({
          ...prev,
          status: 'error',
          error: error.message,
          currentOperation: null,
        }));
      },
      onOperationSuccess: (operation) => {
        setSyncState((prev) => ({
          ...prev,
          currentOperation: `Synced ${operation.entityType}`,
        }));
      },
      onOperationFailed: (operation, error) => {
        console.error('[OfflineSync] Operation failed:', operation.id, error);
      },
      onConflictDetected: (conflict) => {
        setSyncState((prev) => ({
          ...prev,
          status: 'conflict',
          conflicts: [...prev.conflicts, conflict],
        }));
      },
      onQueueChange: (queueState: SyncQueueState) => {
        setSyncState((prev) => ({
          ...prev,
          pendingChanges: queueState.pendingCount,
          status:
            queueState.pendingCount > 0 && prev.status === 'synced'
              ? 'pending'
              : prev.status,
        }));
      },
    });

    // Subscribe to network status
    const unsubscribeNetwork = networkMonitor.subscribe((state) => {
      const wasOffline = !isOnline;
      const nowOnline = state.status !== 'offline';

      setIsOnline(nowOnline);

      // Trigger sync when coming back online
      if (wasOffline && nowOnline) {
        console.log('[OfflineSync] Back online, triggering sync');
        syncQueue.processQueue();
      }
    });

    // Set up auto-sync interval
    autoSyncIntervalRef.current = setInterval(() => {
      if (networkMonitor.isOnline()) {
        syncQueue.processQueue();
      }
    }, AUTO_SYNC_INTERVAL_MS);

    // Load initial queue state
    syncQueue.getState().then((queueState) => {
      setSyncState((prev) => ({
        ...prev,
        pendingChanges: queueState.pendingCount,
        lastSyncedAt: queueState.lastProcessedAt,
      }));
    });

    // Load unresolved conflicts
    storage.getUnresolvedConflicts().then((conflicts) => {
      if (conflicts.length > 0) {
        setSyncState((prev) => ({
          ...prev,
          status: 'conflict',
          conflicts,
        }));
      }
    });

    return () => {
      unsubscribeNetwork();
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
      }
      if (syncDebounceRef.current) {
        clearTimeout(syncDebounceRef.current);
      }
    };
  }, [syncExecutor]);

  // Save session with debounced sync
  const saveSession = useCallback(async (session: ListSession): Promise<void> => {
    const storage = getOfflineStorage();
    const syncQueue = getSyncQueue();

    // Save to IndexedDB immediately
    await storage.saveSession(session);

    // Queue for sync
    await syncQueue.enqueueSessionUpdate(session.listId, session);

    // Update state
    setSyncState((prev) => ({
      ...prev,
      status: 'pending',
      pendingChanges: prev.pendingChanges + 1,
    }));

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

  // Manual sync trigger
  const syncNow = useCallback(async (): Promise<void> => {
    const syncQueue = getSyncQueue();

    if (!getNetworkMonitor().isOnline()) {
      setSyncState((prev) => ({
        ...prev,
        error: 'Cannot sync while offline',
      }));
      return;
    }

    await syncQueue.processQueue();
  }, []);

  // Resolve conflict
  const resolveConflict = useCallback(
    async (
      conflictId: string,
      strategy: ConflictResolutionStrategy,
      mergedData?: unknown
    ): Promise<void> => {
      const storage = getOfflineStorage();
      const syncQueue = getSyncQueue();

      // Find the conflict
      const conflicts = await storage.getUnresolvedConflicts();
      const conflict = conflicts.find((c) => c.id === conflictId);

      if (!conflict) {
        throw new Error(`Conflict ${conflictId} not found`);
      }

      // Determine resolved data
      let resolvedData: unknown;
      if (strategy === 'local_wins') {
        resolvedData = conflict.localData;
      } else if (strategy === 'server_wins') {
        resolvedData = conflict.serverData;
      } else if (strategy === 'merge' && mergedData) {
        resolvedData = mergedData;
      } else {
        throw new Error('Invalid resolution strategy or missing merged data');
      }

      // Resolve in storage
      await storage.resolveConflict(conflictId, strategy, resolvedData);

      // Resolve in sync queue if there's an associated operation
      if (conflict.operationId) {
        await syncQueue.resolveConflict(
          conflict.operationId,
          strategy as 'local_wins' | 'server_wins' | 'merge',
          mergedData
        );
      }

      // Update state
      setSyncState((prev) => ({
        ...prev,
        conflicts: prev.conflicts.filter((c) => c.id !== conflictId),
        status: prev.conflicts.length === 1 ? 'pending' : 'conflict',
      }));
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

    setSyncState((prev) => ({
      ...prev,
      pendingChanges: 0,
      status: 'idle',
    }));
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
