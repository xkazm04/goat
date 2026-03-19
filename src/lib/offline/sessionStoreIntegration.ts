/**
 * Session Store Integration
 *
 * Provides integration between the Zustand session store and the offline
 * storage system, enabling seamless offline-first session persistence.
 */

import { ListSession } from '@/stores/item-store/types';

import { getConflictResolver } from './ConflictResolver';
import { getNetworkMonitor } from './NetworkMonitor';
import { getOfflineStorage } from './OfflineStorage';
import { getSyncQueue, BatchSyncExecutor, SyncExecutorResult } from './SyncQueue';
import { SyncOperation } from './types';

// Debounce time for sync queue enqueue (IndexedDB save is always immediate)
const SYNC_ENQUEUE_DEBOUNCE_MS = 300;

// Track initialization state
let isInitialized = false;
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
// Track the latest pending session for sync queue flush
let pendingSyncSession: ListSession | null = null;

/**
 * Batch sync executor that sends all pending operations in a single HTTP request
 */
const defaultBatchSyncExecutor: BatchSyncExecutor = async (operations: SyncOperation[]) => {
  console.log('[OfflineSync] Batch executing', operations.length, 'operations');

  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ operations }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.error || `HTTP ${response.status}`;
    // Return failure for every operation in the batch
    return operations.map((op): SyncExecutorResult => ({
      success: false,
      error: errorMsg,
    }));
  }

  const data = await response.json();
  const serverResults: Array<{ operationId?: string; success: boolean; serverVersion?: number; error?: string; serverData?: unknown }> = data.results ?? [];

  // Build a lookup map keyed by operationId for robust matching
  // (server may reorder results due to parallel entity-group processing)
  const resultsByOperationId = new Map<string, typeof serverResults[number]>();
  for (const result of serverResults) {
    if (result.operationId) {
      resultsByOperationId.set(result.operationId, result);
    }
  }

  // Match server results to operations by operationId, falling back to index
  return operations.map((op, i): SyncExecutorResult => {
    const result = resultsByOperationId.get(op.id) ?? serverResults[i];
    if (!result) {
      return { success: false, error: 'No result returned from sync API' };
    }
    return {
      success: result.success,
      serverVersion: result.serverVersion,
      error: result.error,
      serverData: result.serverData,
    };
  });
};

/**
 * Initialize offline session sync
 * Call this once at app startup
 */
export async function initializeOfflineSessionSync(
  customBatchExecutor?: BatchSyncExecutor
): Promise<void> {
  if (isInitialized) {
    console.log('[OfflineSync] Already initialized');
    return;
  }

  const storage = getOfflineStorage();
  const syncQueue = getSyncQueue();
  const conflictResolver = getConflictResolver();

  // Initialize storage
  await storage.initialize();

  // Configure batch sync executor
  syncQueue.setBatchExecutor(customBatchExecutor ?? defaultBatchSyncExecutor);

  // Configure conflict handler
  syncQueue.setConflictHandler(async (operation: SyncOperation, serverData: unknown) => {
    return conflictResolver.createConflictRecord(operation, serverData);
  });

  isInitialized = true;
  console.log('[OfflineSync] Initialized with batch sync');
}

/**
 * Save session to offline storage immediately, with debounced sync queue enqueue.
 *
 * IndexedDB write happens synchronously (fire-and-forget) to prevent data loss
 * if the tab closes during the debounce window. Only the sync queue enqueue
 * and server sync trigger are debounced.
 */
export function saveSessionToOffline(session: ListSession): void {
  // Save to IndexedDB immediately — no debounce
  const storage = getOfflineStorage();
  storage.saveSession(session).catch((error) => {
    console.error('[OfflineSync] Failed to save session to IndexedDB:', error);
  });

  // Track the latest session for flush-on-unload
  pendingSyncSession = session;

  // Debounce only the sync queue enqueue
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }

  syncDebounceTimer = setTimeout(async () => {
    syncDebounceTimer = null;
    pendingSyncSession = null;

    try {
      const syncQueue = getSyncQueue();
      await syncQueue.enqueueSessionUpdate(session.listId, session);

      console.log('[OfflineSync] Session enqueued for sync:', session.listId);

      if (getNetworkMonitor().isOnline()) {
        syncQueue.processQueue();
      }
    } catch (error) {
      console.error('[OfflineSync] Failed to enqueue session sync:', error);
    }
  }, SYNC_ENQUEUE_DEBOUNCE_MS);
}

/**
 * Force immediate save to offline storage (bypassing debounce)
 */
export async function forceSaveToOffline(session: ListSession): Promise<void> {
  // Clear any pending debounced sync enqueue
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
  pendingSyncSession = null;

  const storage = getOfflineStorage();
  const syncQueue = getSyncQueue();

  await storage.saveSession(session);
  await syncQueue.enqueueSessionUpdate(session.listId, session);

  console.log('[OfflineSync] Session force saved:', session.listId);

  if (getNetworkMonitor().isOnline()) {
    syncQueue.processQueue();
  }
}

/**
 * Flush any pending debounced sync queue enqueue.
 *
 * Call this from beforeunload/visibilitychange handlers to ensure
 * the sync queue has the latest session data before the page unloads.
 * The IndexedDB write already happened immediately, so this only
 * flushes the sync queue part.
 */
export function flushPendingSync(): void {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }

  const session = pendingSyncSession;
  if (!session) return;
  pendingSyncSession = null;

  try {
    const syncQueue = getSyncQueue();
    // Fire-and-forget — best effort before page unload
    syncQueue.enqueueSessionUpdate(session.listId, session).catch(() => {
      // Swallow — page may already be unloading
    });
  } catch {
    // getSyncQueue may throw if not initialized
  }
}

/**
 * Load session from offline storage
 */
export async function getOfflineSession(listId: string): Promise<ListSession | null> {
  const storage = getOfflineStorage();
  return storage.getSession(listId);
}

/**
 * Delete session from offline storage
 */
export async function deleteFromOffline(listId: string): Promise<void> {
  const storage = getOfflineStorage();
  const syncQueue = getSyncQueue();

  await storage.deleteSession(listId);
  await syncQueue.enqueue('DELETE_SESSION', listId, 'session', null, 1);

  console.log('[OfflineSync] Session deleted:', listId);

  if (getNetworkMonitor().isOnline()) {
    syncQueue.processQueue();
  }
}

/**
 * Check if there are unsynced changes
 */
export async function hasUnsyncedChanges(): Promise<boolean> {
  const storage = getOfflineStorage();
  const dirtySessions = await storage.getDirtySessions();
  return dirtySessions.length > 0;
}

/**
 * Get count of pending sync operations
 */
export async function getPendingOperationsCount(): Promise<number> {
  const syncQueue = getSyncQueue();
  return syncQueue.getPendingCount();
}

/**
 * Merge offline and online session data
 * Returns the merged session, preferring more recent changes
 */
export function mergeSessionData(
  offline: ListSession,
  online: ListSession
): ListSession {
  const conflictResolver = getConflictResolver();

  // Use the conflict resolver's merge logic
  const mergeResult = conflictResolver.mergeSessionData(offline, online, null);

  // If there are unresolved conflicts, prefer the more recent version
  if (mergeResult.hasUnresolvedConflicts) {
    const offlineDate = new Date(offline.updatedAt).getTime();
    const onlineDate = new Date(online.updatedAt).getTime();

    // Return the more recent version
    return offlineDate > onlineDate ? offline : online;
  }

  return mergeResult.mergedSession;
}

/**
 * Trigger manual sync
 */
export async function triggerSync(): Promise<void> {
  const syncQueue = getSyncQueue();
  const networkMonitor = getNetworkMonitor();

  if (!networkMonitor.isOnline()) {
    console.warn('[OfflineSync] Cannot sync while offline');
    return;
  }

  await syncQueue.processQueue();
}

