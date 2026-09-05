// @vitest-environment jsdom
/**
 * useAuthUser — the guest→user merge and the auth backend's failure state.
 *
 * Two things this hook owes the person signing in:
 *
 * 1. When the merge of their guest data did NOT fully happen, they hear about
 *    it. `/api/auth/merge-guest` answers 200 with a per-table `results` map
 *    and reports partial failure INSIDE that body (`updated: false`); a client
 *    that only checks the transport status treats a merge that moved 0 of 3
 *    tables as success, then upgrades the local identity so the guest rows are
 *    orphaned without a word. (observability-auditor; parity between what the
 *    route reports and what its only caller reads)
 *
 * 2. When the auth backend itself failed (bad env, network), the surface can
 *    tell that apart from "this person is a guest". Before, `useSupabaseAuth`'s
 *    `error` was dropped on the floor here, so both states rendered identically
 *    as an anonymous visitor. (state-coverage)
 *
 * NEGATIVE CONTROL (recorded 2026-09-05, scan-sweep auth-and-data-layer):
 * against the pre-fix hook, "surfaces a 200 whose body reports a table that
 * did not move" and "surfaces a non-2xx merge response" each saw 0 error
 * notifications.
 */
import React, { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthUser } from './use-auth-user';

const fake = vi.hoisted(() => ({
  auth: {
    user: null as null | { id: string },
    session: null as null | { access_token: string },
    isLoading: false,
    error: null as null | Error,
  },
  temp: { tempUserId: 'guest-1', isLoaded: true, isTempUser: true },
  upgraded: [] as string[],
  notifications: [] as Array<{ error: unknown; source?: string }>,
}));

vi.mock('@/hooks/supabase-auth', () => ({
  useSupabaseAuth: () => ({
    ...fake.auth,
    signInWithOAuth: async () => {},
    signOut: async () => {},
  }),
}));
vi.mock('@/hooks/use-temp-user', () => ({
  useTempUser: () => ({
    ...fake.temp,
    migrateTempUserToReal: (id: string) => {
      fake.upgraded.push(id);
      return fake.temp.tempUserId;
    },
  }),
}));
vi.mock('@/lib/errors/error-notification-store', () => ({
  emitErrorNotification: (error: unknown, options?: { source?: string }) => {
    fake.notifications.push({ error, source: options?.source });
    return 'n';
  },
}));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const seen: { value: ReturnType<typeof useAuthUser> | null } = { value: null };

function Caller() {
  const value = useAuthUser();
  useEffect(() => {
    seen.value = value;
  });
  return null;
}

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

function respond(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  fake.auth = { user: null, session: null, isLoading: false, error: null };
  fake.temp = { tempUserId: 'guest-1', isLoaded: true, isTempUser: true };
  fake.upgraded = [];
  fake.notifications = [];
  seen.value = null;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function mountSignedIn() {
  fake.auth = { user: { id: 'user-9' }, session: { access_token: 't' }, isLoading: false, error: null };
  await act(async () => {
    root.render(<Caller />);
  });
  await flush();
}

describe('useAuthUser guest merge', () => {
  it('stays silent when every table moved', async () => {
    vi.stubGlobal(
      'fetch',
      respond(200, {
        merged: true,
        results: { lists: { updated: true }, shared_rankings: { updated: true }, list_collections: { updated: true } },
      }),
    );
    await mountSignedIn();
    expect(fake.upgraded).toEqual(['user-9']);
    expect(fake.notifications).toHaveLength(0);
  });

  it('surfaces a 200 whose body reports a table that did not move', async () => {
    vi.stubGlobal(
      'fetch',
      respond(200, {
        merged: true,
        results: {
          lists: { updated: false, error: 'permission denied' },
          shared_rankings: { updated: true },
          list_collections: { updated: false, error: 'permission denied' },
        },
      }),
    );
    await mountSignedIn();
    expect(fake.notifications).toHaveLength(1);
    expect(fake.notifications[0].source).toBe('guest-merge');
    const message = String((fake.notifications[0].error as Error).message);
    expect(message).toContain('lists');
    expect(message).toContain('list_collections');
    expect(message).not.toContain('shared_rankings');
  });

  it('surfaces a non-2xx merge response', async () => {
    vi.stubGlobal('fetch', respond(500, { error: 'Failed to merge guest data' }));
    await mountSignedIn();
    expect(fake.notifications).toHaveLength(1);
    expect(String((fake.notifications[0].error as Error).message)).toContain('500');
  });

  it('surfaces a merge request that never reached the server', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    await mountSignedIn();
    expect(fake.notifications).toHaveLength(1);
    // The identity upgrade still happens — the ledger's open finding on that
    // ordering (29be9b16174e) is a separate decision; this test pins only that
    // the failure is no longer silent.
    expect(fake.upgraded).toEqual(['user-9']);
  });
});
