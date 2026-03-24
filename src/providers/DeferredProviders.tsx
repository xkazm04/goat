'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, type ReactNode } from 'react';

const CommandPaletteProvider = dynamic(
  () => import('@/app/features/CommandPalette/CommandPaletteProvider').then(m => ({ default: m.CommandPaletteProvider })),
  { ssr: false }
);

const PrefetchProvider = dynamic(
  () => import('@/providers/prefetch-provider').then(m => ({ default: m.PrefetchProvider })),
  { ssr: false }
);

/**
 * DeferredProviders
 *
 * Wraps globally-needed non-critical providers (CommandPalette, Prefetch)
 * and defers their mounting until after the first paint. This reduces JS execution
 * on the critical rendering path, improving LCP and TTI.
 *
 * Match-specific providers (OfflineProvider, BacklogProvider, ItemDetailPopupProvider)
 * are scoped to the (match) route group layout instead.
 */
export function DeferredProviders({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(() => setReady(true), { timeout: 2000 });
      return () => cancelIdleCallback(id);
    } else {
      const raf = requestAnimationFrame(() => {
        const timer = setTimeout(() => setReady(true), 0);
        return () => cancelAnimationFrame(raf);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, []);

  if (!ready) {
    return <>{children}</>;
  }

  return (
    <PrefetchProvider>
      <CommandPaletteProvider>
        {children}
      </CommandPaletteProvider>
    </PrefetchProvider>
  );
}
