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
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
} from 'lucide-react';
import { GoatFilter, GoatListFilter } from '@/components/visual/GoatIcons';
import type { FilterResult, FilterConfig } from '@/lib/filters/types';
import { extractTitle } from '@/lib/items/item-utils';
import { FILTER_TIMING } from '@/lib/filters/constants';
import { FilterEngine } from '@/lib/filters/FilterEngine';
import { cn } from '@/lib/utils';
import { useFilterBuilderStore } from '@/stores/filter-builder-store';
import { GoatSearching } from '@/components/illustrations/EmptyStateIllustrations';

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
    <div className="flex items-center gap-3 rounded-control bg-muted/50 p-2">
      {hasImage && (
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
          <img
            src={item.image as string}
            alt={title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
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
      <div className="rounded-control bg-muted/50 p-2 text-center">
        <div className="text-lg font-bold text-primary font-mono tabular-nums">{result.total}</div>
        <div className="text-xs text-muted-foreground">Total</div>
      </div>
      <div className="rounded-control bg-muted/50 p-2 text-center">
        <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums">{result.matched}</div>
        <div className="text-xs text-muted-foreground">Matched</div>
      </div>
      <div className="rounded-control bg-muted/50 p-2 text-center">
        <div className="text-lg font-bold text-foreground font-mono tabular-nums">{matchPercentage}%</div>
        <div className="text-xs text-muted-foreground">Match Rate</div>
      </div>
      <div className="rounded-control bg-muted/50 p-2 text-center">
        <div className="text-lg font-bold text-purple-400 font-mono">
          {executionTime.toFixed(1)}ms
        </div>
        <div className="text-xs text-muted-foreground">Time</div>
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
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <GoatFilter size={14} />
        <span>No active filters</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <GoatFilter size={14} className="text-primary" />
      {activeConditions.slice(0, 3).map((cond, i) => (
        <span
          key={i}
          className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground font-mono"
        >
          {cond}
        </span>
      ))}
      {activeConditions.length > 3 && (
        <span className="text-xs text-muted-foreground">
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
        'rounded-card border border-border/50 bg-background/50',
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setPreviewOpen(!isPreviewOpen)}
        className={cn(
          'flex w-full items-center justify-between gap-3 p-3',
          'filter-hover transition-colors',
          'text-left'
        )}
      >
        <div className="flex items-center gap-3">
          <GoatListFilter size={18} className="text-primary" />
          <span className="font-medium text-foreground font-grotesk">Preview Results</span>
          <span className="rounded-badge bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
            {result.matched} / {result.total}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ActiveFiltersSummary config={config} />
          {isPreviewOpen ? (
            <ChevronUp size={18} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={18} className="text-muted-foreground" />
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
            transition={{ duration: FILTER_TIMING.standard }}
            className="overflow-hidden"
          >
            <div className="border-t border-border p-3 space-y-4">
              {/* Statistics */}
              <FilterStats result={result} executionTime={result.executionTime} />

              {/* Preview items */}
              {previewItems.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Showing {previewItems.length} of {result.matched} matches
                    </span>
                    {hasMoreItems && (
                      <span className="text-xs text-muted-foreground">
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
                        transition={{ delay: index * FILTER_TIMING.staggerChildren }}
                      >
                        {renderItem(item as T, index)}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-gradient-to-br from-primary/[0.04] to-purple-500/[0.04] p-6">
                  <GoatSearching width={100} height={80} />
                  <p className="text-sm text-muted-foreground mt-2">No items match your filters</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try adjusting your conditions or using OR instead of AND
                  </p>
                </div>
              )}

              {/* Applied filters summary */}
              {result.appliedFilters.length > 0 && (
                <div className="rounded-control bg-muted/30 p-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
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
                            : 'bg-muted text-muted-foreground'
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
        'inline-flex items-center gap-2 rounded-badge px-3 py-1',
        hasFilters ? 'bg-primary/10' : 'bg-muted/50',
        className
      )}
    >
      <GoatFilter size={14} className={hasFilters ? 'text-primary' : 'text-muted-foreground'} />
      <span className={cn('text-sm', hasFilters ? 'text-primary' : 'text-muted-foreground')}>
        {result.matched} / {result.total}
      </span>
      {hasFilters && (
        <span className="rounded-badge bg-primary/20 px-1.5 py-0.5 text-xs font-medium text-primary">
          {result.appliedFilters.length}
        </span>
      )}
    </div>
  );
}
