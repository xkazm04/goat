'use client';

/**
 * FilterResultsCounter
 *
 * Real-time display of filter results count and execution time.
 * Shows visual feedback for active filters and search.
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFilterIntegrationOptional } from '../CollectionFilterIntegration';
import type { FilterConfig } from '../types';

/**
 * Props for FilterResultsCounter
 */
interface FilterResultsCounterProps {
  totalItems?: number;
  matchedItems?: number;
  executionTime?: number;
  isLoading?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  showExecution?: boolean;
}

/**
 * Count active conditions in a filter config
 */
function countActiveConditions(config: FilterConfig): number {
  let count = config.conditions.filter((c) => c.enabled).length;

  const countInGroup = (groups: typeof config.groups): number => {
    let total = 0;
    for (const g of groups) {
      if (g.enabled) {
        total += g.conditions.filter((c) => c.enabled).length;
        total += countInGroup(g.groups);
      }
    }
    return total;
  };

  count += countInGroup(config.groups);
  return count;
}

/**
 * FilterResultsCounter component
 */
export function FilterResultsCounter({
  totalItems: propTotal,
  matchedItems: propMatched,
  executionTime: propExecTime,
  isLoading: propLoading,
  className,
  variant = 'default',
  showExecution = true,
}: FilterResultsCounterProps) {
  // Try to get from context
  const context = useFilterIntegrationOptional();

  // Resolve values
  const totalItems = propTotal ?? context?.totalItems ?? 0;
  const matchedItems = propMatched ?? context?.matchedItems ?? 0;
  const executionTime = propExecTime ?? context?.executionTime ?? 0;
  const isLoading = propLoading ?? context?.isSearching ?? false;
  const filterConfig = context?.filterConfig;
  const searchQuery = context?.searchQuery;

  // Calculate stats
  const matchPercentage = totalItems > 0 ? Math.round((matchedItems / totalItems) * 100) : 0;
  const activeFilters = filterConfig ? countActiveConditions(filterConfig) : 0;
  const hasSearch = !!searchQuery?.trim();
  const hasFilters = activeFilters > 0;
  const isFiltering = hasSearch || hasFilters;

  // Trend indicator (compared to total)
  const trend = useMemo(() => {
    if (!isFiltering) return null;
    if (matchedItems === totalItems) return 'all';
    if (matchedItems === 0) return 'none';
    if (matchPercentage < 25) return 'low';
    if (matchPercentage > 75) return 'high';
    return 'medium';
  }, [isFiltering, matchedItems, totalItems, matchPercentage]);

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        {isLoading ? (
          <Loader2 size={14} className="animate-spin text-cyan-400" />
        ) : (
          <Filter
            size={14}
            className={isFiltering ? 'text-cyan-400' : 'text-zinc-500'}
          />
        )}
        <span className={isFiltering ? 'text-zinc-200' : 'text-zinc-500'}>
          {matchedItems}
          {isFiltering && (
            <span className="text-zinc-500"> / {totalItems}</span>
          )}
        </span>
      </div>
    );
  }

  // Detailed variant
  if (variant === 'detailed') {
    return (
      <div
        className={cn(
          'rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-3',
          className
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 size={16} className="animate-spin text-cyan-400" />
            ) : isFiltering ? (
              <Filter size={16} className="text-cyan-400" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-400" />
            )}
            <span className="text-sm font-medium text-zinc-200">
              {isFiltering ? 'Filtered Results' : 'All Items'}
            </span>
          </div>
          {showExecution && executionTime > 0 && (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Clock size={12} />
              {executionTime.toFixed(1)}ms
            </span>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">{matchedItems}</div>
            <div className="text-xs text-zinc-500">Matched</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-zinc-400">{totalItems}</div>
            <div className="text-xs text-zinc-500">Total</div>
          </div>
          <div className="text-center">
            <div
              className={cn(
                'text-2xl font-bold',
                matchPercentage === 100
                  ? 'text-emerald-400'
                  : matchPercentage === 0
                  ? 'text-red-400'
                  : 'text-zinc-300'
              )}
            >
              {matchPercentage}%
            </div>
            <div className="text-xs text-zinc-500">Match Rate</div>
          </div>
        </div>

        {/* Active filters summary */}
        {isFiltering && (
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              {hasSearch && (
                <span className="flex items-center gap-1 rounded bg-cyan-500/10 px-1.5 py-0.5 text-cyan-400">
                  <Search size={10} />
                  Search active
                </span>
              )}
              {hasFilters && (
                <span className="flex items-center gap-1 rounded bg-purple-500/10 px-1.5 py-0.5 text-purple-400">
                  <Filter size={10} />
                  {activeFilters} filter{activeFilters !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-zinc-700/50 bg-zinc-900/30 px-3 py-2',
        className
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Loader2 size={18} className="animate-spin text-cyan-400" />
            </motion.div>
          ) : trend === 'none' ? (
            <motion.div
              key="none"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <AlertCircle size={18} className="text-red-400" />
            </motion.div>
          ) : trend === 'all' || !isFiltering ? (
            <motion.div
              key="all"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <CheckCircle2 size={18} className="text-emerald-400" />
            </motion.div>
          ) : (
            <motion.div
              key="filter"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Filter size={18} className="text-cyan-400" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Count */}
      <div className="flex items-baseline gap-1">
        <motion.span
          key={matchedItems}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'text-lg font-bold',
            trend === 'none'
              ? 'text-red-400'
              : trend === 'all' || !isFiltering
              ? 'text-emerald-400'
              : 'text-cyan-400'
          )}
        >
          {matchedItems}
        </motion.span>
        {isFiltering && (
          <>
            <span className="text-zinc-600">/</span>
            <span className="text-sm text-zinc-500">{totalItems}</span>
          </>
        )}
        <span className="text-xs text-zinc-500 ml-1">
          {isFiltering ? 'matches' : 'items'}
        </span>
      </div>

      {/* Trend indicator */}
      {isFiltering && trend && (
        <div className="flex-shrink-0">
          {trend === 'low' && (
            <TrendingDown size={14} className="text-orange-400" />
          )}
          {trend === 'high' && (
            <TrendingUp size={14} className="text-emerald-400" />
          )}
        </div>
      )}

      {/* Execution time */}
      {showExecution && executionTime > 0 && (
        <div className="flex items-center gap-1 text-xs text-zinc-500 ml-auto">
          <Clock size={12} />
          <span>{executionTime.toFixed(1)}ms</span>
        </div>
      )}
    </div>
  );
}

/**
 * Inline badge showing filter count
 */
export function FilterCountBadge({
  count,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const context = useFilterIntegrationOptional();
  const filterCount = count ?? (context?.filterConfig ? countActiveConditions(context.filterConfig) : 0);

  if (filterCount === 0) return null;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        'inline-flex items-center justify-center',
        'min-w-[18px] h-[18px] px-1',
        'rounded-full bg-cyan-500 text-[10px] font-bold text-white',
        className
      )}
    >
      {filterCount}
    </motion.span>
  );
}

/**
 * Search result summary text
 */
export function SearchResultSummary({
  className,
}: {
  className?: string;
}) {
  const context = useFilterIntegrationOptional();

  if (!context) return null;

  const { searchQuery, matchedItems, totalItems, filterConfig, isSearching } = context;
  const hasSearch = !!searchQuery?.trim();
  const activeFilters = filterConfig ? countActiveConditions(filterConfig) : 0;

  if (isSearching) {
    return (
      <span className={cn('text-sm text-zinc-400', className)}>
        Searching...
      </span>
    );
  }

  if (!hasSearch && activeFilters === 0) {
    return (
      <span className={cn('text-sm text-zinc-500', className)}>
        {totalItems} items total
      </span>
    );
  }

  const parts: string[] = [];

  if (hasSearch) {
    parts.push(`"${searchQuery}"`);
  }

  if (activeFilters > 0) {
    parts.push(`${activeFilters} filter${activeFilters !== 1 ? 's' : ''}`);
  }

  return (
    <span className={cn('text-sm', className)}>
      <span className="text-cyan-400">{matchedItems}</span>
      <span className="text-zinc-500"> of </span>
      <span className="text-zinc-400">{totalItems}</span>
      <span className="text-zinc-500"> match </span>
      <span className="text-zinc-400">{parts.join(' + ')}</span>
    </span>
  );
}
