'use client';

/**
 * FilterResultsCounter
 *
 * Real-time display of filter results count and execution time.
 * Shows visual feedback for active filters and search.
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import React, { useMemo } from 'react';

import { GoatZeroResults } from '@/components/illustrations/EmptyStateIllustrations';
import { GoatFilter, GoatSearch } from '@/components/visual/GoatIcons';
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
          <Loader2 size={14} className="animate-spin text-primary" />
        ) : (
          <GoatFilter
            size={14}
            className={isFiltering ? 'text-primary' : 'text-muted-foreground'}
          />
        )}
        <span className={isFiltering ? 'text-foreground' : 'text-muted-foreground'}>
          {matchedItems}
          {isFiltering && (
            <span className="text-muted-foreground"> / {totalItems}</span>
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
          'rounded-card border border-border/50 bg-background/50 p-3',
          className
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 size={16} className="animate-spin text-primary" />
            ) : isFiltering ? (
              <GoatFilter size={16} className="text-primary" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-400" />
            )}
            <span className="text-sm font-medium text-foreground">
              {isFiltering ? 'Filtered Results' : 'All Items'}
            </span>
          </div>
          {showExecution && executionTime > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={12} />
              {executionTime.toFixed(1)}ms
            </span>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{matchedItems}</div>
            <div className="text-xs text-muted-foreground">Matched</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-muted-foreground">{totalItems}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div
              className={cn(
                'text-2xl font-bold',
                matchPercentage === 100
                  ? 'text-emerald-400'
                  : matchPercentage === 0
                  ? 'text-red-400'
                  : 'text-foreground'
              )}
            >
              {matchPercentage}%
            </div>
            <div className="text-xs text-muted-foreground">Match Rate</div>
          </div>
        </div>

        {/* Active filters summary */}
        {isFiltering && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {hasSearch && (
                <span className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                  <GoatSearch size={10} />
                  Search active
                </span>
              )}
              {hasFilters && (
                <span className="flex items-center gap-1 rounded bg-purple-500/10 px-1.5 py-0.5 text-purple-400">
                  <GoatFilter size={10} />
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
        'flex items-center gap-3 rounded-card border border-border/50 bg-background/30 px-3 py-2',
        className
      )}
    >
      {/* Icon */}
      <div className="shrink-0">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Loader2 size={18} className="animate-spin text-primary" />
            </motion.div>
          ) : trend === 'none' ? (
            <motion.div
              key="none"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <GoatZeroResults width={24} height={20} />
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
              <GoatFilter size={18} className="text-primary" />
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
              : 'text-primary'
          )}
        >
          {matchedItems}
        </motion.span>
        {isFiltering && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">{totalItems}</span>
          </>
        )}
        <span className="text-xs text-muted-foreground ml-1">
          {isFiltering ? 'matches' : 'items'}
        </span>
      </div>

      {/* Trend indicator */}
      {isFiltering && trend && (
        <div className="shrink-0">
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
        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
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
        'rounded-badge bg-primary text-2xs font-bold text-white',
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
      <span className={cn('text-sm text-muted-foreground', className)}>
        Searching...
      </span>
    );
  }

  if (!hasSearch && activeFilters === 0) {
    return (
      <span className={cn('text-sm text-muted-foreground', className)}>
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
      <span className="text-primary">{matchedItems}</span>
      <span className="text-muted-foreground"> of </span>
      <span className="text-muted-foreground">{totalItems}</span>
      <span className="text-muted-foreground"> match </span>
      <span className="text-muted-foreground">{parts.join(' + ')}</span>
    </span>
  );
}
