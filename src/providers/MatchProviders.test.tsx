// @vitest-environment jsdom
/**
 * MatchProviders — the deferral contract on match routes.
 *
 * Same contract as DeferredProviders.test.tsx: deferring OfflineProvider to
 * idle must not remount the match page it wraps. Today it does — `children`
 * is re-parented from BacklogProvider to BacklogProvider>OfflineProvider when
 * `ready` flips — and the fix is NOT in this file: OfflineProvider provides a
 * real React context (useOffline) that MatchGridHeader and PendingChangesPanel
 * read, so it cannot become a side-effect sibling the way the root shell's
 * providers could. It has to be present from the first render with its heavy
 * initialisation deferred INSIDE it (src/lib/offline/OfflineProvider.tsx).
 *
 * Until then this suite pins the defect with `it.fails`: it goes RED the day
 * the remount stops, and the executor of that fix flips it to `it`.
 * Measured 2026-09-05 (scan-sweep app-providers): mounts=2, unmounts=1.
 */
import React, { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/providers/BacklogProvider', () => ({
  BacklogProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/offline/OfflineProvider', () => ({
  OfflineProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/app/features/Collection/components/ItemDetailPopupProvider', () => ({
  ItemDetailPopupProvider: () => null,
}));

import { MatchProviders } from './MatchProviders';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

let idleCallbacks: Array<() => void>;
let container: HTMLDivElement;
let root: Root;

const counters = { mounts: 0, unmounts: 0 };
function Probe() {
  useEffect(() => {
    counters.mounts += 1;
    return () => {
      counters.unmounts += 1;
    };
  }, []);
  return <span data-testid="probe">match page</span>;
}

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  counters.mounts = 0;
  counters.unmounts = 0;
  idleCallbacks = [];
  vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
    idleCallbacks.push(cb);
    return idleCallbacks.length;
  });
  vi.stubGlobal('cancelIdleCallback', () => {});
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
});

describe('MatchProviders', () => {
  // Known defect, carried to the OfflineProvider seam. See the header.
  it.fails('mounts the match page exactly once across the idle transition', async () => {
    await act(async () => {
      root.render(
        <MatchProviders>
          <Probe />
        </MatchProviders>,
      );
    });
    expect(counters.mounts).toBe(1);

    await act(async () => {
      idleCallbacks[0]();
    });
    await flush();

    expect(counters.unmounts).toBe(0);
    expect(counters.mounts).toBe(1);
  });

  it('renders the page before the idle callback fires', async () => {
    await act(async () => {
      root.render(
        <MatchProviders>
          <Probe />
        </MatchProviders>,
      );
    });
    expect(counters.mounts).toBe(1);
    expect(container.querySelector('[data-testid="probe"]')).not.toBeNull();
  });
});
