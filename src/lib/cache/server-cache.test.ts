import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cachedFetch,
  clearServerCache,
  getInFlightCount,
  invalidateCache,
  invalidateCacheByPrefix,
} from './server-cache';

/**
 * The server cache fronts Supabase for reference data (groups, collections,
 * bulk items). Its whole purpose is to keep N requests from becoming N
 * database round-trips — yet on a cold or just-expired key every concurrent
 * miss ran its own fetcher. This pins single-flight per key (registry:
 * client-fetch-cache / in-flight-dedup).
 *
 * Negative control (2026-09-05): against the previous `cachedFetch` (no
 * in-flight map), the two "concurrent" cases fail — the fetcher runs 10 times
 * and 3 times respectively. 2 red / 5 green.
 */

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  clearServerCache();
});

describe('cachedFetch single-flight', () => {
  it('runs the fetcher once for 10 concurrent misses on one cold key', async () => {
    const gate = deferred<string>();
    const fetcher = vi.fn(() => gate.promise);

    const calls = Array.from({ length: 10 }, () => cachedFetch('groups:movies', 60_000, fetcher));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(getInFlightCount()).toBe(1);

    gate.resolve('payload');
    const results = await Promise.all(calls);

    expect(results).toEqual(Array(10).fill('payload'));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(getInFlightCount()).toBe(0);
  });

  it('joiners share the first flight\'s failure and the next miss retries', async () => {
    const gate = deferred<string>();
    const fetcher = vi.fn(() => gate.promise);

    const a = cachedFetch('k', 60_000, fetcher);
    const b = cachedFetch('k', 60_000, fetcher);
    const c = cachedFetch('k', 60_000, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    gate.reject(new Error('db down'));
    await expect(a).rejects.toThrow('db down');
    await expect(b).rejects.toThrow('db down');
    await expect(c).rejects.toThrow('db down');

    // Nothing was cached and the slot was released: a fresh miss fetches again.
    const retry = vi.fn(async () => 'recovered');
    await expect(cachedFetch('k', 60_000, retry)).resolves.toBe('recovered');
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('serves a fresh entry without calling the fetcher', async () => {
    const fetcher = vi.fn(async () => 42);
    await cachedFetch('n', 60_000, fetcher);
    await cachedFetch('n', 60_000, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches once the TTL has elapsed', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn(async () => 'v');
      await cachedFetch('ttl', 1_000, fetcher);
      vi.advanceTimersByTime(1_001);
      await cachedFetch('ttl', 1_000, fetcher);
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('different keys do not share a flight', async () => {
    const fetcher = vi.fn(async () => 'x');
    await Promise.all([cachedFetch('a', 60_000, fetcher), cachedFetch('b', 60_000, fetcher)]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('invalidateCache / invalidateCacheByPrefix force the next call to fetch', async () => {
    const fetcher = vi.fn(async () => 'v');
    await cachedFetch('groups:a', 60_000, fetcher);
    await cachedFetch('groups:b', 60_000, fetcher);
    invalidateCache('groups:a');
    await cachedFetch('groups:a', 60_000, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(3);
    invalidateCacheByPrefix('groups:');
    await cachedFetch('groups:b', 60_000, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it('a settled flight does not linger in the in-flight map', async () => {
    await cachedFetch('done', 60_000, async () => 1);
    expect(getInFlightCount()).toBe(0);
  });
});
