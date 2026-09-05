/**
 * GET /api/blueprints — pagination parameters are bounded before they reach
 * PostgREST.
 *
 * Before 2026-09-05 `limit` and `offset` were `parseInt` with no bound:
 * `?limit=abc` produced `.range(0, NaN)` and `?limit=100000` asked for a hundred
 * thousand rows in one response. The v1 analytics routes were bounded the same
 * day (analytics-rankings-api round); this is the other pagination door.
 *
 * Negative control (recorded 2026-09-05, before the clamp): 3 of 4 tests RED.
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = { ranges: [] as [number, number][] };

function builder() {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  for (const m of ['select', 'eq', 'order', 'ilike', 'or', 'limit', 'insert', 'single']) b[m] = chain;
  b.range = (from: number, to: number) => {
    state.ranges.push([from, to]);
    return b;
  };
  b.then = (res: (r: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(res, rej);
  return b;
}

const mockClient = {
  auth: { getUser: async () => ({ data: { user: null } }) },
  from: () => builder(),
};

vi.mock('@/lib/supabase/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase/server')>();
  return { ...actual, createClient: async () => mockClient };
});

import { GET } from './route';

const get = (qs: string) => GET(new NextRequest(`http://localhost/api/blueprints${qs}`));

describe('blueprints pagination bounds', () => {
  beforeEach(() => {
    state.ranges = [];
  });

  it('defaults to the first 50', async () => {
    await get('');
    expect(state.ranges).toEqual([[0, 49]]);
  });

  it('a non-numeric limit falls back to the default instead of NaN', async () => {
    await get('?limit=abc&offset=xyz');
    expect(state.ranges).toEqual([[0, 49]]);
  });

  it('a limit above the ceiling is clamped to it', async () => {
    await get('?limit=100000');
    expect(state.ranges).toEqual([[0, 99]]);
  });

  it('a negative offset or limit is clamped to the floor', async () => {
    await get('?limit=-5&offset=-10');
    expect(state.ranges).toEqual([[0, 0]]);
  });
});
