/**
 * Lazy Store Accessor
 *
 * Safely access Zustand stores that may not be fully initialized yet.
 * This prevents race conditions when stores dynamically require each other
 * to avoid circular dependencies.
 *
 * The accessor caches the store reference after successful initialization
 * and provides retry logic for early access attempts.
 */

type StoreImporter<T> = () => T;

interface LazyStoreAccessorOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Delay between retries in ms (default: 10) */
  retryDelay?: number;
  /** Store name for logging */
  storeName: string;
}

/**
 * Creates a lazy accessor for a Zustand store.
 *
 * @param importer - Function that imports/requires the store
 * @param options - Configuration options
 * @returns Object with getState() method that safely accesses the store
 *
 * @example
 * const backlogStoreAccessor = createLazyStoreAccessor(
 *   () => require('@/stores/backlog-store').useBacklogStore,
 *   { storeName: 'backlog-store' }
 * );
 *
 * // Later, when needed:
 * const state = backlogStoreAccessor.getState();
 */
export function createLazyStoreAccessor<T extends { getState: () => any }>(
  importer: StoreImporter<T>,
  options: LazyStoreAccessorOptions
): { getState: () => ReturnType<T['getState']> | null; isReady: () => boolean } {
  const { maxRetries = 3, retryDelay = 10, storeName } = options;

  let cachedStore: T | null = null;
  let initializationFailed = false;
  let failureReason: string | null = null;

  const tryGetStore = (): T | null => {
    // Return cached store if available
    if (cachedStore) {
      return cachedStore;
    }

    // Don't retry if we've permanently failed
    if (initializationFailed) {
      return null;
    }

    try {
      const store = importer();

      // Validate the store has getState method
      if (store && typeof store.getState === 'function') {
        // Additional validation: try to call getState to ensure it works
        const state = store.getState();
        if (state !== undefined) {
          cachedStore = store;
          console.log(`✅ LazyStoreAccessor: ${storeName} initialized successfully`);
          return store;
        }
      }

      console.warn(`⚠️ LazyStoreAccessor: ${storeName} returned invalid store object`);
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ LazyStoreAccessor: Failed to access ${storeName}: ${errorMessage}`);
      return null;
    }
  };

  const getStateWithRetry = (): ReturnType<T['getState']> | null => {
    // Fast path: cached store available
    if (cachedStore) {
      return cachedStore.getState();
    }

    // Try to get the store with retries
    let attempts = 0;

    while (attempts < maxRetries) {
      const store = tryGetStore();

      if (store) {
        return store.getState();
      }

      attempts++;

      if (attempts < maxRetries) {
        // Synchronous delay is acceptable here since this only happens
        // during initialization race conditions (very rare)
        const start = Date.now();
        while (Date.now() - start < retryDelay) {
          // Busy wait - this is intentional for synchronous retry
        }
      }
    }

    // All retries exhausted
    initializationFailed = true;
    failureReason = `Failed to initialize ${storeName} after ${maxRetries} attempts`;
    console.error(`❌ LazyStoreAccessor: ${failureReason}`);

    return null;
  };

  return {
    getState: getStateWithRetry,
    isReady: () => cachedStore !== null,
  };
}
