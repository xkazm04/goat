// @vitest-environment jsdom
/**
 * useSupabaseAuth — the auth session is ONE subscription per mounted hook, and
 * its identity is the client, not the caller's callback.
 *
 * Registry: client-state / effect-identity-and-latched-callbacks. A caller-
 * supplied `onAuthStateChange` is re-created on every render of the caller, so
 * listing it as an effect dependency turns every render into a teardown +
 * resubscribe. Here that was worse than churn: the teardown flipped
 * `mountedRef` to false and nothing ever flipped it back, so after the first
 * re-render every later auth event was silently dropped — the hook froze on
 * whatever it last saw.
 *
 * NEGATIVE CONTROL (recorded 2026-09-05, scan-sweep auth-and-data-layer):
 * against the pre-fix hook — deps `[getClient, onAuthStateChange]`, no re-arm —
 * all three cases failed: "subscribes once per mount" saw 4 subscriptions
 * across mount + 2 re-renders; "keeps receiving auth events" saw user stay
 * null after SIGNED_IN; "tears down exactly once" saw 2 unsubscribes.
 */
import React, { act, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSupabaseAuth, type UseSupabaseAuthReturn } from './index';

import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

type Listener = (event: AuthChangeEvent, session: Session | null) => void;

const fake = vi.hoisted(() => ({
  listeners: [] as Listener[],
  subscribeCalls: 0,
  unsubscribeCalls: 0,
  session: null as Session | null,
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: fake.session }, error: null }),
      onAuthStateChange: (cb: Listener) => {
        fake.subscribeCalls += 1;
        fake.listeners.push(cb);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                fake.unsubscribeCalls += 1;
                fake.listeners = fake.listeners.filter((l) => l !== cb);
              },
            },
          },
        };
      },
    },
  }),
}));

const seen: { auth: UseSupabaseAuthReturn | null; callbackEvents: AuthChangeEvent[] } = {
  auth: null,
  callbackEvents: [],
};
let bumpRender: () => void = () => {};

/**
 * A caller that does what real callers do: passes an INLINE callback (new
 * identity every render) and re-renders for reasons unrelated to auth.
 */
function Caller() {
  const [tick, setTick] = useState(0);
  const auth = useSupabaseAuth({
    onAuthStateChange: (event) => {
      seen.callbackEvents.push(event);
    },
  });
  // Publish to the test from an effect, not from render (react-hooks/globals).
  useEffect(() => {
    bumpRender = () => setTick((t) => t + 1);
    seen.auth = auth;
  });
  return <span data-tick={tick} />;
}

const fakeSession = (id: string): Session =>
  ({ user: { id }, access_token: 't', refresh_token: 'r', expires_in: 3600, token_type: 'bearer' }) as unknown as Session;

async function flush() {
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  fake.listeners = [];
  fake.subscribeCalls = 0;
  fake.unsubscribeCalls = 0;
  fake.session = null;
  seen.auth = null;
  seen.callbackEvents = [];
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
});

describe('useSupabaseAuth session identity', () => {
  it('subscribes once per mount, not once per render', async () => {
    await act(async () => {
      root.render(<Caller />);
    });
    await flush();
    await act(async () => bumpRender());
    await act(async () => bumpRender());
    await flush();

    expect(fake.subscribeCalls).toBe(1);
    expect(fake.unsubscribeCalls).toBe(0);
  });

  it('keeps receiving auth events after the caller re-renders with a fresh callback', async () => {
    await act(async () => {
      root.render(<Caller />);
    });
    await flush();
    expect(seen.auth?.isLoading).toBe(false);
    expect(seen.auth?.user).toBeNull();

    // An unrelated re-render mints a new inline callback.
    await act(async () => bumpRender());
    await flush();

    // The auth backend now reports a sign-in.
    await act(async () => {
      for (const l of [...fake.listeners]) l('SIGNED_IN', fakeSession('u-1'));
    });
    await flush();

    expect(seen.auth?.user?.id).toBe('u-1');
    expect(seen.auth?.isAuthenticated).toBe(true);
    // …and the LATEST callback saw it — latched, not frozen at mount time.
    expect(seen.callbackEvents).toEqual(['SIGNED_IN']);
  });

  it('tears the subscription down exactly once on unmount', async () => {
    await act(async () => {
      root.render(<Caller />);
    });
    await flush();
    await act(async () => {
      root.unmount();
    });
    expect(fake.unsubscribeCalls).toBe(1);
    expect(fake.listeners).toHaveLength(0);
    // afterEach unmounts again; make that a no-op on an already-unmounted root.
    root = createRoot(document.createElement('div'));
  });
});
