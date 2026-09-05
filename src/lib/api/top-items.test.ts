import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from './client';
import { topItemsApi, unwrapItems, type TopItem } from './top-items';

/**
 * GET /api/top/items returns the server 'paginated' shape
 * ({ items, total, limit, offset, has_more } — API_RESPONSE_CONTRACTS in
 * client.ts). topItemsApi had typed it as `TopItem[]` and read `.length` off
 * the object, so the Match "add custom item" search reported not-found for
 * every query.
 *
 * Negative control (2026-09-05): with `unwrapItems` replaced by the identity
 * (the old behaviour), 3 of 6 cases fail — the paginated cases receive
 * `{ items: [...] }` with no length. 3 red / 3 green.
 */

vi.mock('./client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const item = (id: string): TopItem => ({
  id,
  name: `Item ${id}`,
  category: 'games',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const paginated = (items: TopItem[]) => ({
  items,
  total: items.length,
  limit: 50,
  offset: 0,
  has_more: false,
});

describe('unwrapItems', () => {
  it('accepts the paginated envelope the route actually returns', () => {
    expect(unwrapItems(paginated([item('a'), item('b')]))).toHaveLength(2);
  });

  it('accepts a raw array (the shape the old type promised)', () => {
    expect(unwrapItems([item('a')])).toHaveLength(1);
  });

  it('returns an empty list for anything else rather than an object', () => {
    expect(unwrapItems(undefined)).toEqual([]);
    expect(unwrapItems({ total: 3 })).toEqual([]);
    expect(unwrapItems('nope')).toEqual([]);
  });
});

describe('topItemsApi.searchItems', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it('returns the items array when the server answers paginated', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce(paginated([item('a'), item('b'), item('c')]));

    const results = await topItemsApi.searchItems({ category: 'games', search: 'zel', limit: 5 });

    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('still works if the server ever answers with a raw array', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce([item('x')]);

    const results = await topItemsApi.searchItems({ search: 'x' });

    expect(results).toHaveLength(1);
  });

  it('passes the caller params through to the client unchanged', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce(paginated([]));
    const params = { category: 'games', subcategory: 'rpg', search: 'q', limit: 5 };

    await topItemsApi.searchItems(params);

    expect(apiClient.get).toHaveBeenCalledWith('/top/items', params);
  });
});
