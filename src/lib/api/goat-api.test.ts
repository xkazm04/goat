import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from './client';
import { canonicalParamsKey, goatApi } from './goat-api';

/**
 * GET coalescing in goat-api keys an in-flight request by
 * `${method}:${endpoint}:${params}`. The params half was `JSON.stringify`,
 * which preserves insertion order — so two callers asking the same question
 * with their fields in a different order got two keys and two network calls,
 * defeating the dedup exactly where two components mount at once.
 *
 * Negative control (2026-09-05): with `canonicalParamsKey` swapped back to
 * `JSON.stringify`, the "same params, different order" case fails (apiClient
 * called 2x) and the two canonicalParamsKey equality cases fail. 3 red / 3 green.
 */

vi.mock('./client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
});

describe('canonicalParamsKey', () => {
  it('is independent of key insertion order', () => {
    expect(canonicalParamsKey({ category: 'games', subcategory: 'rpg' })).toBe(
      canonicalParamsKey({ subcategory: 'rpg', category: 'games' }),
    );
  });

  it('sorts nested objects too and ignores undefined values', () => {
    expect(canonicalParamsKey({ b: { y: 1, x: 2 }, a: undefined })).toBe(
      canonicalParamsKey({ b: { x: 2, y: 1 } }),
    );
  });

  it('still distinguishes different values', () => {
    expect(canonicalParamsKey({ limit: 5 })).not.toBe(canonicalParamsKey({ limit: 6 }));
    expect(canonicalParamsKey(undefined)).toBe('');
  });
});

describe('goatApi GET coalescing', () => {
  it('two callers with the same params in a different order share one network call', async () => {
    const gate = deferred<unknown[]>();
    vi.mocked(apiClient.get).mockReturnValue(gate.promise as Promise<never>);

    const a = goatApi.lists.search({ category: 'games', subcategory: 'rpg' });
    const b = goatApi.lists.search({ subcategory: 'rpg', category: 'games' });
    expect(apiClient.get).toHaveBeenCalledTimes(1);

    gate.resolve([{ id: 'l1' }]);
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra).toBe(rb);
  });

  it('different params still issue separate calls', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);

    await Promise.all([
      goatApi.lists.search({ category: 'games' }),
      goatApi.lists.search({ category: 'movies' }),
    ]);

    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });

  it('a settled request is not reused for a later identical one', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);

    await goatApi.lists.search({ category: 'games' });
    await goatApi.lists.search({ category: 'games' });

    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });
});
