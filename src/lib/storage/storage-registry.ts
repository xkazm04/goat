/**
 * Storage Registry — Single source of truth for the storage architecture.
 *
 * ## Architecture Decision: Two-Database IndexedDB Boundary
 *
 * The app uses three storage layers, each with clear ownership:
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  STORAGE LAYER           │ DATABASE              │ ENTITY OWNER    │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  Zustand persist (grid)  │ localStorage          │ grid-store      │
 * │  Zustand persist (sess)  │ localStorage          │ session-store   │
 * │  Zustand persist (blog)  │ goat-app-storage (IDB)│ backlog-store   │
 * │  Offline sessions        │ goat-offline-db  (IDB)│ OfflineStorage  │
 * │  Sync queue              │ goat-offline-db  (IDB)│ SyncQueue       │
 * │  Backlog cache           │ goat-offline-db  (IDB)│ OfflineStorage  │
 * │  Conflict records        │ goat-offline-db  (IDB)│ ConflictResolver│
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ## Dual-Write Pattern for Sessions
 *
 * Session data is written to BOTH localStorage (Zustand persist) and
 * goat-offline-db (OfflineStorage). This is intentional:
 *
 *   - **Zustand persist (localStorage)** is the PRIMARY/authoritative source
 *     for UI hydration. It loads synchronously on page load and drives the
 *     React component tree. This is the "hot" path.
 *
 *   - **OfflineStorage (goat-offline-db)** is the SECONDARY source for
 *     offline sync, server reconciliation, and crash recovery. It stores
 *     richer metadata (version, isDirty, lastSynced) needed by the sync
 *     engine. This is the "sync" path.
 *
 * ### Authority Rules
 *
 *   1. On load: Zustand persist hydrates first. Then `loadSession()` checks
 *      goat-offline-db and picks the newer timestamp if both exist.
 *   2. On save: Zustand persist writes immediately. `saveSessionToOffline()`
 *      writes to goat-offline-db (fire-and-forget) and enqueues sync.
 *   3. On conflict: The offline-db record's `serverVersion` is compared
 *      against the server; the conflict resolver merges or picks a winner.
 *
 * ### Recovery from Inconsistency
 *
 * If the two databases diverge (e.g., crash between writes), the
 * `reconcileSessionSources()` function below compares timestamps and
 * returns the more recent copy. Callers should use this during session load.
 *
 * ## Backlog Cache vs Backlog Store
 *
 *   - **backlog-store** (goat-app-storage): Authoritative for UI state
 *     (groups, selections, loading flags). Persisted via Zustand.
 *   - **OfflineStorage.backlogCache** (goat-offline-db): TTL-based cache
 *     for offline access. Populated by fetch, pruned on expiry. NOT
 *     authoritative — always re-fetched when online.
 */

import { ListSession } from '@/stores/item-store/types';

// ---------------------------------------------------------------------------
// Storage identifiers (centralized to prevent magic strings)
// ---------------------------------------------------------------------------

/** IndexedDB database used by Zustand persist for backlog-store */
export const ZUSTAND_IDB_NAME = 'goat-app-storage';

/** IndexedDB database used by the offline sync engine */
export const OFFLINE_IDB_NAME = 'goat-offline-db';

/** localStorage keys used by Zustand persist */
export const ZUSTAND_LS_KEYS = {
  GRID: 'grid-store',
  SESSION: 'session-store',
} as const;

// ---------------------------------------------------------------------------
// Entity ownership declarations
// ---------------------------------------------------------------------------

export type StorageLayer = 'localStorage' | 'goat-app-storage' | 'goat-offline-db';

export interface EntityOwnership {
  entity: string;
  primaryStore: StorageLayer;
  secondaryStore?: StorageLayer;
  owner: string;
  notes: string;
}

/**
 * Declarative registry of which store owns which entity.
 * Used for documentation and runtime diagnostics.
 */
export const ENTITY_OWNERSHIP: EntityOwnership[] = [
  {
    entity: 'grid-items',
    primaryStore: 'localStorage',
    owner: 'grid-store',
    notes: 'Authoritative for grid positions. Syncs to session-store via batched microtask.',
  },
  {
    entity: 'sessions',
    primaryStore: 'localStorage',
    secondaryStore: 'goat-offline-db',
    owner: 'session-store',
    notes: 'Dual-write: localStorage for UI hydration, goat-offline-db for sync/recovery.',
  },
  {
    entity: 'backlog-groups',
    primaryStore: 'goat-app-storage',
    owner: 'backlog-store',
    notes: 'IndexedDB via Zustand persist. Authoritative for UI state.',
  },
  {
    entity: 'backlog-cache',
    primaryStore: 'goat-offline-db',
    owner: 'OfflineStorage',
    notes: 'TTL-based offline cache. NOT authoritative — re-fetched when online.',
  },
  {
    entity: 'sync-queue',
    primaryStore: 'goat-offline-db',
    owner: 'SyncQueue',
    notes: 'Pending server sync operations. Processed when online.',
  },
  {
    entity: 'conflicts',
    primaryStore: 'goat-offline-db',
    owner: 'ConflictResolver',
    notes: 'Conflict detection/resolution history.',
  },
];

// ---------------------------------------------------------------------------
// Reconciliation utilities
// ---------------------------------------------------------------------------

/**
 * Compare a Zustand-persisted session (from localStorage) with an
 * offline-db session (from goat-offline-db) and return the more recent one.
 *
 * This resolves the dual-write inconsistency that can occur if a crash
 * happens between the two writes.
 *
 * @returns The session with the more recent `updatedAt`, or whichever is
 *          available if only one source has data.
 */
export function reconcileSessionSources(
  zustandSession: ListSession | null,
  offlineSession: ListSession | null,
): ListSession | null {
  if (!zustandSession && !offlineSession) return null;
  if (!zustandSession) return offlineSession;
  if (!offlineSession) return zustandSession;

  const zustandTime = new Date(zustandSession.updatedAt).getTime();
  const offlineTime = new Date(offlineSession.updatedAt).getTime();

  // If timestamps match, prefer Zustand (it's the primary/hot path)
  if (zustandTime >= offlineTime) return zustandSession;
  return offlineSession;
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/**
 * Check whether a session exists in both storage layers and report staleness.
 * Useful for debugging data inconsistency issues.
 */
export async function diagnoseSessionStorage(listId: string): Promise<{
  zustandExists: boolean;
  offlineExists: boolean;
  zustandTimestamp: number | null;
  offlineTimestamp: number | null;
  staleDeltaMs: number | null;
  authoritative: 'zustand' | 'offline' | 'neither';
}> {
  let zustandSession: ListSession | null = null;
  let offlineSession: ListSession | null = null;

  // Read from localStorage (Zustand persist)
  try {
    const raw = localStorage.getItem(ZUSTAND_LS_KEYS.SESSION);
    if (raw) {
      const parsed = JSON.parse(raw);
      const sessions = parsed?.state?.listSessions;
      if (sessions && sessions[listId]) {
        zustandSession = sessions[listId];
      }
    }
  } catch {
    // localStorage read failed
  }

  // Read from goat-offline-db
  try {
    const { getOfflineStorage } = await import('@/lib/offline/OfflineStorage');
    const storage = getOfflineStorage();
    offlineSession = await storage.getSession(listId);
  } catch {
    // offline storage read failed
  }

  const zustandTime = zustandSession ? new Date(zustandSession.updatedAt).getTime() : null;
  const offlineTime = offlineSession ? new Date(offlineSession.updatedAt).getTime() : null;

  let authoritative: 'zustand' | 'offline' | 'neither' = 'neither';
  if (zustandTime !== null && offlineTime !== null) {
    authoritative = zustandTime >= offlineTime ? 'zustand' : 'offline';
  } else if (zustandTime !== null) {
    authoritative = 'zustand';
  } else if (offlineTime !== null) {
    authoritative = 'offline';
  }

  return {
    zustandExists: zustandSession !== null,
    offlineExists: offlineSession !== null,
    zustandTimestamp: zustandTime,
    offlineTimestamp: offlineTime,
    staleDeltaMs: zustandTime !== null && offlineTime !== null
      ? Math.abs(zustandTime - offlineTime)
      : null,
    authoritative,
  };
}
