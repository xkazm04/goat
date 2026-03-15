'use client';

/**
 * StudioSkeleton
 * Loading skeleton for Suspense fallback during lazy loading
 * Matches the StudioLayout structure for seamless transitions
 */

import { SURFACE_ELEVATION } from '@/components/visual/depth/depth-tokens';

const skeletonBlock = { backgroundColor: SURFACE_ELEVATION.raised };
const headerBg = { backgroundColor: SURFACE_ELEVATION.sunken };

/**
 * StudioSkeleton Component
 * Provides an accessible loading state that mirrors the StudioLayout structure.
 * Used as a Suspense fallback for lazy-loaded Studio content.
 */
export function StudioSkeleton() {
  return (
    <div
      className="min-h-screen bg-gray-950 animate-ambient-shimmer"
      role="status"
      aria-label="Loading studio"
    >
      {/* Header skeleton */}
      <div className="h-16 border-b border-gray-800" style={headerBg}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          {/* Back button skeleton */}
          <div className="w-10 h-10 rounded-lg" style={skeletonBlock} />
          {/* Title skeleton */}
          <div className="flex-1">
            <div className="h-6 w-48 rounded mb-2" style={skeletonBlock} />
            <div className="h-4 w-64 rounded" style={{ backgroundColor: SURFACE_ELEVATION.default }} />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          {/* Main content area skeleton */}
          <div className="h-96 rounded-xl" style={skeletonBlock} />

          {/* Sidebar skeleton */}
          <div className="space-y-4">
            <div className="h-24 rounded-lg" style={skeletonBlock} />
            <div className="h-32 rounded-lg" style={skeletonBlock} />
            <div className="h-24 rounded-lg" style={skeletonBlock} />
            <div className="h-24 rounded-lg" style={skeletonBlock} />
          </div>
        </div>
      </div>

      {/* Screen reader text */}
      <span className="sr-only">Loading List Creation Studio...</span>
    </div>
  );
}
