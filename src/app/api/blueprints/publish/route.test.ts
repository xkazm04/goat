/**
 * /api/blueprints/publish — who may publish a list as a community template.
 *
 * Before 2026-09-05 the ownership check read
 * `if (user && listData.user_id && listData.user_id !== user.id)`, so a request
 * with NO session skipped it entirely: an anonymous caller could publish any
 * user's list as a community template under the author "Anonymous". Guest-owned
 * lists (`user_id` null) may still be published without a session — the guest
 * flow is real and unchanged.
 *
 * Negative control (recorded 2026-09-05, before the fix): the anonymous-vs-owned
 * case returned 201 — 1 of 3 tests RED.
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: unknown; error: unknown };

const state = {
  user: null as { id: string } | null,
  list: null as Record<string, unknown> | null,
  inserts: [] as unknown[],
};

function builder(table: string) {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  for (const m of ['select', 'eq', 'order', 'range', 'ilike', 'or', 'limit']) b[m] = chain;
  b.insert = (rows: unknown[]) => {
    state.inserts.push(...rows);
    return b;
  };
  const result = (): Result => {
    if (table === 'lists') return state.list ? { data: state.list, error: null } : { data: null, error: { code: 'PGRST116' } };
    if (table === 'blueprints' && state.inserts.length > 0) {
      const row = state.inserts[state.inserts.length - 1] as Record<string, unknown>;
      return { data: { ...row, created_at: 'now', updated_at: 'now' }, error: null };
    }
    return { data: null, error: null };
  };
  b.single = async () => result();
  b.maybeSingle = async () => ({ data: null, error: null });
  b.then = (res: (r: Result) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result()).then(res, rej);
  return b;
}

const mockClient = {
  auth: { getUser: async () => ({ data: { user: state.user } }) },
  from: (table: string) => builder(table),
};

vi.mock('@/lib/supabase/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase/server')>();
  return { ...actual, createClient: async () => mockClient };
});

import { POST } from './route';

const body = {
  listId: '22222222-2222-4222-8222-222222222222',
  title: 'Best Films',
  category: 'Movies',
  size: 10,
  items: [{ title: 'A' }],
};
const post = () =>
  POST(
    new NextRequest('http://localhost/api/blueprints/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  );

describe('publish ownership', () => {
  beforeEach(() => {
    state.user = null;
    state.inserts = [];
    state.list = { id: body.listId, title: 'Best Films', user_id: 'user-owner' };
  });

  it("an anonymous request cannot publish someone's owned list", async () => {
    const res = await post();
    expect(res.status).toBe(401);
    expect(state.inserts).toEqual([]);
  });

  it('the owner can publish their list', async () => {
    state.user = { id: 'user-owner' };
    const res = await post();
    expect(res.status).toBe(201);
    expect(state.inserts).toHaveLength(1);
  });

  it('a guest-owned list (no user_id) can still be published without a session', async () => {
    state.list = { id: body.listId, title: 'Best Films', user_id: null };
    const res = await post();
    expect(res.status).toBe(201);
  });
});
