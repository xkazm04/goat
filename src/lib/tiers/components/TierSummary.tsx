"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  PieChart,
  Trophy,
  TrendingUp,
  Users,
  Layers,
  Zap,
  Target,
  Hash,
} from "lucide-react";
import {
  TierDefinition,
  TierStats,
  TierSummary as TierSummaryType,
  TieredItem,
} from "../types";
import { TierLabelBadge, TierDistributionChart } from "./TierVisualizer";

/**
 * Summary Stat Card Props
 */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
}

/**
 * StatCard - Individual statistic display
 */
const StatCard = memo(function StatCard({
  icon,
  label,
  value,
  subtext,
  color = "#3b82f6",
}: StatCardProps) {
  return (
    <motion.div
      className="p-4 rounded-xl"
      style={{
        background: "rgba(51, 65, 85, 0.3)",
        border: "1px solid rgba(71, 85, 105, 0.2)",
      }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center gap-3">
        <div
          className="p-2 rounded-lg"
          style={{ background: `${color}20` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{value}</div>
          <div className="text-xs text-slate-400">{label}</div>
          {subtext && (
            <div className="text-[10px] text-slate-500 mt-0.5">{subtext}</div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

/**
 * Tier Row Props
 */
interface TierRowProps {
  stat: TierStats;
  maxItems: number;
  onClick?: () => void;
}

/**
 * TierRow - Single tier statistics row
 */
const TierRow = memo(function TierRow({
  stat,
  maxItems,
  onClick,
}: TierRowProps) {
  const percentage = maxItems > 0 ? (stat.filledCount / maxItems) * 100 : 0;

  return (
    <motion.button
      className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
      style={{
        background: "rgba(51, 65, 85, 0.3)",
        border: "1px solid rgba(71, 85, 105, 0.2)",
      }}
      whileHover={{ background: "rgba(71, 85, 105, 0.4)" }}
      onClick={onClick}
    >
      {/* Tier badge */}
      <TierLabelBadge tier={stat.tier} size="md" showGlow />

      {/* Info */}
      <div className="flex-1 text-left">
        <div className="text-sm font-medium text-white">
          {stat.tier.displayName}
        </div>
        <div className="text-xs text-slate-500">
          {stat.filledCount}/{stat.itemCount} filled
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-24">
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: "rgba(71, 85, 105, 0.3)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: stat.tier.color.gradient }}
            initial={{ width: 0 }}
            animate={{ width: `${stat.percentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="text-[10px] text-slate-500 mt-1 text-right">
          {stat.percentage}%
        </div>
      </div>
    </motion.button>
  );
});

/**
 * Distribution Ring Props
 */
interface DistributionRingProps {
  tiers: TierDefinition[];
  tieredItems: TieredItem[];
  size?: number;
}

/**
 * DistributionRing - Donut chart showing tier distribution
 */
const DistributionRing = memo(function DistributionRing({
  tiers,
  tieredItems,
  size = 120,
}: DistributionRingProps) {
  const segments = useMemo(() => {
    const counts = new Map<string, number>();
    let total = 0;

    for (const tier of tiers) {
      counts.set(tier.id, 0);
    }
    for (const item of tieredItems) {
      const current = counts.get(item.tier.id) || 0;
      counts.set(item.tier.id, current + 1);
      total++;
    }

    let currentAngle = -90;
    return tiers.map((tier) => {
      const count = counts.get(tier.id) || 0;
      const percentage = total > 0 ? (count / total) * 100 : 0;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;

      return {
        tier,
        count,
        percentage,
        startAngle,
        endAngle: currentAngle,
      };
    });
  }, [tiers, tieredItems]);

  const radius = size / 2 - 10;
  const innerRadius = radius * 0.6;

  const getArcPath = (startAngle: number, endAngle: number, r: number) => {
    const start = polarToCartesian(size / 2, size / 2, r, endAngle);
    const end = polarToCartesian(size / 2, size / 2, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return [
      "M",
      start.x,
      start.y,
      "A",
      r,
      r,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
    ].join(" ");
  };

  const polarToCartesian = (
    cx: number,
    cy: number,
    r: number,
    angle: number
  ) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(71, 85, 105, 0.2)"
          strokeWidth={(radius - innerRadius)}
        />

        {/* Segments */}
        {segments.map(
          ({ tier, percentage, startAngle, endAngle }) =>
            percentage > 0 && (
              <motion.path
                key={tier.id}
                d={getArcPath(startAngle, endAngle, radius)}
                fill="none"
                stroke={tier.color.primary}
                strokeWidth={radius - innerRadius}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: 0.1 }}
              />
            )
        )}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">
          {tieredItems.length}
        </span>
        <span className="text-[10px] text-slate-500">items</span>
      </div>
    </div>
  );
});

/**
 * Balance Indicator Props
 */
interface BalanceIndicatorProps {
  score: number;
  size?: number;
}

/**
 * BalanceIndicator - Visual indicator of tier balance
 */
const BalanceIndicator = memo(function BalanceIndicator({
  score,
  size = 80,
}: BalanceIndicatorProps) {
  const getColor = (s: number) => {
    if (s >= 80) return "#22c55e";
    if (s >= 60) return "#eab308";
    if (s >= 40) return "#f97316";
    return "#ef4444";
  };

  const getLabel = (s: number) => {
    if (s >= 80) return "Balanced";
    if (s >= 60) return "Good";
    if (s >= 40) return "Uneven";
    return "Skewed";
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${getColor(score)} ${score}%, rgba(71, 85, 105, 0.2) ${score}%)`,
        }}
      >
        <div
          className="absolute rounded-full flex flex-col items-center justify-center"
          style={{
            width: size - 16,
            height: size - 16,
            background: "rgb(30, 41, 59)",
          }}
        >
          <span
            className="text-lg font-bold"
            style={{ color: getColor(score) }}
          >
            {score}
          </span>
        </div>
      </div>
      <span className="text-xs text-slate-400 mt-2">{getLabel(score)}</span>
    </div>
  );
});

/**
 * Top Items List Props
 */
interface TopItemsListProps {
  items: TieredItem[];
  limit?: number;
}

/**
 * TopItemsList - List of top tiered items
 */
const TopItemsList = memo(function TopItemsList({
  items,
  limit = 5,
}: TopItemsListProps) {
  const topItems = useMemo(() => {
    return [...items]
      .sort((a, b) => a.position - b.position)
      .slice(0, limit);
  }, [items, limit]);

  if (topItems.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500 text-sm">
        No items ranked yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {topItems.map((item) => (
        <motion.div
          key={item.itemId}
          className="flex items-center gap-3 p-2 rounded-lg"
          style={{ background: "rgba(51, 65, 85, 0.3)" }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
            style={{
              background: item.tier.color.gradient,
              color: item.tier.color.text,
            }}
          >
            {item.position + 1}
          </div>
          <div className="flex-1 text-sm text-white truncate">
            #{item.position + 1}
          </div>
          <TierLabelBadge tier={item.tier} size="sm" />
          <span className="text-xs text-slate-500">{item.percentile}%ile</span>
        </motion.div>
      ))}
    </div>
  );
});

/**
 * Main TierSummaryPanel Props
 */
interface TierSummaryPanelProps {
  summary: TierSummaryType;
  tiers: TierDefinition[];
  tieredItems: TieredItem[];
  onTierClick?: (tier: TierDefinition) => void;
}

/**
 * TierSummaryPanel - Complete tier summary panel
 */
export const TierSummaryPanel = memo(function TierSummaryPanel({
  summary,
  tiers,
  tieredItems,
  onTierClick,
}: TierSummaryPanelProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-slate-400" />
        <h3 className="text-lg font-semibold text-white">Tier Summary</h3>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Layers className="w-5 h-5" />}
          label="Total Tiers"
          value={tiers.length}
          subtext={`${summary.tieredItems} items classified`}
          color="#8b5cf6"
        />
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Fill Rate"
          value={`${Math.round((summary.tieredItems / summary.totalItems) * 100)}%`}
          subtext={`${summary.tieredItems}/${summary.totalItems} positions`}
          color="#22c55e"
        />
      </div>

      {/* Distribution visualization */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/30">
        <div className="flex-1">
          <div className="text-sm font-medium text-white mb-3">Distribution</div>
          <TierDistributionChart
            tiers={tiers}
            tieredItems={tieredItems}
            height={80}
            showLabels
          />
        </div>
        <div className="flex flex-col items-center">
          <BalanceIndicator score={summary.balanceScore} />
        </div>
      </div>

      {/* Dominant tier */}
      {summary.dominantTier && (
        <div
          className="p-4 rounded-xl"
          style={{
            background: `${summary.dominantTier.color.primary}15`,
            border: `1px solid ${summary.dominantTier.color.primary}30`,
          }}
        >
          <div className="flex items-center gap-3">
            <Trophy
              className="w-5 h-5"
              style={{ color: summary.dominantTier.color.accent }}
            />
            <div>
              <div className="text-sm font-medium text-white">
                Most Populated: {summary.dominantTier.displayName}
              </div>
              <div className="text-xs text-slate-400">
                {summary.distribution.get(summary.dominantTier.id) || 0} items
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tier breakdown */}
      <div>
        <div className="text-sm font-medium text-white mb-3">Tier Breakdown</div>
        <div className="space-y-2">
          {summary.tierStats.map((stat) => (
            <TierRow
              key={stat.tier.id}
              stat={stat}
              maxItems={summary.totalItems}
              onClick={() => onTierClick?.(stat.tier)}
            />
          ))}
        </div>
      </div>

      {/* Top items preview */}
      <div>
        <div className="text-sm font-medium text-white mb-3">Top Ranked</div>
        <TopItemsList items={tieredItems} limit={5} />
      </div>
    </div>
  );
});

/**
 * Compact Tier Summary Props
 */
interface CompactTierSummaryProps {
  tiers: TierDefinition[];
  tieredItems: TieredItem[];
}

/**
 * CompactTierSummary - Minimal summary for sidebars
 */
export const CompactTierSummary = memo(function CompactTierSummary({
  tiers,
  tieredItems,
}: CompactTierSummaryProps) {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const tier of tiers) {
      map.set(tier.id, 0);
    }
    for (const item of tieredItems) {
      const current = map.get(item.tier.id) || 0;
      map.set(item.tier.id, current + 1);
    }
    return map;
  }, [tiers, tieredItems]);

  return (
    <div className="flex items-center gap-2">
      {tiers.map((tier) => {
        const count = counts.get(tier.id) || 0;
        return (
          <div
            key={tier.id}
            className="flex items-center gap-1"
            title={`${tier.displayName}: ${count} items`}
          >
            <TierLabelBadge tier={tier} size="sm" />
            <span className="text-xs text-slate-500">{count}</span>
          </div>
        );
      })}
    </div>
  );
});

export default {
  TierSummaryPanel,
  CompactTierSummary,
};
