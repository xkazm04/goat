'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Zap,
  Target,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useItemUniversalRating } from '@/hooks/use-ranking-graph';
import type { CrossListInsight, RankingTrajectory } from '@/lib/ranking-graph/types';
import { DURATION } from '@/lib/animations/motion-presets';

interface CrossListInsightsPanelProps {
  itemId: string;
  itemName: string;
  className?: string;
}

/**
 * CrossListInsightsPanel
 *
 * Expandable panel showing cross-list intelligence for an item:
 * - Universal ELO rating and tier
 * - Cross-list insights (consistency, drops, spikes)
 * - Ranking trajectory (rising, falling, stable)
 * - Context breakdown by list
 */
export function CrossListInsightsPanel({
  itemId,
  itemName,
  className,
}: CrossListInsightsPanelProps) {
  const { rating, insights, trajectory, isLoading, error } =
    useItemUniversalRating(itemId);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggle = useCallback(() => setIsExpanded(prev => !prev), []);

  if (isLoading) {
    return (
      <div className={cn('animate-pulse rounded-card bg-white/5 p-3', className)}>
        <div className="h-4 w-32 rounded bg-white/10" />
        <div className="mt-2 h-3 w-48 rounded bg-white/5" />
      </div>
    );
  }

  if (error || !rating || rating.listAppearances < 2) {
    return null;
  }

  return (
    <motion.div
      layout
      className={cn(
        'rounded-card border border-white/10 bg-white/5 backdrop-blur-sm',
        'overflow-hidden',
        className
      )}
    >
      {/* Header - always visible */}
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 p-3 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="w-4 h-4 text-brand-hover shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <TierBadgeInline tier={String(rating.universalTier)} />
              <span className="text-xs text-white/70">
                ELO {rating.eloScore}
              </span>
              <span className="text-2xs text-white/40">
                ({rating.listAppearances} lists)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {trajectory && <TrajectoryIndicator trajectory={trajectory} />}
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-white/40" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-white/40" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURATION.fast }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/10 p-3 space-y-3">
              {/* Confidence bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-2xs">
                  <span className="text-white/50">Confidence</span>
                  <span className="text-white/70">
                    {Math.round(rating.confidence * 100)}%
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-brand-hover"
                    initial={{ width: 0 }}
                    animate={{ width: `${rating.confidence * 100}%` }}
                    transition={{ duration: DURATION.slow, delay: 0.1 }}
                  />
                </div>
              </div>

              {/* Insights */}
              {insights.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-2xs text-white/40 uppercase tracking-wider">
                    Insights
                  </span>
                  {insights.slice(0, 3).map((insight, i) => (
                    <InsightRow key={i} insight={insight} />
                  ))}
                </div>
              )}

              {/* Context breakdown (top 5) */}
              {rating.contextBreakdown.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-2xs text-white/40 uppercase tracking-wider">
                    Across Lists
                  </span>
                  {rating.contextBreakdown.slice(0, 5).map(ctx => (
                    <div
                      key={ctx.listId}
                      className="flex items-center justify-between text-2xs"
                    >
                      <span className="text-white/60 truncate max-w-[140px]">
                        {ctx.listTitle}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <TierBadgeInline tier={String(ctx.tierInList)} size="sm" />
                        <span className="text-white/40">
                          #{ctx.position + 1}/{ctx.listSize}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Stats summary */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <StatBox
                  label="Total Rankings"
                  value={String(rating.totalRankings)}
                />
                <StatBox
                  label="Avg Position"
                  value={`${Math.round(rating.averageNormalizedPosition * 100)}%`}
                />
                <StatBox
                  label="Variance"
                  value={rating.positionVariance < 0.05 ? 'Low' : rating.positionVariance < 0.15 ? 'Med' : 'High'}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function TierBadgeInline({
  tier,
  size = 'md',
}: {
  tier: string;
  size?: 'sm' | 'md';
}) {
  const colorClass = getTierColor(tier);
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded font-bold leading-none',
        colorClass,
        size === 'sm' ? 'text-3xs px-1 py-0.5' : 'text-2xs px-1.5 py-0.5'
      )}
    >
      {tier}
    </span>
  );
}

function TrajectoryIndicator({ trajectory }: { trajectory: RankingTrajectory }) {
  const Icon =
    trajectory.trend === 'rising'
      ? TrendingUp
      : trajectory.trend === 'falling'
        ? TrendingDown
        : Minus;

  const color =
    trajectory.trend === 'rising'
      ? 'text-emerald-400'
      : trajectory.trend === 'falling'
        ? 'text-rose-400'
        : 'text-white/40';

  return <Icon className={cn('w-3 h-3', color)} />;
}

function InsightRow({ insight }: { insight: CrossListInsight }) {
  const Icon = getInsightIcon(insight.type);
  const color = getInsightColor(insight.type);

  return (
    <div className="flex items-start gap-1.5">
      <Icon className={cn('w-3 h-3 mt-0.5 shrink-0', color)} />
      <div className="min-w-0">
        <p className="text-2xs text-white/70 leading-tight">
          {insight.description}
        </p>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white/5 p-1.5 text-center">
      <div className="text-2xs font-medium text-white/80">{value}</div>
      <div className="text-3xs text-white/40">{label}</div>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function getTierColor(tier: string): string {
  if (tier.startsWith('S')) return 'bg-yellow-500/30 text-yellow-300';
  if (tier.startsWith('A')) return 'bg-orange-500/25 text-orange-300';
  if (tier.startsWith('B')) return 'bg-blue-500/25 text-blue-300';
  if (tier.startsWith('C')) return 'bg-emerald-500/25 text-emerald-300';
  if (tier.startsWith('D')) return 'bg-purple-500/25 text-purple-300';
  return 'bg-gray-500/25 text-gray-300';
}

function getInsightIcon(type: CrossListInsight['type']) {
  switch (type) {
    case 'tier_consistency':
      return Target;
    case 'context_drop':
      return TrendingDown;
    case 'context_spike':
      return TrendingUp;
    case 'niche_favorite':
      return Star;
    case 'universal_top':
      return Sparkles;
    default:
      return BarChart3;
  }
}

function getInsightColor(type: CrossListInsight['type']): string {
  switch (type) {
    case 'tier_consistency':
      return 'text-blue-400';
    case 'context_drop':
      return 'text-rose-400';
    case 'context_spike':
      return 'text-emerald-400';
    case 'niche_favorite':
      return 'text-amber-400';
    case 'universal_top':
      return 'text-yellow-400';
    default:
      return 'text-white/50';
  }
}

export default CrossListInsightsPanel;
