import { BacklogState, FailedChange, PendingChange } from './types';
import { backlogLogger } from '@/lib/logger';
import { getSyncQueue } from '@/lib/offline/SyncQueue';

// Type for immer-compatible set function
type ImmerSet = (fn: (state: BacklogState) => void) => void;

const MAX_RETRY_ATTEMPTS = 3;

export const createOfflineActions = (
  set: ImmerSet,
  get: () => BacklogState
) => ({
  // Offline mode management
  setOfflineMode: (isOffline: boolean) => {
    const currentOfflineMode = get().isOfflineMode;

    // Only update if the status has changed
    if (currentOfflineMode !== isOffline) {
      backlogLogger.debug(`Offline mode ${isOffline ? 'enabled' : 'disabled'}`);

      set(state => {
        state.isOfflineMode = isOffline;
      });

      // If coming back online, process pending changes
      if (!isOffline && get().pendingChanges.length > 0) {
        get().processPendingChanges();
      }
    }
  },

  processPendingChanges: async () => {
    const state = get();

    if (state.syncDiagnostics.isSyncing) {
      backlogLogger.debug(`Sync already in progress, skipping reentrant call`);
      return;
    }

    if (state.isOfflineMode || state.pendingChanges.length === 0) {
      backlogLogger.debug(`No pending changes to process`);
      return;
    }

    set(s => { s.syncDiagnostics.isSyncing = true; });

    backlogLogger.debug(`Processing ${state.pendingChanges.length} pending changes`);

    // Sort changes by timestamp (oldest first)
    const sortedChanges = [...state.pendingChanges].sort((a, b) => a.timestamp - b.timestamp);

    const succeeded: PendingChange[] = [];
    const retryable: PendingChange[] = [];
    const deadLettered: FailedChange[] = [];

    const syncQueue = getSyncQueue();

    // Process in sequence
    for (const change of sortedChanges) {
      const attempts = (change.attempts ?? 0) + 1;
      try {
        // Validate change has required data
        const hasValidData =
          (change.type === 'add' && change.item) ||
          (change.type === 'remove' && change.itemId) ||
          (change.type === 'update' && change.itemId && change.item);

        if (!hasValidData) {
          backlogLogger.warn(`Skipping invalid pending change: ${JSON.stringify(change)}`);
          succeeded.push(change);
          continue;
        }

        // Enqueue into the SyncQueue which handles retry, persistence,
        // and routing through /api/sync with proper error handling
        await syncQueue.enqueue(
          'UPDATE_BACKLOG',
          change.groupId,
          'backlog',
          {
            changeType: change.type,
            groupId: change.groupId,
            itemId: change.itemId ?? change.item?.id,
            item: change.item,
          },
          1 // normal priority
        );

        backlogLogger.debug(
          `Enqueued ${change.type} for item ${change.itemId || change.item?.id} in group ${change.groupId}`
        );

        succeeded.push(change);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        backlogLogger.error(`Failed to enqueue change (attempt ${attempts}): ${JSON.stringify(change)}`, error);

        if (attempts >= MAX_RETRY_ATTEMPTS) {
          deadLettered.push({
            change: { ...change, attempts, lastError: errorMsg },
            error: errorMsg,
            failedAt: Date.now(),
            attempts,
          });
        } else {
          retryable.push({ ...change, attempts, lastError: errorMsg });
        }
      }
    }

    set(s => {
      // Keep only retryable changes in the queue
      s.pendingChanges = retryable;

      // Append dead-lettered changes to diagnostics
      if (deadLettered.length > 0) {
        s.syncDiagnostics.failedChanges.push(...deadLettered);
      }

      // Update sync timestamp if anything succeeded
      if (succeeded.length > 0) {
        s.syncDiagnostics.lastSuccessfulSync = Date.now();
      }

      // Recalculate risk
      s.syncDiagnostics.totalQueued = s.pendingChanges.length;
      s.syncDiagnostics.dataLossRisk = calculateDataLossRisk(s);
      s.syncDiagnostics.isSyncing = false;
    });

    // Trigger the SyncQueue to process enqueued operations through /api/sync
    if (succeeded.length > 0) {
      syncQueue.processQueue().catch(err => {
        backlogLogger.error('SyncQueue processing failed after enqueue', err);
      });
    }

    backlogLogger.info(
      `Sync complete: ${succeeded.length} enqueued, ${retryable.length} retryable, ${deadLettered.length} dead-lettered`
    );
  },
});

/** Calculate data loss risk based on queue state */
function calculateDataLossRisk(
  state: Pick<BacklogState, 'pendingChanges' | 'syncDiagnostics'>
): 'none' | 'low' | 'medium' | 'high' {
  const queueSize = state.pendingChanges.length;
  const failedCount = state.syncDiagnostics.failedChanges.length;

  if (queueSize === 0 && failedCount === 0) return 'none';
  if (failedCount > 0) return 'high';

  // Check age of oldest queued change
  if (queueSize > 0) {
    const oldest = state.pendingChanges.reduce(
      (min, c) => Math.min(min, c.timestamp),
      Infinity
    );
    const ageMinutes = (Date.now() - oldest) / 60_000;
    if (ageMinutes > 30 || queueSize > 10) return 'high';
    if (ageMinutes > 10 || queueSize > 5) return 'medium';
    return 'low';
  }

  return 'none';
}

export type OfflineActions = ReturnType<typeof createOfflineActions>;
