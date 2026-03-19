/**
 * Server-side in-memory TTL cache for reference data.
 *
 * Intended for data that rarely changes (categories, groups, featured lists)
 * so we can avoid hitting Supabase on every request.
 *
 * The cache lives in the Node.js process memory and is automatically
 * invalidated when the server restarts or when the TTL expires.
 *
 * NOT suitable for user-specific data — only shared/public reference data.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/**
 * Fetch a value from cache or execute the fetcher and cache the result.
 *
 * @param key   Unique cache key (e.g. "groups:movies" or "featured-lists")
 * @param ttlMs Time-to-live in milliseconds (e.g. 5 * 60 * 1000 for 5 minutes)
 * @param fetcher Async function that produces the value on cache miss
 * @returns The cached or freshly-fetched value
 *
 * @example
 * const groups = await cachedFetch(
 *   `groups:${category}`,
 *   5 * 60 * 1000,
 *   () => supabase.from('item_groups').select('*').eq('category', category)
 * );
 */
export async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const existing = store.get(key) as CacheEntry<T> | undefined;

  if (existing && existing.expiresAt > now) {
    return existing.data;
  }

  const data = await fetcher();

  store.set(key, { data, expiresAt: now + ttlMs });

  return data;
}

/**
 * Invalidate a specific cache key.
 */
export function invalidateCache(key: string): void {
  store.delete(key);
}

/**
 * Invalidate all cache keys matching a prefix.
 * Useful for clearing all entries for a category, e.g. invalidateCacheByPrefix("groups:")
 */
export function invalidateCacheByPrefix(prefix: string): void {
  const keysToDelete: string[] = [];
  store.forEach((_, key) => {
    if (key.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => store.delete(key));
}

/**
 * Clear the entire server cache.
 */
export function clearServerCache(): void {
  store.clear();
}

// Periodic cleanup of expired entries to prevent memory leaks.
// Runs every 10 minutes.
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    const expired: string[] = [];
    store.forEach((entry, key) => {
      if (entry.expiresAt <= now) {
        expired.push(key);
      }
    });
    expired.forEach((key) => store.delete(key));
  }, 10 * 60 * 1000);
  // Prevent the timer from keeping the process alive during shutdown
  if (typeof timer === 'object' && timer && 'unref' in timer) {
    (timer as NodeJS.Timeout).unref();
  }
}
