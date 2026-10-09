'use client';

import { usePathname } from 'next/navigation';

import { PageTransition } from '@/components/page-transition';

/**
 * v1's page chrome (gradient frame, fixed auth header, page transition) around
 * every route except /v2, which brings its own shell. A temporary seam while
 * v2 is built beside v1; it is deleted with the rest of v1 at the swap (M7,
 * docs/v2/TECHNICAL_PACKAGE.md §10).
 */
export function V1Chrome({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const isV2 = pathname === '/v2' || pathname?.startsWith('/v2/');

  if (isV2) {
    return (
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-900 to-gray-800/95 text-gray-100 w-full flex flex-col">
      {/* Auth header -- sign in button or user menu */}
      <div className="fixed top-4 right-4 z-toast">{header}</div>
      <main id="main-content" tabIndex={-1}>
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
