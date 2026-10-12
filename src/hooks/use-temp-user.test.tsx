// @vitest-environment jsdom
/**
 * useTempUser — the guest identity's storage contract and the stability of
 * the upgrade function it hands to useAuthUser.
 *
 * `migrateTempUserToReal` is listed in useAuthUser's merge effect dependency
 * array. A function re-created on every render re-runs that effect on every
 * render of every auth-aware surface; the effect's own guards make that
 * harmless, but harmless-by-guard is one edit away from a merge loop. Registry:
 * client-state / effect-identity-and-latched-callbacks — a value in a
 * dependency list is a claim that its change should restart the session.
 *
 * NEGATIVE CONTROL (recorded 2026-09-05, scan-sweep auth-and-data-layer):
 * against the pre-fix hook, "hands out one upgrade function per mount" failed —
 * mount + 2 re-renders produced 4 distinct function identities.
 */
import React, { act, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useTempUser } from './use-temp-user';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const seen: { values: ReturnType<typeof useTempUser>[] } = { values: [] };
let bumpRender: () => void = () => {};

function Caller() {
  const [, setTick] = useState(0);
  const value = useTempUser();
  useEffect(() => {
    bumpRender = () => setTick((t) => t + 1);
    seen.values.push(value);
  });
  return null;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  seen.values = [];
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

const latest = () => seen.values[seen.values.length - 1];

describe('useTempUser', () => {
  it('mints a UUID guest id once and persists it with the temp flag', async () => {
    await act(async () => {
      root.render(<Caller />);
    });
    const v = latest();
    expect(v.isLoaded).toBe(true);
    expect(v.isTempUser).toBe(true);
    expect(v.tempUserId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(localStorage.getItem('temp_user_id')).toBe(v.tempUserId);
    expect(localStorage.getItem('is_temp_user')).toBe('true');
  });

  it('reads back a stored registered identity as not-temp', async () => {
    localStorage.setItem('temp_user_id', 'user-42');
    localStorage.setItem('is_temp_user', 'false');
    await act(async () => {
      root.render(<Caller />);
    });
    expect(latest().tempUserId).toBe('user-42');
    expect(latest().isTempUser).toBe(false);
  });

  it('hands out one upgrade function per mount, not one per render', async () => {
    await act(async () => {
      root.render(<Caller />);
    });
    await act(async () => bumpRender());
    await act(async () => bumpRender());
    const identities = new Set(seen.values.map((v) => v.migrateTempUserToReal));
    expect(seen.values.length).toBeGreaterThanOrEqual(3);
    expect(identities.size).toBe(1);
  });

  it('upgrade flips the stored identity and returns the old guest id', async () => {
    await act(async () => {
      root.render(<Caller />);
    });
    const guestId = latest().tempUserId;
    let returned = '';
    await act(async () => {
      returned = latest().migrateTempUserToReal('user-9');
    });
    expect(returned).toBe(guestId);
    expect(latest().tempUserId).toBe('user-9');
    expect(latest().isTempUser).toBe(false);
    expect(localStorage.getItem('temp_user_id')).toBe('user-9');
    expect(localStorage.getItem('is_temp_user')).toBe('false');
  });
});
