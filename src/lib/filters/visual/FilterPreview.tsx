'use client';

/**
 * FilterPreview
 * Live preview of filtered results with statistics
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Filter,
  ListFilter,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
} from 'lucide-react';
import type { FilterResult, FilterConfig } from '@/lib/filters/types';
import { FilterEngine } from '@/lib/filters/FilterEngine';
import { cn } from '@/lib/utils';
import { useFilterBuilderStore } from '@/stores/filter-builder-store';

interface FilterPreviewProps<T extends Record<string, unknown>> {
  items: T[];
  renderItem?: (item: T, index: number) => React.ReactNode;
  maxPreviewItems?: number;
  className?: string;
}

// Create a single instance for performance
const filterEngine = new FilterEngine();

/**
 * Default item renderer
 */
function DefaultItemRenderer<T extends Record<string, unknown>>(
  item: T,
  index: number
): React.ReactNode {
  const title = (item.title || item.name || item.id || `Item ${index + 1}`) as string;
  const subtitle = (item.description || item.category || '') as string;
  const hasImage = typeof item.image === 'string' && item.image.length > 0;

  return (
    <div className="flex items-center gap-3 rounded-md bg-zinc-800/50 p-2">
      {hasImage && (
        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-zinc-700">
          <img
            src={item.image as string}
            alt={title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-200">{title}</p>
        {subtitle && (
          <p className="truncate text-xs text-zinc-500">{subtitle}</p>
        )}
      </div>
      {item.ranking !== undefined && (
        <div className="text-xs text-yellow-500">
          {'*'.repeat(Math.min(Number(item.ranking), 5))}
        </div>
      )}
    </div>
  );
}

/**
 * Statistics display
 */
function FilterStats({
  result,
  executionTime,
}: {
  result: FilterResult<unknown> | null;
  executionTime: number;
}) {
  if (!result) return null;

  const matchPercentage = result.total > 0
    ? Math.round((result.matched / result.total) * 100)
    : 0;

  return (
    <div className="grid grid-cols-4 gap-2">
      <div className="rounded-md bg-zinc-800/50 p-2 text-center">
        <div className="text-lg font-bold text-cyan-400">{result.total}</div>
        <div className="text-xs text-zinc-500">Total</div>
      </div>
      <div className="rounded-md bg-zinc-800/50 p-2 text-center">
        <div className="text-lg font-bold text-emerald-400">{result.matched}</div>
        <div className="text-xs text-zinc-500">Matched</div>
      </div>
      <div className="rounded-md bg-zinc-800/50 p-2 text-center">
        <div className="text-lg font-bold text-zinc-300">{matchPercentage}%</div>
        <div className="text-xs text-zinc-500">Match Rate</div>
      </div>
      <div className="rounded-md bg-zinc-800/50 p-2 text-center">
        <div className="text-lg font-bold text-purple-400">
          {executionTime.toFixed(1)}ms
        </div>
        <div className="text-xs text-zinc-500">Time</div>
      </div>
    </div>
  );
}

/**
 * Active filters summary
 */
function ActiveFiltersSummary({ config }: { config: FilterConfig }) {
  const activeConditions = useMemo(() => {
    const conditions: string[] = [];

    // Root conditions
    for (const c of config.conditions) {
      if (c.enabled) {
        conditions.push(`${c.field} ${c.operator} ${c.value ?? ''}`);
      }
    }

    // Group conditions (simplified)
    const countGroupConditions = (groups: typeof config.groups): number => {
      let count = 0;
      for (const g of groups) {
        if (g.enabled) {
          count += g.conditions.filter((c) => c.enabled).length;
          count += countGroupConditions(g.groups);
        }
      }
      return count;
    };

    const groupCount = countGroupConditions(config.groups);
    if (groupCount > 0) {
      conditions.push(`+${groupCount} in groups`);
    }

    return conditions;
  }, [config]);

  if (activeConditions.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Filter size={14} />
        <span>No active filters</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Filter size={14} className="text-cyan-400" />
      {activeConditions.slice(0, 3).map((cond, i) => (
        <span
          key={i}
          className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400"
        >
          {cond}
        </span>
      ))}
      {activeConditions.length > 3 && (
        <span className="text-xs text-zinc-500">
          +{activeConditions.length - 3} more
        </span>
      )}
    </div>
  );
}

/**
 * FilterPreview component
 */
export function FilterPreview<T extends Record<string, unknown>>({
  items,
  renderItem = DefaultItemRenderer,
  maxPreviewItems = 10,
  className,
}: FilterPreviewProps<T>) {
  const { isPreviewOpen, setPreviewOpen, toFilterConfig } = useFilterBuilderStore();

  // Get current filter config from builder
  const config = useMemo(() => toFilterConfig(), [toFilterConfig]);

  // Apply filters
  const result = useMemo(() => {
    const startTime = performance.now();
    const filterResult = filterEngine.apply(items, config);
    const executionTime = performance.now() - startTime;
    return { ...filterResult, executionTime };
  }, [items, config]);

  // Preview items (limited)
  const previewItems = useMemo(() => {
    return result.items.slice(0, maxPreviewItems);
  }, [result.items, maxPreviewItems]);

  const hasMoreItems = result.matched > maxPreviewItems;

  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-700/50 bg-zinc-900/50',
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setPreviewOpen(!isPreviewOpen)}
        className={cn(
          'flex w-full items-center justify-between gap-3 p-3',
          'hover:bg-zinc-800/30 transition-colors',
          'text-left'
        )}
      >
        <div className="flex items-center gap-3">
          <ListFilter size={18} className="text-cyan-400" />
          <span className="font-medium text-zinc-200">Preview Results</span>
          <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs font-medium text-cyan-400">
            {result.matched} / {result.total}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ActiveFiltersSummary config={config} />
          {isPreviewOpen ? (
            <ChevronUp size={18} className="text-zinc-400" />
          ) : (
            <ChevronDown size={18} className="text-zinc-400" />
          )}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isPreviewOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-zinc-800 p-3 space-y-4">
              {/* Statistics */}
              <FilterStats result={result} executionTime={result.executionTime} />

              {/* Preview items */}
              {previewItems.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      Showing {previewItems.length} of {result.matched} matches
                    </span>
                    {hasMoreItems && (
                      <span className="text-xs text-zinc-500">
                        +{result.matched - maxPreviewItems} more
                      </span>
                    )}
                  </div>
                  <div className="max-h-[300px] space-y-1 overflow-y-auto pr-2">
                    {previewItems.map((item, index) => (
                      <motion.div
                        key={(item.id as string) || index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        {renderItem(item as T, index)}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-700 p-8">
                  <XCircle size={32} className="text-zinc-600 mb-2" />
                  <p className="text-sm text-zinc-400">No items match your filters</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Try adjusting your conditions or using OR instead of AND
                  </p>
                </div>
              )}

              {/* Applied filters summary */}
              {result.appliedFilters.length > 0 && (
                <div className="rounded-md bg-zinc-800/30 p-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                    <BarChart3 size={12} />
                    <span>Applied Filters</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.appliedFilters.map((filter) => (
                      <span
                        key={filter.id}
                        className={cn(
                          'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs',
                          filter.enabled
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-zinc-700 text-zinc-500'
                        )}
                      >
                        {filter.enabled ? (
                          <CheckCircle2 size={10} />
                        ) : (
                          <XCircle size={10} />
                        )}
                        {filter.field}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact preview badge for toolbar
 */
export function FilterPreviewBadge<T extends Record<string, unknown>>({
  items,
  className,
}: {
  items: T[];
  className?: string;
}) {
  const { toFilterConfig } = useFilterBuilderStore();

  const config = useMemo(() => toFilterConfig(), [toFilterConfig]);

  const result = useMemo(() => {
    return filterEngine.apply(items, config);
  }, [items, config]);

  const hasFilters = result.appliedFilters.length > 0;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1',
        hasFilters ? 'bg-cyan-500/10' : 'bg-zinc-800/50',
        className
      )}
    >
      <Filter size={14} className={hasFilters ? 'text-cyan-400' : 'text-zinc-500'} />
      <span className={cn('text-sm', hasFilters ? 'text-cyan-400' : 'text-zinc-500')}>
        {result.matched} / {result.total}
      </span>
      {hasFilters && (
        <span className="rounded-full bg-cyan-500/20 px-1.5 py-0.5 text-xs font-medium text-cyan-400">
          {result.appliedFilters.length}
        </span>
      )}
    </div>
  );
}
