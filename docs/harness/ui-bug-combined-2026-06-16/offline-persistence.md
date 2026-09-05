# Offline & Persistence — Combined UI+Bug Scan
> Context: Offline-first support (service worker, network status, IndexedDB + safe localStorage, unsaved-changes guards) for the goat ranking app.
> Files scanned: 15
> Total: 5 (Critical: 1, High: 2, Medium: 2, Low: 0)

## 1. processQueue strands operations in `in_progress` forever on a network drop mid-flight
- **Severity**: critical
- **Lens**: bug-hunter
- **Category**: data-loss / state-corruption (timing / online→offline transition)
- **File**: src/lib/offline/OfflinePersistence.ts:328 (flag set), :333 (fetch), :380 (catch)
- **Scenario**: `processQueue()` flips every pending op to `'in_progress'` (lines 328-330), then `await fetch('/api/sync')`. If the network drops, the tab is backgrounded/killed, or fetch throws (DNS failure, abort, CORS), control jumps to the `catch` at line 380 which only logs `sessionLogger.debug` and resets `isProcessing`. The ops remain `'in_progress'` in IndexedDB permanently.
- **Root cause**: The happy path assumes `fetch` either returns `!ok` (handled, reset to pending at 341-348) or returns results. A *thrown* fetch (the most common offline failure) has no handler that reverts the `in_progress` ops back to `pending`.
- **Impact**: `getPendingOperations()` filters on `status === 'pending'` (line 262), so stranded `in_progress` ops are invisible to all future syncs, the pending count, the banner, and `processQueue`. The user's unsynced edits silently never reach the server — exactly the data-loss vector this module exists to prevent. `retryFailed()` won't recover them either (it only re-queues `'failed'`).
- **Fix sketch**: In the `catch` block (and a `finally`), revert any ops still `'in_progress'` back to `'pending'` (incrementing `retryCount`), then `notifyQueueChange()`. Alternatively snapshot the in-flight op ids and on any non-success exit path restore their status.

## 2. Offline page shows the wrong pending-changes count (reads backlog store, not the sync queue)
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: data-inconsistency / wrong data source
- **File**: src/app/offline/page.tsx:29 (and 114, 118)
- **Scenario**: The offline fallback page reads `useBacklogStore((s) => s.pendingChanges)` and renders "`{pendingChanges.length} pending changes will sync when online`". But unsynced *session/ranking* edits live in the offline sync queue (`goat-offline-db`, surfaced via `getOfflinePersistence().getPendingCount()`), which is an entirely different store. `backlog-store.pendingChanges` is a separate array of backlog `PendingChange` items (stores/backlog/types.ts:89).
- **Root cause**: Two unrelated "pending changes" concepts collide. Every other surface in this context (`UnsavedChangesBanner`, `useOfflineSync`) sources the count from `OfflinePersistence`; the offline page alone reads the backlog store.
- **Impact**: A user who reorders a list offline then navigates to the offline page sees "0 pending changes" (no reassurance, looks like data was lost), or conversely sees a stale backlog count unrelated to their actual unsynced rankings. Directly undermines the page's only job: reassuring the user their work is safe.
- **Fix sketch**: Source the count from `getOfflinePersistence().getPendingCount()` (subscribe via `onQueueChange` like the banner does), or sum both sources if both are meant to surface here. At minimum unify on the offline-sync queue used everywhere else.

## 3. UnsavedChangesBanner always shows "Last sync: never synced"
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: missing state / misleading UI
- **File**: src/lib/offline/UnsavedChangesBanner.tsx:53-58, 65-73, 152
- **Scenario**: In both the `onQueueChange` subscription (line 54-58) and the initial-count load (66-72), the banner constructs its `SyncState` with `lastSyncedAt: null` hardcoded. Line 152 renders `Last sync: {formatLastSync(syncState.lastSyncedAt)}`, and `formatLastSync(null)` returns `'never synced'` (line 101).
- **Root cause**: The banner owns its own local `syncState` derived solely from the queue's pending count and never reads the real `lastSyncedAt` (which `useOfflineSync`/`syncNow` do track at OfflineProvider level). The "Last sync" label can never display a real time.
- **Impact**: Users with pending changes always see "never synced" even immediately after a successful sync, eroding trust in the sync indicator. The label is dead UI that actively misleads.
- **Fix sketch**: Lift `lastSyncedAt` from the shared `useOffline()` context (it already exposes `lastSyncedAt`) instead of fabricating a local `SyncState`, or persist a `lastSyncedAt` timestamp in `OfflinePersistence` and include it in the `onQueueChange` payload.

## 4. Auto-sync interval never starts when going offline→online while the tab stays mounted with the right deps
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: race condition / effect-dependency gap
- **File**: src/lib/offline/OfflineProvider.tsx:116-137
- **Scenario**: The 2-minute auto-sync interval effect depends on `syncState.pendingChanges`, but its body reads `syncState.pendingChanges` *inside* the interval callback (line 125). Because the effect re-runs on every `pendingChanges` change, each change tears down and recreates the interval, resetting the 2-minute timer to zero. A user who keeps making edits every <2 min (the common case while actively ranking) continually resets the timer, so the interval *never fires* — pending changes only sync via the immediate `processQueue()` in `saveSession`, defeating the interval safety net entirely.
- **Root cause**: Mixing a live-read of changing state into a `setInterval` effect whose deps include that same state causes perpetual timer resets. The interval was intended as a periodic backstop independent of edit cadence.
- **Impact**: The "every 2 minutes" backstop is effectively dead for active users; if the immediate `processQueue` in `saveSession` fails (see Finding 1), nothing periodically retries until a visibilitychange or manual sync. Degrades the durability guarantee.
- **Fix sketch**: Read pending count via a ref or pull it fresh inside the callback from `getOfflinePersistence().getPendingCount()`, and drop `syncState.pendingChanges`/`isSyncing` from the dep array so the interval runs on a stable cadence.

## 5. Service worker `controllerchange` triggers an unconditional `window.location.reload()` that can discard unsaved edits
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: data-loss vector / SW timing
- **File**: src/lib/offline/useServiceWorker.ts:93-96
- **Scenario**: A `controllerchange` listener is registered that calls `window.location.reload()` whenever a new SW takes control. When a user clicks "Update Now" in the OfflineProvider update banner, `skipWaiting` posts `SKIP_WAITING`; the new SW activates and fires `controllerchange`, reloading the page. The reload races the async `flushPendingSync`/`enqueueSessionUpdate` (IndexedDB writes are async and `beforeunload` cannot await them — see useUnsavedChangesGuard.ts:48-51 which explicitly notes "This won't actually prevent unload since it's async").
- **Root cause**: Unconditional reload on controller change with no coordination with the unsaved-changes guard, and the guard's own flush is fire-and-forget async that the reload does not wait for.
- **Impact**: Edits made in the seconds before an update is applied can be lost because the page reloads before the debounced (300ms) enqueue + async IndexedDB write completes. Also, the first-ever SW install can fire `controllerchange` and cause an unexpected reload on initial load for some browsers.
- **Fix sketch**: Guard the reload behind a flag (only reload after an explicit user-initiated update, and only once), and before reloading `await` a synchronous-as-possible flush (e.g. `forceSaveToOffline`) or delay the reload until pending IndexedDB writes resolve. Skip the reload entirely on the initial controller acquisition.
