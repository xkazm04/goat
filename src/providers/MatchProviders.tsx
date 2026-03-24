'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, type ReactNode } from 'react';

import { BacklogProvider } from '@/providers/BacklogProvider';

const OfflineProvider = dynamic(
  () => import('@/lib/offline/OfflineProvider').then(m => ({ default: m.OfflineProvider })),
  { ssr: false }
);

const ItemDetailPopupProvider = dynamic(
  () => import('@/app/features/Collection/components/ItemDetailPopupProvider').then(m => ({ default: m.ItemDetailPopupProvider })),
  { ssr: false }
);

/**
 * MatchProviders
 *
 * Wraps match-specific providers (BacklogProvider, OfflineProvider, ItemDetailPopupProvider)
 * that are only needed on match routes (/goat, /award). These initialize IndexedDB,
 * SyncEngine, NetworkMonitor, and store subscriptions — work that non-match pages
 * (landing, share, analytics) don't need.
 *
 * Defers OfflineProvider and ItemDetailPopupProvider mounting until after first paint
 * to reduce JS execution on the critical path.
 */
export function MatchProviders({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
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
    return <BacklogProvider>{children}</BacklogProvider>;
  }

  return (
    <BacklogProvider>
      <OfflineProvider enableAutoSync>
        {children}
        <ItemDetailPopupProvider />
      </OfflineProvider>
    </BacklogProvider>
  );
}
