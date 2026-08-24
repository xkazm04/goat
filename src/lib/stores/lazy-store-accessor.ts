/**
 * Lazy Store Accessor
 *
 * Safely access Zustand stores that may not be fully initialized yet.
 * This is the disciplined form of the deferred `require()` used to break a
 * store-initialization cycle: the edge still exists (see the declared topology
 * in src/stores/registry.ts), it has only moved from module-evaluation time to
 * call time.
 *
 * The rules that make it more than a deferred import with extra steps:
 *
 *  - Resolve at CALL time, and cache only success. An accessor that resolved
 *    eagerly would have re-created the edge it exists to defer; one that cached
 *    a failure would turn a startup race into a permanent outage.
 *  - A bounded retry must not block. Retries are spread across CALLS, never
 *    spun inside one. The importer is a synchronous `require()`, so re-trying it
 *    inside a busy-wait cannot succeed anyway — nothing else can run on the
 *    thread to finish loading the module — it can only freeze the frame the
 *    interface is drawn from. If the caller cannot yield, the accessor answers
 *    "not ready" and the caller re-asks on the next tick.
 *  - "Not ready" and "permanently failed" are different answers. Collapsing
 *    them into one absent value makes every call site treat a real
 *    misconfiguration as a transient blip. `getState()` keeps returning `null`
 *    for both so existing null-checks stay correct, but `getStatus()` gives a
 *    caller something it can actually branch on.
 *  - The failure latch names what clears it: `reset()`. A latch with no reset
 *    poisons the accessor for the life of the process.
 */

type StoreImporter<T> = () => T;

interface LazyStoreAccessorOptions {
  /** Maximum resolution attempts before the accessor latches permanent failure (default: 3) */
  maxRetries?: number;
  /**
   * Reserved for callers that schedule their own re-ask cadence. The accessor
   * itself never sleeps — see the module docblock.
   */
  retryDelay?: number;
  /** Store name for logging */
  storeName: string;
}

/** What the accessor knows about its target right now. */
export type LazyStoreStatus =
  /** Resolved and cached; getState() returns real state. */
  | { state: 'ready' }
  /** Not resolvable yet. Ask again on a later tick — this is not an error. */
  | { state: 'not-ready'; attempts: number; remaining: number }
  /** Will not resolve. Surface it; retrying is pointless until reset(). */
  | { state: 'failed'; reason: string };

export interface LazyStoreAccessor<T extends { getState: () => any }> {
  /** Current state, or null when not ready OR permanently failed. Use getStatus() to tell them apart. */
  getState: () => ReturnType<T['getState']> | null;
  /** True once the target has resolved and been cached. */
  isReady: () => boolean;
  /** Discriminated answer: ready / not-ready / failed. */
  getStatus: () => LazyStoreStatus;
  /** Clear a permanent-failure latch and the attempt count, so resolution can be retried. */
  reset: () => void;
}

/**
 * Creates a lazy accessor for a Zustand store.
 *
 * @param importer - Function that imports/requires the store
 * @param options - Configuration options
 *
 * @example
 * const backlogStoreAccessor = createLazyStoreAccessor(
 *   () => require('@/stores/backlog-store').useBacklogStore,
 *   { storeName: 'backlog-store' }
 * );
 *
 * // Later, when needed:
 * const state = backlogStoreAccessor.getState();
 * if (!state && backlogStoreAccessor.getStatus().state === 'failed') {
 *   // real misconfiguration — surface it rather than re-asking forever
 * }
 */
export function createLazyStoreAccessor<T extends { getState: () => any }>(
  importer: StoreImporter<T>,
  options: LazyStoreAccessorOptions
): LazyStoreAccessor<T> {
  const { maxRetries = 3, storeName } = options;
  const isDev = process.env.NODE_ENV === 'development';

  let cachedStore: T | null = null;
  let attempts = 0;
  let failureReason: string | null = null;

  /** One non-blocking resolution attempt. Returns the store, or null. */
  const tryResolve = (): T | null => {
    try {
      const store = importer();

      if (store && typeof store.getState === 'function') {
        // Calling getState() proves the store is constructed, not merely imported.
        const state = store.getState();
        if (state !== undefined) {
          cachedStore = store;
          if (isDev) {
            console.debug(`LazyStoreAccessor: ${storeName} resolved after ${attempts + 1} attempt(s)`);
          }
          return store;
        }
      }
      return null;
    } catch {
      // Swallowed deliberately: during startup a not-yet-evaluated module throws,
      // and that is the ordinary "not ready" case, not an error worth a log line
      // on every call. A genuine failure surfaces once, below, when the latch trips.
      return null;
    }
  };

  const getState = (): ReturnType<T['getState']> | null => {
    if (cachedStore) return cachedStore.getState();
    if (failureReason !== null) return null;

    attempts++;
    const store = tryResolve();
    if (store) return store.getState();

    if (attempts >= maxRetries) {
      failureReason = `Failed to resolve ${storeName} after ${attempts} attempts`;
      console.error(`LazyStoreAccessor: ${failureReason}`);
    }
    return null;
  };

  const getStatus = (): LazyStoreStatus => {
    if (cachedStore) return { state: 'ready' };
    if (failureReason !== null) return { state: 'failed', reason: failureReason };
    return { state: 'not-ready', attempts, remaining: Math.max(0, maxRetries - attempts) };
  };

  const reset = (): void => {
    cachedStore = null;
    attempts = 0;
    failureReason = null;
  };

  return {
    getState,
    isReady: () => cachedStore !== null,
    getStatus,
    reset,
  };
}
