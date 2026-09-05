'use client';

import dynamic from 'next/dynamic';
import { Component, type ReactNode } from 'react';

import { useDeferredMount } from '@/providers/deferred-mount';

// Side-effect import, deliberately not tree-shakeable by removal: the store
// registry validates its declared dependency topology at module load (cycles,
// dangling edges) and arms the dev sync-drift assertions. This provider is
// rendered by the root layout on every startup path, which is what makes that
// validation run unasked instead of waiting for a caller that never comes.
// Do not remove without giving the registry another always-evaluated home.
import '@/stores/registry';

const CommandPaletteProvider = dynamic(
  () => import('@/app/features/CommandPalette/CommandPaletteProvider').then(m => ({ default: m.CommandPaletteProvider })),
  { ssr: false }
);

const PrefetchProvider = dynamic(
  () => import('@/providers/prefetch-provider').then(m => ({ default: m.PrefetchProvider })),
  { ssr: false }
);

/**
 * The deferred runtime is optional; the page it is mounted beside is not.
 * Without this boundary a failed chunk load (or a throw inside the palette or
 * prefetcher) propagates to the nearest boundary above — the route's
 * error.tsx — and replaces the whole page with an error screen because a
 * non-critical provider did not arrive. The failure is still recorded:
 * console.error is not subject to the category logger's off-by-default gate.
 */
class DeferredRuntimeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[DeferredProviders] deferred runtime failed to mount; continuing without it', error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * DeferredProviders
 *
 * Mounts globally-needed non-critical providers (CommandPalette, Prefetch)
 * after the first paint. This reduces JS execution on the critical rendering
 * path, improving LCP and TTI.
 *
 * The deferred providers are rendered as a SIBLING of `children`, never as an
 * ancestor. React remounts a subtree whenever an ancestor changes type, and
 * `children` here is the whole app body from the root layout — so the earlier
 * shape (`ready ? <Prefetch><Palette>{children}</Palette></Prefetch> : children`)
 * unmounted and re-created every page one idle tick after it first painted:
 * a blank flash while the deferred chunks loaded, every component's local
 * state lost, every mount effect run twice. Both deferred providers provide no
 * React context (they are side-effect-only and read zustand stores), so they
 * do not need to wrap anything. Pinned by DeferredProviders.test.tsx.
 *
 * Match-specific providers (OfflineProvider, BacklogProvider, ItemDetailPopupProvider)
 * are scoped to the (match) route group layout instead.
 */
export function DeferredProviders({ children }: { children: ReactNode }) {
  const ready = useDeferredMount();

  return (
    <>
      {children}
      {ready && (
        <DeferredRuntimeBoundary>
          <PrefetchProvider>
            <CommandPaletteProvider>{null}</CommandPaletteProvider>
          </PrefetchProvider>
        </DeferredRuntimeBoundary>
      )}
    </>
  );
}
