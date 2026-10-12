/**
 * /api/studio/save-items — a failed write must not look like a partial success.
 *
 * Before 2026-09-05 an upsert error produced HTTP 200 with
 * `{ saved: 0, skipped: N, errors: 1 }`: nothing was skipped (the statement
 * failed), the status said success, and the caller's next step (publishing a
 * list whose items were never persisted) proceeded on a green light.
 *
 * Negative control (recorded 2026-09-05, before the fix): the failure case
 * returned 200 — 1 of 2 tests RED.
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = { upsert: { data: null as unknown, error: null as unknown } };

const mockClient = {
  from: () => ({
    upsert: () => ({
      select: async () => state.upsert,
    }),
  }),
};

vi.mock('@/lib/supabase/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase/server')>();
  return { ...actual, createClient: async () => mockClient };
});

import { POST } from './route';

const items = [
  { name: 'A', category: 'Movies' },
  { name: 'B', category: 'Movies' },
];
const post = () =>
  POST(
    new NextRequest('http://localhost/api/studio/save-items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items }),
    })
  );

describe('save-items outcome shape', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('reports a failed upsert as a failure (5xx), never as skipped rows', async () => {
    state.upsert = { data: null, error: { message: 'relation "items" does not exist', code: '42P01' } };
    const res = await post();
    expect(res.status).toBeGreaterThanOrEqual(500);
    const body = await res.json();
    expect(body).not.toHaveProperty('skipped', items.length);
    expect(body.code).toBe('DATABASE_ERROR');
  });

  it('reports counts on success', async () => {
    state.upsert = { data: [{ id: '1' }], error: null };
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ saved: 1, skipped: 1, errors: 0, total: 2 });
  });
});
