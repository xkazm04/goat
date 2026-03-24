/**
 * Derived Session Sync
 *
 * Replaces the 3-layer sync system (microtask batching, hydration queue,
 * debounced save) with a deterministic derived-store pattern:
 *
 *   session state = f(grid-store)
 *
 * Grid-store is the single source of truth for grid positions. This module
 * subscribes to grid-store changes and synchronously projects them into
 * session-store. Persistence to IndexedDB is throttled via a single
 * requestIdleCallback observer — no queue, no debounce, no hydration race.
 *
 * HOW IT WORKS:
 *   1. Grid-store mutations update gridItems (the source of truth).
 *   2. This subscriber detects the change via Zustand subscribe.
 *   3. It synchronously calls sessionStore.updateSessionGridItems()
 *      to keep the session projection in sync.
 *   4. A requestIdleCallback-throttled observer persists to IndexedDB
 *      when the browser is idle, coalescing rapid changes naturally.
 *   5. On beforeunload/visibilitychange, flush() writes immediately.
 */

import { gridLogger } from '@/lib/logger';
import { saveSessionToOffline } from '@/lib/offline/sessionStoreIntegration';
import { GridItemType } from '@/types/match';

import { useGridStore } from './grid-store';
import { useSessionStore } from './session-store';

// ── State ──────────────────────────────────────────────────────────────

let isInitialized = false;
let unsubscribeGrid: (() => void) | null = null;

/** Pending IndexedDB write — set when grid changes, cleared after persist */
let pendingPersist = false;
/** Handle for the scheduled requestIdleCallback */
let idleCallbackId: number | null = null;

/** Snapshot of gridItems at last sync — used to detect real changes */
let lastSyncedGridItems: GridItemType[] | null = null;

// ── requestIdleCallback polyfill for SSR / older browsers ──────────────

const scheduleIdle: (cb: () => void) => number =
  typeof requestIdleCallback === 'function'
    ? (cb) => requestIdleCallback(cb, { timeout: 2000 })
    : (cb) => setTimeout(cb, 16) as unknown as number;

const cancelIdle: (id: number) => void =
  typeof cancelIdleCallback === 'function'
    ? cancelIdleCallback
    : (id) => clearTimeout(id);

// ── Core sync logic ────────────────────────────────────────────────────

/**
 * Synchronously project grid-store gridItems into session-store.
 * This is the deterministic derivation: session IS f(grid).
 */
function deriveSessionFromGrid(gridItems: GridItemType[]): void {
  // Skip if reference hasn't changed (same array)
  if (gridItems === lastSyncedGridItems) return;
  lastSyncedGridItems = gridItems;

  const sessionState = useSessionStore.getState();

  // If session store has no active session, there's nothing to project into
  if (!sessionState.activeSessionId) return;

  // Synchronous projection — no buffering, no queue
  sessionState.updateSessionGridItems(gridItems);

  // Schedule idle persist (coalesces rapid changes)
  schedulePersist();
}

/**
 * Schedule an IndexedDB persist via requestIdleCallback.
 * Multiple calls between idle frames are naturally coalesced —
 * the callback always reads the latest session state.
 */
function schedulePersist(): void {
  pendingPersist = true;

  // Don't schedule if one is already pending
  if (idleCallbackId !== null) return;

  idleCallbackId = scheduleIdle(() => {
    idleCallbackId = null;
    flushPersist();
  });
}

/**
 * Immediately persist the current session to IndexedDB.
 * Called by the idle callback and by flush() on beforeunload.
 */
function flushPersist(): void {
  if (!pendingPersist) return;
  pendingPersist = false;

  const sessionState = useSessionStore.getState();
  if (!sessionState.activeSessionId) return;

  const session = sessionState.listSessions[sessionState.activeSessionId];
  if (!session) return;

  saveSessionToOffline(session);
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Initialize the derived session sync.
 * Call once at app startup (e.g., in a provider or layout).
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initDerivedSessionSync(): void {
  if (isInitialized) return;
  isInitialized = true;

  // Subscribe to full grid-store state; extract gridItems and detect changes
  // by reference. Grid-store uses `persist` without `subscribeWithSelector`,
  // so the selector-based overload is not available.
  let prevGridItems = useGridStore.getState().gridItems;

  unsubscribeGrid = useGridStore.subscribe((state) => {
    const nextGridItems = state.gridItems;
    if (nextGridItems !== prevGridItems) {
      prevGridItems = nextGridItems;
      deriveSessionFromGrid(nextGridItems);
    }
  });

  gridLogger.debug('Derived session sync initialized');
}

/**
 * Flush all pending syncs immediately.
 * Call on beforeunload / visibilitychange to prevent data loss.
 *
 * This is the ONLY flush mechanism needed — it replaces:
 *   - flushPendingGridSync() (grid-store microtask flush)
 *   - flushPendingSessionSave() (session-store debounce flush)
 */
export function flushDerivedSessionSync(): void {
  // 1. Ensure the latest grid state is projected into session
  const gridItems = useGridStore.getState().gridItems;
  if (gridItems && gridItems.length > 0) {
    const sessionState = useSessionStore.getState();
    if (sessionState.activeSessionId) {
      sessionState.updateSessionGridItems(gridItems);
    }
  }

  // 2. Cancel any pending idle callback and persist immediately
  if (idleCallbackId !== null) {
    cancelIdle(idleCallbackId);
    idleCallbackId = null;
  }
  pendingPersist = true; // Force persist even if no change detected
  flushPersist();

  // 3. Also flush the session-store's own save (for backlog changes)
  useSessionStore.getState().saveCurrentSession();
}

/**
 * Tear down the derived session sync.
 * Primarily for tests and hot-module-replacement.
 */
export function teardownDerivedSessionSync(): void {
  if (unsubscribeGrid) {
    unsubscribeGrid();
    unsubscribeGrid = null;
  }
  if (idleCallbackId !== null) {
    cancelIdle(idleCallbackId);
    idleCallbackId = null;
  }
  pendingPersist = false;
  lastSyncedGridItems = null;
  isInitialized = false;
}
