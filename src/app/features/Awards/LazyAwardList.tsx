'use client';

/**
 * LazyAwardList - Lazy-loaded wrapper for AwardList
 *
 * This component uses Next.js dynamic imports to lazy-load the entire
 * AwardList component (and its @dnd-kit dependencies) only when
 * the awards page is accessed. This reduces the initial bundle size.
 */

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Loader2, Trophy } from 'lucide-react';

interface LazyAwardListProps {
  parentListId: string;
  title?: string;
  description?: string;
}

// Loading skeleton component for award list initialization
function AwardListSkeleton() {
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      data-testid="award-list-skeleton"
      role="status"
      aria-label="Loading awards"
    >
      {/* Background */}
      <div className="fixed inset-0 bg-[#050505] -z-10" />
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-900/15 via-[#050505] to-[#050505]" />
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-6 py-8 relative z-10">
        {/* Header skeleton */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full" />
              <div className="relative p-3 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 rounded-xl border border-yellow-500/30">
                <Trophy className="w-8 h-8 text-yellow-500 animate-pulse" />
              </div>
            </div>
          </div>

          <div className="h-8 w-48 bg-gray-800/50 rounded mx-auto mb-4 animate-pulse" />
          <div className="h-4 w-80 bg-gray-800/30 rounded mx-auto mb-4 animate-pulse" />

          {/* Stats bar skeleton */}
          <div className="flex items-center justify-center gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-8 w-28 bg-gray-800/40 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </motion.header>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
        </div>

        {/* Award items skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-800/50 rounded-lg" />
                <div className="flex-1">
                  <div className="h-5 w-40 bg-gray-800/50 rounded mb-2" />
                  <div className="h-3 w-60 bg-gray-800/30 rounded" />
                </div>
                <div className="w-24 h-24 bg-gray-800/40 rounded-lg" />
              </div>
            </div>
          ))}
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
          <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
          <span className="text-sm text-gray-300">Loading awards...</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Dynamically imported AwardList with loading skeleton.
 */
export const LazyAwardList = dynamic<LazyAwardListProps>(
  () => import('./AwardList').then(mod => ({ default: mod.AwardList })),
  {
    loading: () => <AwardListSkeleton />,
    ssr: false,
  }
);

// Also export the skeleton for testing/storybook
export { AwardListSkeleton };

// Default export for simpler imports
export default LazyAwardList;
