/**
 * Session Store Integration
 *
 * Integration between the Zustand session store and offline persistence.
 * Saves sessions to IndexedDB immediately (fire-and-forget) with
 * debounced sync queue enqueue.
 */

import { sessionLogger } from '@/lib/logger';
import { ListSession } from '@/stores/item-store/types';

import { getOfflinePersistence } from './OfflinePersistence';

const SYNC_ENQUEUE_DEBOUNCE_MS = 300;

let isInitialized = false;
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSyncSession: ListSession | null = null;

/**
 * Initialize offline session sync. Call once at app startup.
 */
export async function initializeOfflineSessionSync(): Promise<void> {
  if (isInitialized) {
    sessionLogger.debug('OfflineSync already initialized');
    return;
  }

  const persistence = getOfflinePersistence();
  await persistence.initialize();

  isInitialized = true;
  sessionLogger.debug('OfflineSync initialized');
}

/**
 * Save session to IndexedDB immediately, with debounced sync queue enqueue.
 */
export function saveSessionToOffline(session: ListSession): void {
  const persistence = getOfflinePersistence();

  // Save to IndexedDB immediately
  persistence.saveSession(session).catch((error) => {
    console.error('[OfflineSync] Failed to save session to IndexedDB:', error);
  });

  pendingSyncSession = session;

  // Debounce the sync queue enqueue
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);

  syncDebounceTimer = setTimeout(async () => {
    syncDebounceTimer = null;
    pendingSyncSession = null;

    try {
      await persistence.enqueueSessionUpdate(session.listId, session);
      sessionLogger.debug('Session enqueued for sync', session.listId);

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        persistence.processQueue();
      }
    } catch (error) {
      console.error('[OfflineSync] Failed to enqueue session sync:', error);
    }
  }, SYNC_ENQUEUE_DEBOUNCE_MS);
}

/**
 * Force immediate save (bypassing debounce).
 */
export async function forceSaveToOffline(session: ListSession): Promise<void> {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
  pendingSyncSession = null;

  const persistence = getOfflinePersistence();
  await persistence.saveSession(session);
  await persistence.enqueueSessionUpdate(session.listId, session);

  sessionLogger.debug('Session force saved', session.listId);

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    persistence.processQueue();
  }
}

/**
 * Flush any pending debounced sync queue enqueue.
 * Call from beforeunload/visibilitychange handlers.
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
    const persistence = getOfflinePersistence();
    persistence.enqueueSessionUpdate(session.listId, session).catch(() => {
      // Swallow — page may already be unloading
    });
  } catch {
    // Not initialized — swallow
  }
}

/**
 * Load session from offline storage.
 */
export async function getOfflineSession(listId: string): Promise<ListSession | null> {
  const persistence = getOfflinePersistence();
  return persistence.getSession(listId);
}

/**
 * Delete session from offline storage.
 */
export async function deleteFromOffline(listId: string): Promise<void> {
  const persistence = getOfflinePersistence();
  await persistence.deleteSession(listId);
  await persistence.enqueue('DELETE_SESSION', listId, 'session', null, 1);

  sessionLogger.debug('Session deleted', listId);

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    persistence.processQueue();
  }
}

/**
 * Check if there are unsynced changes.
 */
export async function hasUnsyncedChanges(): Promise<boolean> {
  const persistence = getOfflinePersistence();
  const dirty = await persistence.getDirtySessions();
  return dirty.length > 0;
}

/**
 * Get count of pending sync operations.
 */
export async function getPendingOperationsCount(): Promise<number> {
  const persistence = getOfflinePersistence();
  return persistence.getPendingCount();
}

/**
 * Merge offline and online session data by timestamp (last-writer-wins).
 */
export function mergeSessionData(
  offline: ListSession,
  online: ListSession
): ListSession {
  const offlineDate = new Date(offline.updatedAt).getTime();
  const onlineDate = new Date(online.updatedAt).getTime();
  return offlineDate > onlineDate ? offline : online;
}

/**
 * Trigger manual sync.
 */
export async function triggerSync(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    sessionLogger.warn('Cannot sync while offline');
    return;
  }

  const persistence = getOfflinePersistence();
  await persistence.processQueue();
}
