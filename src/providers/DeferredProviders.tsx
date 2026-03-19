'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, type ReactNode } from 'react';

const CommandPaletteProvider = dynamic(
  () => import('@/app/features/CommandPalette/CommandPaletteProvider').then(m => ({ default: m.CommandPaletteProvider })),
  { ssr: false }
);

const OfflineProvider = dynamic(
  () => import('@/lib/offline/OfflineProvider').then(m => ({ default: m.OfflineProvider })),
  { ssr: false }
);

const PrefetchProvider = dynamic(
  () => import('@/providers/prefetch-provider').then(m => ({ default: m.PrefetchProvider })),
  { ssr: false }
);

const ItemDetailPopupProvider = dynamic(
  () => import('@/app/features/Collection/components/ItemDetailPopupProvider').then(m => ({ default: m.ItemDetailPopupProvider })),
  { ssr: false }
);

/**
 * DeferredProviders
 *
 * Wraps non-critical providers (CommandPalette, Offline, Prefetch, ItemDetailPopup)
 * and defers their mounting until after the first paint. This reduces JS execution
 * on the critical rendering path, improving LCP and TTI.
 *
 * During the deferred period, children render normally — consumers of deferred
 * contexts (e.g. useOffline) return safe defaults until the real provider mounts.
 */
export function DeferredProviders({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Use requestIdleCallback where available, otherwise requestAnimationFrame + setTimeout
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(() => setReady(true), { timeout: 2000 });
      return () => cancelIdleCallback(id);
    } else {
      const raf = requestAnimationFrame(() => {
        const timer = setTimeout(() => setReady(true), 0);
        return () => clearTimeout(timer);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, []);

  if (!ready) {
    return <>{children}</>;
  }

  return (
    <PrefetchProvider>
      <OfflineProvider showStatusIndicator enableAutoSync>
        <CommandPaletteProvider>
          {children}
          <ItemDetailPopupProvider />
        </CommandPaletteProvider>
      </OfflineProvider>
    </PrefetchProvider>
  );
}
