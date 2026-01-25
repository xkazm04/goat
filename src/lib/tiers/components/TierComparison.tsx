'use client';

/**
 * TierComparison
 * Side-by-side comparison of tier distributions
 */

import React, { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TierDefinition, TierStats } from '../types';
import { TierChartData } from './TierChart';
import { ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown, Equal } from 'lucide-react';

/**
 * Comparison data set
 */
export interface ComparisonDataSet {
  label: string;
  description?: string;
  data: TierChartData[];
  timestamp?: number;
}

/**
 * Difference calculation result
 */
interface TierDifference {
  tierId: string;
  tier: TierDefinition;
  left: TierStats;
  right: TierStats;
  filledDiff: number;
  percentageDiff: number;
  trend: 'up' | 'down' | 'same';
}

interface TierComparisonProps {
  /** Left (before/reference) data set */
  leftData: ComparisonDataSet;
  /** Right (after/current) data set */
  rightData: ComparisonDataSet;
  /** Mode: side-by-side or difference view */
  mode?: 'side-by-side' | 'difference' | 'overlay';
  /** Show percentage changes */
  showPercentageChange?: boolean;
  /** Highlight significant changes */
  highlightThreshold?: number;
  /** Custom class name */
  className?: string;
}

/**
 * Get trend icon
 */
function TrendIcon({
  trend,
  size = 16,
}: {
  trend: 'up' | 'down' | 'same';
  size?: number;
}) {
  switch (trend) {
    case 'up':
      return <ArrowUp className="text-green-500" style={{ width: size, height: size }} />;
    case 'down':
      return <ArrowDown className="text-red-500" style={{ width: size, height: size }} />;
    case 'same':
      return <Minus className="text-muted-foreground" style={{ width: size, height: size }} />;
  }
}

/**
 * Difference bar for comparing two values
 */
const DifferenceBar = memo(function DifferenceBar({
  diff,
  maxDiff,
  tier,
}: {
  diff: TierDifference;
  maxDiff: number;
  tier: TierDefinition;
}) {
  const barWidth = maxDiff > 0 ? (Math.abs(diff.filledDiff) / maxDiff) * 50 : 0;
  const isPositive = diff.filledDiff > 0;

  return (
    <div className="flex items-center gap-3">
      {/* Tier label */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
        style={{
          background: tier.color.gradient,
          color: tier.color.text,
        }}
      >
        {tier.label}
      </div>

      {/* Center line and bars */}
      <div className="flex-1 flex items-center">
        {/* Left side (negative) */}
        <div className="flex-1 flex justify-end">
          {!isPositive && diff.filledDiff !== 0 && (
            <motion.div
              className="h-8 rounded-l-lg"
              style={{
                background: `linear-gradient(90deg, ${tier.color.primary}40, ${tier.color.primary})`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${barWidth}%` }}
              transition={{ duration: 0.5 }}
            />
          )}
        </div>

        {/* Center line */}
        <div className="w-px h-10 bg-border mx-2" />

        {/* Right side (positive) */}
        <div className="flex-1">
          {isPositive && diff.filledDiff !== 0 && (
            <motion.div
              className="h-8 rounded-r-lg"
              style={{
                background: `linear-gradient(90deg, ${tier.color.primary}, ${tier.color.primary}40)`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${barWidth}%` }}
              transition={{ duration: 0.5 }}
            />
          )}
        </div>
      </div>

      {/* Values */}
      <div className="flex items-center gap-2 w-32 justify-end">
        <span className="text-sm text-muted-foreground">
          {diff.left.filledCount}
        </span>
        <TrendIcon trend={diff.trend} />
        <span className="text-sm font-medium">
          {diff.right.filledCount}
        </span>
        {diff.filledDiff !== 0 && (
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded',
              isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
            )}
          >
            {isPositive ? '+' : ''}{diff.filledDiff}
          </span>
        )}
      </div>
    </div>
  );
});

/**
 * Side-by-side bar comparison
 */
const SideBySideComparison = memo(function SideBySideComparison({
  differences,
  leftLabel,
  rightLabel,
}: {
  differences: TierDifference[];
  leftLabel: string;
  rightLabel: string;
}) {
  const maxValue = Math.max(
    ...differences.flatMap(d => [d.left.filledCount, d.right.filledCount]),
    1
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="w-10 shrink-0" />
        <div className="flex-1 text-right">{leftLabel}</div>
        <div className="w-px h-4 bg-border mx-2" />
        <div className="flex-1">{rightLabel}</div>
        <div className="w-20" />
      </div>

      {/* Bars */}
      {differences.map((diff) => (
        <div key={diff.tierId} className="flex items-center gap-3">
          {/* Tier label */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
            style={{
              background: diff.tier.color.gradient,
              color: diff.tier.color.text,
            }}
          >
            {diff.tier.label}
          </div>

          {/* Left bar */}
          <div className="flex-1 flex justify-end">
            <div className="w-full h-8 bg-muted/30 rounded-lg overflow-hidden">
              <motion.div
                className="h-full rounded-lg"
                style={{
                  background: diff.tier.color.gradient,
                  marginLeft: 'auto',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${(diff.left.filledCount / maxValue) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Center divider */}
          <div className="w-px h-10 bg-border" />

          {/* Right bar */}
          <div className="flex-1">
            <div className="w-full h-8 bg-muted/30 rounded-lg overflow-hidden">
              <motion.div
                className="h-full rounded-lg"
                style={{
                  background: diff.tier.color.gradient,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${(diff.right.filledCount / maxValue) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Change indicator */}
          <div className="w-20 flex items-center justify-end gap-1">
            <TrendIcon trend={diff.trend} size={14} />
            {diff.filledDiff !== 0 && (
              <span
                className={cn(
                  'text-xs font-medium',
                  diff.trend === 'up' && 'text-green-500',
                  diff.trend === 'down' && 'text-red-500'
                )}
              >
                {diff.filledDiff > 0 ? '+' : ''}{diff.filledDiff}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

/**
 * Overlay comparison (superimposed bars)
 */
const OverlayComparison = memo(function OverlayComparison({
  differences,
  leftLabel,
  rightLabel,
}: {
  differences: TierDifference[];
  leftLabel: string;
  rightLabel: string;
}) {
  const maxValue = Math.max(
    ...differences.flatMap(d => [d.left.filledCount, d.right.filledCount]),
    1
  );

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-muted-foreground/30" />
          <span className="text-muted-foreground">{leftLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary" />
          <span>{rightLabel}</span>
        </div>
      </div>

      {/* Bars */}
      {differences.map((diff) => (
        <div key={diff.tierId} className="flex items-center gap-3">
          {/* Tier label */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
            style={{
              background: diff.tier.color.gradient,
              color: diff.tier.color.text,
            }}
          >
            {diff.tier.label}
          </div>

          {/* Overlaid bars */}
          <div className="flex-1 relative h-10">
            {/* Left (background) bar */}
            <motion.div
              className="absolute top-0 bottom-0 left-0 rounded-lg opacity-40"
              style={{
                background: diff.tier.color.primary,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${(diff.left.filledCount / maxValue) * 100}%` }}
              transition={{ duration: 0.5 }}
            />

            {/* Right (foreground) bar */}
            <motion.div
              className="absolute top-1 bottom-1 left-0 rounded-lg"
              style={{
                background: diff.tier.color.gradient,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${(diff.right.filledCount / maxValue) * 100}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>

          {/* Values */}
          <div className="w-24 flex flex-col items-end text-xs">
            <span className="text-muted-foreground">{diff.left.filledCount}</span>
            <span className="font-medium">{diff.right.filledCount}</span>
          </div>
        </div>
      ))}
    </div>
  );
});

/**
 * Summary statistics
 */
function ComparisonSummary({
  differences,
  leftLabel,
  rightLabel,
}: {
  differences: TierDifference[];
  leftLabel: string;
  rightLabel: string;
}) {
  const leftTotal = differences.reduce((sum, d) => sum + d.left.filledCount, 0);
  const rightTotal = differences.reduce((sum, d) => sum + d.right.filledCount, 0);
  const totalDiff = rightTotal - leftTotal;

  const improved = differences.filter(d => d.trend === 'up').length;
  const declined = differences.filter(d => d.trend === 'down').length;
  const unchanged = differences.filter(d => d.trend === 'same').length;

  return (
    <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-xl">
      {/* Total change */}
      <div className="text-center">
        <div className="text-2xl font-bold flex items-center justify-center gap-1">
          {totalDiff > 0 ? (
            <>
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-green-500">+{totalDiff}</span>
            </>
          ) : totalDiff < 0 ? (
            <>
              <TrendingDown className="w-5 h-5 text-red-500" />
              <span className="text-red-500">{totalDiff}</span>
            </>
          ) : (
            <>
              <Equal className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground">0</span>
            </>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1">Total Change</div>
      </div>

      {/* Before/After totals */}
      <div className="text-center border-l border-r border-border">
        <div className="text-lg">
          <span className="text-muted-foreground">{leftTotal}</span>
          <span className="mx-2">→</span>
          <span className="font-bold">{rightTotal}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {leftLabel} → {rightLabel}
        </div>
      </div>

      {/* Tier movement summary */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 text-sm">
          <span className="text-green-500 font-medium">{improved}↑</span>
          <span className="text-red-500 font-medium">{declined}↓</span>
          <span className="text-muted-foreground">{unchanged}=</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">Tier Changes</div>
      </div>
    </div>
  );
}

/**
 * TierComparison component
 */
export const TierComparison = memo(function TierComparison({
  leftData,
  rightData,
  mode = 'side-by-side',
  showPercentageChange = true,
  highlightThreshold = 20,
  className,
}: TierComparisonProps) {
  const [selectedMode, setSelectedMode] = useState(mode);

  // Calculate differences
  const differences = useMemo<TierDifference[]>(() => {
    return leftData.data.map((left) => {
      const right = rightData.data.find(r => r.tier.id === left.tier.id);

      const leftFilled = left.stats.filledCount;
      const rightFilled = right?.stats.filledCount || 0;
      const filledDiff = rightFilled - leftFilled;

      return {
        tierId: left.tier.id,
        tier: left.tier,
        left: left.stats,
        right: right?.stats || { ...left.stats, filledCount: 0 },
        filledDiff,
        percentageDiff: leftFilled > 0
          ? Math.round((filledDiff / leftFilled) * 100)
          : rightFilled > 0 ? 100 : 0,
        trend: filledDiff > 0 ? 'up' : filledDiff < 0 ? 'down' : 'same',
      };
    });
  }, [leftData, rightData]);

  const maxDiff = Math.max(...differences.map(d => Math.abs(d.filledDiff)), 1);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Mode selector */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Tier Comparison</h3>
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          {(['side-by-side', 'difference', 'overlay'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMode(m)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-md transition-colors',
                selectedMode === m
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {m === 'side-by-side' ? 'Side by Side' : m === 'difference' ? 'Difference' : 'Overlay'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <ComparisonSummary
        differences={differences}
        leftLabel={leftData.label}
        rightLabel={rightData.label}
      />

      {/* Chart based on mode */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedMode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {selectedMode === 'difference' && (
            <div className="space-y-2">
              {differences.map((diff) => (
                <DifferenceBar
                  key={diff.tierId}
                  diff={diff}
                  maxDiff={maxDiff}
                  tier={diff.tier}
                />
              ))}
            </div>
          )}

          {selectedMode === 'side-by-side' && (
            <SideBySideComparison
              differences={differences}
              leftLabel={leftData.label}
              rightLabel={rightData.label}
            />
          )}

          {selectedMode === 'overlay' && (
            <OverlayComparison
              differences={differences}
              leftLabel={leftData.label}
              rightLabel={rightData.label}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

export default TierComparison;
