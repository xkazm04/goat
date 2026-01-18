'use client';

/**
 * FilterStatistics
 * Real-time match counts and filter statistics
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { FilterStatistics as FilterStatsType, FieldDistribution } from '../types';
import { FILTER_ANIMATIONS } from '../constants';

/**
 * FilterStatistics Props
 */
interface FilterStatisticsProps {
  statistics: FilterStatsType | null;
  isLoading?: boolean;
  showBreakdown?: boolean;
  showPercentage?: boolean;
  className?: string;
  variant?: 'inline' | 'card' | 'detailed';
}

/**
 * FilterStatistics Component
 */
export function FilterStatistics({
  statistics,
  isLoading = false,
  showBreakdown = false,
  showPercentage = true,
  className,
  variant = 'inline',
}: FilterStatisticsProps) {
  if (isLoading) {
    return <StatisticsLoading variant={variant} className={className} />;
  }

  if (!statistics) {
    return null;
  }

  switch (variant) {
    case 'card':
      return (
        <CardStatistics
          statistics={statistics}
          showBreakdown={showBreakdown}
          showPercentage={showPercentage}
          className={className}
        />
      );
    case 'detailed':
      return (
        <DetailedStatistics
          statistics={statistics}
          className={className}
        />
      );
    default:
      return (
        <InlineStatistics
          statistics={statistics}
          showPercentage={showPercentage}
          className={className}
        />
      );
  }
}

/**
 * Inline Statistics
 */
function InlineStatistics({
  statistics,
  showPercentage,
  className,
}: {
  statistics: FilterStatsType;
  showPercentage: boolean;
  className?: string;
}) {
  return (
    <motion.div
      className={cn('flex items-center gap-2 text-sm', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={FILTER_ANIMATIONS.transition}
    >
      <span className="text-muted-foreground">
        <AnimatedNumber value={statistics.matchedItems} /> of{' '}
        {statistics.totalItems} items
      </span>
      {showPercentage && statistics.totalItems > 0 && (
        <span className="text-xs text-muted-foreground">
          ({Math.round(statistics.matchPercentage)}%)
        </span>
      )}
      {statistics.activeFilters > 0 && (
        <span className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded">
          {statistics.activeFilters} filter
          {statistics.activeFilters !== 1 ? 's' : ''} active
        </span>
      )}
    </motion.div>
  );
}

/**
 * Card Statistics
 */
function CardStatistics({
  statistics,
  showBreakdown,
  showPercentage,
  className,
}: {
  statistics: FilterStatsType;
  showBreakdown: boolean;
  showPercentage: boolean;
  className?: string;
}) {
  return (
    <motion.div
      className={cn(
        'p-4 rounded-lg border border-border bg-background',
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={FILTER_ANIMATIONS.transition}
    >
      {/* Main stats */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-2xl font-bold">
            <AnimatedNumber value={statistics.matchedItems} />
          </div>
          <div className="text-xs text-muted-foreground">
            items match {statistics.activeFilters > 0 ? 'filters' : '(no filters)'}
          </div>
        </div>

        {showPercentage && (
          <div className="text-right">
            <div className="text-lg font-semibold text-primary">
              <AnimatedNumber value={Math.round(statistics.matchPercentage)} />%
            </div>
            <div className="text-xs text-muted-foreground">
              of {statistics.totalItems} total
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${statistics.matchPercentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Active filters count */}
      {statistics.activeFilters > 0 && (
        <div className="mt-3 text-xs text-muted-foreground">
          {statistics.activeFilters} active filter
          {statistics.activeFilters !== 1 ? 's' : ''}
        </div>
      )}

      {/* Breakdown */}
      {showBreakdown && Object.keys(statistics.fieldDistribution).length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <FieldBreakdown distribution={statistics.fieldDistribution} />
        </div>
      )}
    </motion.div>
  );
}

/**
 * Detailed Statistics
 */
function DetailedStatistics({
  statistics,
  className,
}: {
  statistics: FilterStatsType;
  className?: string;
}) {
  const fields = Object.entries(statistics.fieldDistribution);

  return (
    <motion.div
      className={cn('space-y-4', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={FILTER_ANIMATIONS.transition}
    >
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Matched"
          value={statistics.matchedItems}
          subtitle={`of ${statistics.totalItems}`}
          color="primary"
        />
        <StatCard
          label="Match Rate"
          value={`${Math.round(statistics.matchPercentage)}%`}
          color="success"
        />
        <StatCard
          label="Active Filters"
          value={statistics.activeFilters}
          color="info"
        />
      </div>

      {/* Field distributions */}
      {fields.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Distribution by Field
          </h4>
          {fields.map(([field, distribution]) => (
            <FieldDistributionChart
              key={field}
              fieldName={field}
              distribution={distribution}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

/**
 * Stat Card
 */
function StatCard({
  label,
  value,
  subtitle,
  color,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
  color: 'primary' | 'success' | 'info';
}) {
  const colorClasses = {
    primary: 'text-primary',
    success: 'text-green-500',
    info: 'text-blue-500',
  };

  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={cn('text-xl font-bold', colorClasses[color])}>
        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
      </div>
      {subtitle && (
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      )}
    </div>
  );
}

/**
 * Field Breakdown
 */
function FieldBreakdown({
  distribution,
}: {
  distribution: Record<string, FieldDistribution>;
}) {
  const fields = Object.entries(distribution).slice(0, 3);

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">
        Top values by field
      </div>
      {fields.map(([field, dist]) => (
        <div key={field} className="space-y-1">
          <div className="text-xs font-medium capitalize">{dist.field}</div>
          <div className="flex flex-wrap gap-1">
            {dist.values.slice(0, 5).map((v) => (
              <span
                key={String(v.value)}
                className="px-1.5 py-0.5 text-[10px] bg-muted rounded"
              >
                {String(v.value)}: {v.count}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Field Distribution Chart
 */
function FieldDistributionChart({
  fieldName,
  distribution,
}: {
  fieldName: string;
  distribution: FieldDistribution;
}) {
  const maxCount = Math.max(...distribution.values.map((v) => v.count));
  const topValues = distribution.values.slice(0, 5);

  return (
    <div className="p-3 rounded-lg border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium capitalize">{distribution.field}</span>
        {distribution.average !== undefined && (
          <span className="text-xs text-muted-foreground">
            Avg: {distribution.average.toFixed(1)}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {topValues.map((item) => (
          <div key={String(item.value)} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-20 truncate">
              {String(item.value)}
            </span>
            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary/60 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(item.count / maxCount) * 100}%` }}
                transition={{ duration: 0.3, delay: 0.1 }}
              />
            </div>
            <span className="text-xs font-medium w-10 text-right">
              {item.count}
            </span>
          </div>
        ))}
      </div>

      {distribution.values.length > 5 && (
        <div className="mt-2 text-xs text-muted-foreground text-center">
          +{distribution.values.length - 5} more
        </div>
      )}
    </div>
  );
}

/**
 * Loading State
 */
function StatisticsLoading({
  variant,
  className,
}: {
  variant: string;
  className?: string;
}) {
  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        <div className="h-4 w-12 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-4 rounded-lg border border-border animate-pulse',
        className
      )}
    >
      <div className="flex justify-between mb-3">
        <div className="space-y-2">
          <div className="h-6 w-16 bg-muted rounded" />
          <div className="h-3 w-20 bg-muted rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-5 w-12 bg-muted rounded" />
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full" />
    </div>
  );
}

/**
 * Animated Number Component
 */
function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = React.useState(value);

  React.useEffect(() => {
    const startValue = displayValue;
    const diff = value - startValue;
    const duration = 300;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOut
      setDisplayValue(Math.round(startValue + diff * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <>{displayValue.toLocaleString()}</>;
}

/**
 * Match Count Badge - compact display
 */
interface MatchCountBadgeProps {
  matched: number;
  total: number;
  showPercentage?: boolean;
  className?: string;
}

export function MatchCountBadge({
  matched,
  total,
  showPercentage = false,
  className,
}: MatchCountBadgeProps) {
  const percentage = total > 0 ? Math.round((matched / total) * 100) : 0;

  return (
    <motion.span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full',
        'bg-muted text-muted-foreground',
        className
      )}
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      transition={FILTER_ANIMATIONS.chip}
    >
      <span className="font-medium">{matched.toLocaleString()}</span>
      {showPercentage && (
        <span className="opacity-70">({percentage}%)</span>
      )}
    </motion.span>
  );
}

/**
 * Filter Summary - one-line summary
 */
interface FilterSummaryProps {
  activeFilters: number;
  matchedItems: number;
  totalItems: number;
  onClearFilters?: () => void;
  className?: string;
}

export function FilterSummary({
  activeFilters,
  matchedItems,
  totalItems,
  onClearFilters,
  className,
}: FilterSummaryProps) {
  if (activeFilters === 0) {
    return (
      <span className={cn('text-sm text-muted-foreground', className)}>
        {totalItems.toLocaleString()} items
      </span>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <span className="text-muted-foreground">
        Showing <span className="font-medium text-foreground">{matchedItems.toLocaleString()}</span> of{' '}
        {totalItems.toLocaleString()}
      </span>
      <span className="text-xs text-muted-foreground">
        ({activeFilters} filter{activeFilters !== 1 ? 's' : ''})
      </span>
      {onClearFilters && (
        <button
          className="text-xs text-primary hover:underline"
          onClick={onClearFilters}
        >
          Clear
        </button>
      )}
    </div>
  );
}
