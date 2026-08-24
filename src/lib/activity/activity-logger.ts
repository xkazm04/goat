/**
 * Activity Logger - Logs ranking events to the server
 *
 * Batches activity events and sends them asynchronously to avoid
 * blocking grid operations. Events are queued and flushed periodically.
 */

type ActivityAction = 'assign' | 'move' | 'swap' | 'remove' | 'rank_change';

interface ActivityPayload {
  itemId: string;
  action: ActivityAction;
  listId?: string;
  listTitle?: string;
  positionBefore?: number | null;
  positionAfter?: number | null;
  metadata?: Record<string, unknown>;
}

const FLUSH_INTERVAL = 2000; // 2 seconds
const MAX_QUEUE_SIZE = 20;

let queue: ActivityPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, FLUSH_INTERVAL);
}

async function flush() {
  flushTimer = null;
  if (queue.length === 0) return;

  const batch = queue.splice(0, MAX_QUEUE_SIZE);

  // Send each event (could be batched into a single endpoint in the future)
  await Promise.allSettled(
    batch.map(event =>
      fetch(`/api/items/${event.itemId}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: event.action,
          list_id: event.listId,
          list_title: event.listTitle,
          position_before: event.positionBefore,
          position_after: event.positionAfter,
          metadata: event.metadata,
        }),
      }).catch(() => {
        // Silently fail - activity logging is non-critical
      })
    )
  );

  // If more events accumulated during flush, schedule another
  if (queue.length > 0) {
    scheduleFlush();
  }
}

/**
 * Log a ranking activity event. Non-blocking, queued.
 */
export function logActivity(payload: ActivityPayload): void {
  queue.push(payload);

  if (queue.length >= MAX_QUEUE_SIZE) {
    flush();
  } else {
    scheduleFlush();
  }
}

/**
 * Force flush all pending activity events.
 * Call this before page unload or session end.
 */
export function flushActivities(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  flush();
}
