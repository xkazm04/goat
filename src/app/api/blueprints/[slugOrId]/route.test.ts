/**
 * /api/blueprints/[slugOrId] — who may change or remove a blueprint.
 *
 * The database does not decide this: migration 20260315000002 replaced the
 * owner-scoped policies with `"Anyone can update blueprints" USING (true)` and
 * `"Anyone can delete blueprints" USING (true)`, so the route is the only door.
 * Before 2026-09-05 PATCH and DELETE read the row, refused only `is_system`, and
 * wrote — any anonymous caller could retitle or delete any community template,
 * and could set `isFeatured: true` on their own.
 *
 * Negative control (recorded 2026-09-05, before the guard): the three refusal
 * cases below returned 200 — 3 of 5 tests RED.
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: unknown; error: unknown };

const state = {
  user: null as { id: string } | null,
  row: null as Record<string, unknown> | null,
  updates: [] as Record<string, unknown>[],
  deletes: 0,
};

function builder(result: () => Result) {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  for (const m of ['select', 'eq', 'order', 'range', 'ilike', 'or', 'limit', 'insert']) b[m] = chain;
  b.update = (payload: Record<string, unknown>) => {
    state.updates.push(payload);
    return b;
  };
  b.delete = () => {
    state.deletes += 1;
    return b;
  };
  b.single = async () => result();
  b.maybeSingle = async () => result();
  b.then = (res: (r: Result) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(result()).then(res, rej);
  return b;
}

const mockClient = {
  auth: { getUser: async () => ({ data: { user: state.user } }) },
  from: () =>
    builder(() =>
      state.row ? { data: state.row, error: null } : { data: null, error: { code: 'PGRST116' } }
    ),
};

vi.mock('@/lib/supabase/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase/server')>();
  return { ...actual, createClient: async () => mockClient };
});

import { DELETE, PATCH } from './route';

const id = '11111111-1111-4111-8111-111111111111';
const ctx = { params: Promise.resolve({ slugOrId: id }) };
const patch = (body: unknown) =>
  PATCH(
    new NextRequest(`http://localhost/api/blueprints/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    ctx
  );
const del = () => DELETE(new NextRequest(`http://localhost/api/blueprints/${id}`, { method: 'DELETE' }), ctx);

const ownerRow = () => ({
  id,
  slug: 'my-template',
  title: 'Mine',
  category: 'Movies',
  size: 10,
  time_period: 'all-time',
  color_primary: '#000',
  color_secondary: '#111',
  color_accent: '#222',
  author: 'me',
  author_id: 'user-owner',
  is_system: false,
  is_featured: false,
  usage_count: 0,
  clone_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

describe('blueprint mutation authorization', () => {
  beforeEach(() => {
    state.user = null;
    state.row = ownerRow();
    state.updates = [];
    state.deletes = 0;
  });

  it('PATCH without a session is 401 and writes nothing', async () => {
    const res = await patch({ title: 'Hijacked' });
    expect(res.status).toBe(401);
    expect(state.updates).toEqual([]);
  });

  it("PATCH by someone else's session is 403 and writes nothing", async () => {
    state.user = { id: 'user-other' };
    const res = await patch({ title: 'Hijacked' });
    expect(res.status).toBe(403);
    expect(state.updates).toEqual([]);
  });

  it('DELETE by a non-owner is 403 and deletes nothing', async () => {
    state.user = { id: 'user-other' };
    const res = await del();
    expect(res.status).toBe(403);
    expect(state.deletes).toBe(0);
  });

  it('PATCH by the owner updates, but cannot set the server-owned featured flag', async () => {
    state.user = { id: 'user-owner' };
    const res = await patch({ title: 'Renamed', isFeatured: true });
    expect(res.status).toBe(200);
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0]).toMatchObject({ title: 'Renamed' });
    expect(state.updates[0]).not.toHaveProperty('is_featured');
  });

  it('DELETE by the owner deletes', async () => {
    state.user = { id: 'user-owner' };
    const res = await del();
    expect(res.status).toBe(200);
    expect(state.deletes).toBe(1);
  });
});
