/**
 * Session Store Integration
 *
 * Provides integration between the Zustand session store and the offline
 * storage system, enabling seamless offline-first session persistence.
 */

import { getOfflineStorage } from './OfflineStorage';
import { getSyncQueue, SyncExecutor } from './SyncQueue';
import { getConflictResolver } from './ConflictResolver';
import { getNetworkMonitor } from './NetworkMonitor';
import { ListSession } from '@/stores/item-store/types';
import { SyncOperation, ConflictRecord } from './types';

// Debounce time for syncing to offline storage
const OFFLINE_SAVE_DEBOUNCE_MS = 300;

// Track initialization state
let isInitialized = false;
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Default sync executor that sends session updates to the server
 */
const defaultSyncExecutor: SyncExecutor = async (operation: SyncOperation) => {
  // This is a placeholder - in a real implementation, this would call your API
  // For now, we'll simulate a successful sync
  console.log('[OfflineSync] Executing operation:', operation.type, operation.entityId);

  try {
    // Simulate API call
    // In production, replace with actual API call:
    // const response = await apiClient.put(`/api/sessions/${operation.entityId}`, operation.payload);

    // For now, just mark as successful
    return {
      success: true,
      serverVersion: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Initialize offline session sync
 * Call this once at app startup
 */
export async function initializeOfflineSessionSync(
  customSyncExecutor?: SyncExecutor
): Promise<void> {
  if (isInitialized) {
    console.log('[OfflineSync] Already initialized');
    return;
  }

  const storage = getOfflineStorage();
  const syncQueue = getSyncQueue();
  const conflictResolver = getConflictResolver();
  const networkMonitor = getNetworkMonitor();

  // Initialize storage
  await storage.initialize();

  // Configure sync executor
  syncQueue.setExecutor(customSyncExecutor ?? defaultSyncExecutor);

  // Configure conflict handler
  syncQueue.setConflictHandler(async (operation: SyncOperation, serverData: unknown) => {
    return conflictResolver.createConflictRecord(operation, serverData);
  });

  // Set up sync queue event handlers
  syncQueue.setEvents({
    onSyncStart: () => {
      console.log('[OfflineSync] Sync started');
    },
    onSyncComplete: (successful, failed) => {
      console.log(`[OfflineSync] Sync complete: ${successful} succeeded, ${failed} failed`);
    },
    onSyncError: (error) => {
      console.error('[OfflineSync] Sync error:', error);
    },
    onConflictDetected: (conflict: ConflictRecord) => {
      console.warn('[OfflineSync] Conflict detected:', conflict.entityId);
    },
  });

  // Subscribe to network status changes
  networkMonitor.subscribe((state) => {
    if (state.status !== 'offline') {
      // Trigger sync when coming back online
      console.log('[OfflineSync] Network available, processing queue');
      syncQueue.processQueue();
    }
  });

  // Process any pending operations on startup
  if (networkMonitor.isOnline()) {
    syncQueue.processQueue();
  }

  isInitialized = true;
  console.log('[OfflineSync] Initialized');
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
 * Get all offline sessions
 */
export async function getAllOfflineSessions(): Promise<ListSession[]> {
  const storage = getOfflineStorage();
  const records = await storage.getAllSessions();
  return records.map((r) => r.data);
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

/**
 * Clear all offline data (use with caution!)
 */
export async function clearAllOfflineData(): Promise<void> {
  const storage = getOfflineStorage();
  const syncQueue = getSyncQueue();

  await storage.clearAll();
  await syncQueue.clearAll();

  console.log('[OfflineSync] All offline data cleared');
}
