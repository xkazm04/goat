'use client';

/**
 * LiveSearchPreview
 * Shows real-time result counts and per-facet breakdowns
 * as the user types in the search bar.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Search, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLiveSearchCounts, type LiveSearchCounts } from '../hooks/useLiveSearchCounts';
import type { FilterableItem } from '../CollectionFilterIntegration';

/**
 * LiveSearchPreview Props
 */
interface LiveSearchPreviewProps {
  query: string;
  items: FilterableItem[];
  debounceMs?: number;
  facetFields?: string[];
  className?: string;
  variant?: 'inline' | 'badge' | 'detailed';
}

/**
 * LiveSearchPreview Component
 */
export function LiveSearchPreview({
  query,
  items,
  debounceMs = 100,
  facetFields = ['category', 'subcategory'],
  className,
  variant = 'inline',
}: LiveSearchPreviewProps) {
  const counts = useLiveSearchCounts(query, {
    items,
    debounceMs,
    facetFields,
  });

  if (!query.trim()) return null;

  if (variant === 'badge') {
    return <BadgePreview counts={counts} className={className} />;
  }

  if (variant === 'detailed') {
    return <DetailedPreview counts={counts} className={className} />;
  }

  return <InlinePreview counts={counts} className={className} />;
}

/**
 * Inline preview - compact count next to search
 */
function InlinePreview({
  counts,
  className,
}: {
  counts: LiveSearchCounts;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={counts.isCalculating ? 'loading' : counts.totalMatches}
        initial={{ opacity: 0, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 2 }}
        transition={{ duration: 0.1 }}
        className={cn('flex items-center gap-2 text-xs', className)}
      >
        {counts.isCalculating ? (
          <span className="flex items-center gap-1 text-zinc-500">
            <Loader2 size={10} className="animate-spin" />
            <span>Counting...</span>
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1">
              <Search size={10} className="text-zinc-500" />
              <span className="text-brand-hover font-medium">
                {counts.totalMatches}
              </span>
              <span className="text-zinc-500">
                / {counts.totalItems}
              </span>
            </span>
            {/* Facet chips */}
            {Object.entries(counts.facetCounts).map(([field, facets]) =>
              facets.length > 0 ? (
                <span
                  key={field}
                  className="flex items-center gap-1 text-zinc-500"
                >
                  <Hash size={8} />
                  {facets.slice(0, 2).map((f) => (
                    <span key={f.value} className="text-zinc-400">
                      {f.value}
                      <span className="text-zinc-600 ml-0.5">({f.count})</span>
                    </span>
                  ))}
                  {facets.length > 2 && (
                    <span className="text-zinc-600">
                      +{facets.length - 2}
                    </span>
                  )}
                </span>
              ) : null
            )}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Badge preview - just a count badge
 */
function BadgePreview({
  counts,
  className,
}: {
  counts: LiveSearchCounts;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={counts.isCalculating ? 'loading' : counts.totalMatches}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.1 }}
        className={cn(
          'inline-flex items-center justify-center',
          'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
          counts.totalMatches === 0
            ? 'bg-red-500/20 text-red-400'
            : 'bg-brand/20 text-brand-hover',
          className
        )}
      >
        {counts.isCalculating ? (
          <Loader2 size={10} className="animate-spin" />
        ) : (
          counts.totalMatches
        )}
      </motion.span>
    </AnimatePresence>
  );
}

/**
 * Detailed preview - with facet breakdown
 */
function DetailedPreview({
  counts,
  className,
}: {
  counts: LiveSearchCounts;
  className?: string;
}) {
  const hasFacets = Object.values(counts.facetCounts).some((f) => f.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        'rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-2',
        className
      )}
    >
      {/* Match count */}
      <div className="flex items-center gap-2 text-sm">
        {counts.isCalculating ? (
          <Loader2 size={14} className="animate-spin text-brand-hover" />
        ) : (
          <Search size={14} className="text-brand-hover" />
        )}
        <span>
          <span
            className={cn(
              'font-bold',
              counts.totalMatches === 0 ? 'text-red-400' : 'text-brand-hover'
            )}
          >
            {counts.totalMatches}
          </span>
          <span className="text-zinc-500"> of {counts.totalItems} items match</span>
        </span>
      </div>

      {/* Facet breakdown */}
      {hasFacets && !counts.isCalculating && (
        <div className="mt-2 space-y-1.5">
          {Object.entries(counts.facetCounts).map(([field, facets]) =>
            facets.length > 0 ? (
              <div key={field}>
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  {field}
                </span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {facets.map((facet) => (
                    <span
                      key={facet.value}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-zinc-800 text-zinc-400"
                    >
                      <span>{facet.value}</span>
                      <span className="text-zinc-600">{facet.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </motion.div>
  );
}
