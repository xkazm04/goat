'use client';

/**
 * StudioSkeleton
 * Loading skeleton for Suspense fallback during lazy loading
 * Matches the StudioLayout structure for seamless transitions
 */

/**
 * StudioSkeleton Component
 * Provides an accessible loading state that mirrors the StudioLayout structure.
 * Used as a Suspense fallback for lazy-loaded Studio content.
 */
export function StudioSkeleton() {
  return (
    <div
      className="min-h-screen bg-gray-950 animate-pulse"
      role="status"
      aria-label="Loading studio"
    >
      {/* Header skeleton */}
      <div className="h-16 bg-gray-900/50 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          {/* Back button skeleton */}
          <div className="w-10 h-10 bg-gray-800/50 rounded-lg" />
          {/* Title skeleton */}
          <div className="flex-1">
            <div className="h-6 w-48 bg-gray-800/50 rounded mb-2" />
            <div className="h-4 w-64 bg-gray-800/30 rounded" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          {/* Main content area skeleton */}
          <div className="h-96 bg-gray-800/50 rounded-xl" />

          {/* Sidebar skeleton */}
          <div className="space-y-4">
            <div className="h-24 bg-gray-800/50 rounded-lg" />
            <div className="h-32 bg-gray-800/50 rounded-lg" />
            <div className="h-24 bg-gray-800/50 rounded-lg" />
            <div className="h-24 bg-gray-800/50 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Screen reader text */}
      <span className="sr-only">Loading List Creation Studio...</span>
    </div>
  );
}
