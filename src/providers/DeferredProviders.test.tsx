// @vitest-environment jsdom
/**
 * DeferredProviders — the deferral contract.
 *
 * The provider exists to push non-critical providers (prefetch, command
 * palette) off the first-paint path. What it must NOT do is pay for that by
 * tearing down the page it wraps: the root layout renders the entire app body
 * as `children`, so a remount here is a remount of everything.
 *
 * Negative control (recorded 2026-09-05, scan-sweep app-providers): against
 * the pre-fix component — `ready ? <PrefetchProvider>…{children}…</> : <>{children}</>`
 * — "mounts the app body exactly once" failed with mounts=2 / unmounts=1,
 * and "survives a deferred provider that throws" failed with the thrown error
 * escaping to the root. Both went green on the sibling-runtime shape.
 */
import React, { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The deferred runtime's own modules are not under test here; each is
// replaced by a shape-preserving stand-in so the assertion is about
// DeferredProviders' tree, not about what the palette or prefetcher do.
vi.mock('@/stores/registry', () => ({}));
vi.mock('@/providers/prefetch-provider', () => ({
  PrefetchProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));
const paletteRender = vi.fn();
vi.mock('@/app/features/CommandPalette/CommandPaletteProvider', () => ({
  CommandPaletteProvider: ({ children }: { children?: React.ReactNode }) => {
    paletteRender();
    return <>{children}</>;
  },
}));

import { DeferredProviders } from './DeferredProviders';

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
  return <span data-testid="probe">body</span>;
}

async function flush() {
  // Let the dynamic() loaders resolve and React commit the result.
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
  paletteRender.mockClear();
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
  vi.restoreAllMocks();
});

describe('DeferredProviders', () => {
  it('mounts the app body exactly once across the idle transition', async () => {
    await act(async () => {
      root.render(
        <DeferredProviders>
          <Probe />
        </DeferredProviders>,
      );
    });
    expect(counters.mounts).toBe(1);
    expect(idleCallbacks).toHaveLength(1);

    await act(async () => {
      idleCallbacks[0]();
    });
    await flush();

    // The deferred runtime did arrive…
    expect(paletteRender).toHaveBeenCalled();
    // …and the body it was deferred FOR was not torn down to make room for it.
    expect(counters.unmounts).toBe(0);
    expect(counters.mounts).toBe(1);
    expect(container.querySelector('[data-testid="probe"]')).not.toBeNull();
  });

  it('keeps the body mounted when the idle callback never fires', async () => {
    await act(async () => {
      root.render(
        <DeferredProviders>
          <Probe />
        </DeferredProviders>,
      );
    });
    expect(counters.mounts).toBe(1);
    expect(container.querySelector('[data-testid="probe"]')).not.toBeNull();
  });
});
