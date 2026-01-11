'use client';

/**
 * LazyListSections - Lazy-loaded wrappers for landing page list sections
 *
 * These components use Next.js dynamic imports to defer loading of list sections
 * that are below the fold. This improves initial page load by deferring
 * non-critical content.
 *
 * The sections include:
 * - FeaturedListsSection: Featured/popular lists (~15KB)
 * - UserListsSection: User's own lists (~15KB)
 *
 * Both sections use TanStack Query for data fetching, so the actual content
 * loads asynchronously anyway - lazy loading the components themselves
 * reduces initial bundle size.
 */

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

// Loading skeleton for list sections
function ListSectionSkeleton() {
  return (
    <div
      className="py-12 px-4"
      data-testid="list-section-skeleton"
      role="status"
      aria-label="Loading list section"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-800/50 rounded animate-pulse mb-2" />
          <div className="h-4 w-72 bg-gray-800/30 rounded animate-pulse" />
        </div>

        {/* Card grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 animate-pulse"
            >
              {/* Card image skeleton */}
              <div className="aspect-video bg-gray-800/50 rounded-lg mb-4" />
              {/* Card title skeleton */}
              <div className="h-5 w-3/4 bg-gray-800/50 rounded mb-2" />
              {/* Card description skeleton */}
              <div className="h-4 w-full bg-gray-800/30 rounded mb-1" />
              <div className="h-4 w-2/3 bg-gray-800/30 rounded" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Simpler skeleton for user lists (may have fewer items)
function UserListsSkeleton() {
  return (
    <div
      className="py-12 px-4"
      data-testid="user-lists-skeleton"
      role="status"
      aria-label="Loading your lists"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-32 bg-gray-800/50 rounded animate-pulse mb-2" />
          <div className="h-4 w-56 bg-gray-800/30 rounded animate-pulse" />
        </div>

        {/* Card grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 animate-pulse"
            >
              <div className="aspect-video bg-gray-800/50 rounded-lg mb-4" />
              <div className="h-5 w-3/4 bg-gray-800/50 rounded mb-2" />
              <div className="h-4 w-full bg-gray-800/30 rounded" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Lazy-loaded FeaturedListsSection
 * Deferred loading since it's below the fold
 */
export const LazyFeaturedListsSection = dynamic(
  () => import('./FeaturedListsSection').then(mod => ({ default: mod.FeaturedListsSection })),
  {
    loading: () => <ListSectionSkeleton />,
    ssr: true, // Keep SSR for SEO
  }
);

/**
 * Lazy-loaded UserListsSection
 * Deferred loading since it's below the fold
 */
export const LazyUserListsSection = dynamic(
  () => import('./UserListsSection').then(mod => ({ default: mod.UserListsSection })),
  {
    loading: () => <UserListsSkeleton />,
    ssr: true, // Keep SSR for authenticated content
  }
);

// Export skeletons for testing/storybook
export { ListSectionSkeleton, UserListsSkeleton };
