'use client';

/**
 * LazyAdminContent - Lazy-loaded wrapper for Admin page components
 *
 * The admin page is accessed infrequently and includes heavy components
 * for image management (MasonryGrid, AdminItemCard). Lazy loading these
 * components ensures they're only downloaded when the admin page is accessed.
 *
 * Bundle savings: ~30KB (includes MasonryGrid, TanStack Query hooks)
 */

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// Loading skeleton for admin content
function AdminContentSkeleton() {
  return (
    <div
      className="space-y-8"
      data-testid="admin-content-skeleton"
      role="status"
      aria-label="Loading admin content"
    >
      {/* Section header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 w-48 bg-gray-800/50 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-800/30 rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-gray-800/50 rounded-lg animate-pulse" />
      </div>

      {/* Stats bar skeleton */}
      <div className="flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 animate-pulse"
          >
            <div className="h-8 w-16 bg-gray-800/50 rounded mb-2" />
            <div className="h-4 w-24 bg-gray-800/30 rounded" />
          </div>
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            className="aspect-square bg-gray-900/50 border border-gray-800/50 rounded-xl animate-pulse"
          />
        ))}
      </div>

      {/* Loading indicator */}
      <div className="fixed bottom-8 right-8 flex items-center gap-3 px-4 py-3 bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-700/50">
        <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
        <span className="text-sm text-gray-300">Loading admin tools...</span>
      </div>
    </div>
  );
}

/**
 * Lazy-loaded MissingImagesSection
 * Only loads when admin page is accessed
 */
export const LazyMissingImagesSection = dynamic(
  () => import('./MissingImagesSection').then(mod => ({ default: mod.MissingImagesSection })),
  {
    loading: () => <AdminContentSkeleton />,
    ssr: false, // Admin content doesn't need SSR
  }
);

// Export skeleton for testing
export { AdminContentSkeleton };

// Default export
export default LazyMissingImagesSection;
