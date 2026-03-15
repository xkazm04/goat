/**
 * Session Store Integration
 *
 * Provides integration between the Zustand session store and the offline
 * storage system, enabling seamless offline-first session persistence.
 */

import { getOfflineStorage } from './OfflineStorage';
import { getSyncQueue, BatchSyncExecutor, SyncExecutorResult } from './SyncQueue';
import { getConflictResolver } from './ConflictResolver';
import { getNetworkMonitor } from './NetworkMonitor';
import { ListSession } from '@/stores/item-store/types';
import { SyncOperation } from './types';

// Debounce time for syncing to offline storage
const OFFLINE_SAVE_DEBOUNCE_MS = 300;

// Track initialization state
let isInitialized = false;
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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
  const serverResults = data.results ?? [];

  // Map server results back to operations by index
  return operations.map((op, i): SyncExecutorResult => {
    const result = serverResults[i];
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
 * Save session to offline storage with debouncing
 */
export function saveSessionToOffline(session: ListSession): void {
  // Clear existing debounce timer
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  // Debounce the save operation
  saveDebounceTimer = setTimeout(async () => {
    saveDebounceTimer = null;

    try {
      const storage = getOfflineStorage();
      const syncQueue = getSyncQueue();

      // Save to IndexedDB
      await storage.saveSession(session);

      // Queue for server sync
      await syncQueue.enqueueSessionUpdate(session.listId, session);

      console.log('[OfflineSync] Session saved:', session.listId);

      // Trigger sync if online
      if (getNetworkMonitor().isOnline()) {
        syncQueue.processQueue();
      }
    } catch (error) {
      console.error('[OfflineSync] Failed to save session:', error);
    }
  }, OFFLINE_SAVE_DEBOUNCE_MS);
}

/**
 * Force immediate save to offline storage (bypassing debounce)
 */
export async function forceSaveToOffline(session: ListSession): Promise<void> {
  // Clear any pending debounced save
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }

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

