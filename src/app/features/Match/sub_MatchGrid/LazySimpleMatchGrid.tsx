'use client';

/**
 * LazySimpleMatchGrid - Lazy-loaded wrapper for SimpleMatchGrid
 *
 * This component uses Next.js dynamic imports to lazy-load the entire
 * SimpleMatchGrid component (and its @dnd-kit dependencies) only when
 * the match page is accessed. This reduces the initial bundle size
 * by ~25KB gzipped.
 *
 * Usage:
 * - Import LazySimpleMatchGrid instead of SimpleMatchGrid in pages/routes
 * - The loading skeleton is shown during the ~100ms load time
 */

import dynamic from 'next/dynamic';

// Loading skeleton component for match grid initialization
function MatchGridSkeleton() {
  return (
    <div
      className="min-h-screen bg-[#050505] relative overflow-hidden"
      data-testid="match-grid-skeleton"
      role="status"
      aria-label="Loading match grid"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-[#050505] to-[#050505]" />
      </div>

      {/* Header skeleton */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-8">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="h-8 w-48 bg-gray-800/50 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-800/30 rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-gray-800/50 rounded animate-pulse" />
        </div>
      </div>

      {/* Grid skeleton - Top 3 podium positions */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 mt-12">
        <div className="flex justify-center gap-6 mb-12">
          {/* Position 2 */}
          <div className="w-32 h-40 bg-gray-800/40 rounded-xl animate-pulse" />
          {/* Position 1 (taller) */}
          <div className="w-36 h-48 bg-gray-800/50 rounded-xl animate-pulse -mt-4" />
          {/* Position 3 */}
          <div className="w-32 h-40 bg-gray-800/40 rounded-xl animate-pulse" />
        </div>

        {/* Grid section skeleton */}
        <div className="space-y-8">
          {/* Elite tier */}
          <div>
            <div className="h-4 w-24 bg-gray-800/30 rounded mb-4 animate-pulse" />
            <div className="grid grid-cols-7 gap-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-gray-800/30 rounded-lg animate-pulse"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          </div>

          {/* Core roster */}
          <div>
            <div className="h-4 w-28 bg-gray-800/30 rounded mb-4 animate-pulse" />
            <div className="grid grid-cols-10 gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-gray-800/25 rounded-lg animate-pulse"
                  style={{ animationDelay: `${i * 30}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Collection panel skeleton */}
      <div className="fixed bottom-0 left-0 right-0 h-72 bg-gray-900/95 border-t border-gray-700/50 animate-pulse">
        <div className="p-4">
          <div className="h-8 w-full bg-gray-800/40 rounded mb-4" />
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-gray-800/30 rounded-lg"
                style={{ animationDelay: `${i * 20}ms` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
        <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl px-6 py-4 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-300">Loading drag & drop...</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Dynamically imported SimpleMatchGrid with loading skeleton.
 * The entire @dnd-kit library (~25KB gzipped) is only loaded when this
 * component is rendered.
 */
export const LazySimpleMatchGrid = dynamic(
  () => import('./SimpleMatchGrid').then(mod => ({ default: mod.SimpleMatchGrid })),
  {
    loading: () => <MatchGridSkeleton />,
    ssr: false, // Disable SSR since DnD requires browser APIs
  }
);

// Also export the skeleton for testing/storybook
export { MatchGridSkeleton };

// Default export for simpler imports
export default LazySimpleMatchGrid;
