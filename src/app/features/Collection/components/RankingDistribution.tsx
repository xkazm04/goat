"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { motion } from "framer-motion";
import {
  BarChart3,
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface RankingStats {
  totalRankings: number;
  averagePosition: number;
  medianPosition: number;
  distribution: Record<number, number>;
  volatility: number;
  confidence: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
  };
}

export interface RankingDistributionProps {
  /** Ranking statistics */
  stats: RankingStats | null;
  /** Loading state */
  loading?: boolean;
  /** Optional className */
  className?: string;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}

function StatCard({ icon, label, value, subtext, color = "text-cyan-400", trend }: StatCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
      <div className="flex items-center gap-2 mb-1">
        <span className={cn("text-gray-400", color)}>{icon}</span>
        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn("text-xl font-bold", color)}>{value}</span>
        {trend && (
          <TrendIcon className={cn(
            "w-3 h-3",
            trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-gray-400'
          )} />
        )}
      </div>
      {subtext && (
        <p className="text-xs text-gray-500 mt-0.5">{subtext}</p>
      )}
    </div>
  );
}

function DistributionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-3 rounded-lg bg-gray-800/30 animate-pulse">
            <div className="h-3 w-16 bg-gray-700/50 rounded mb-2" />
            <div className="h-6 w-12 bg-gray-700/50 rounded" />
          </div>
        ))}
      </div>
      <div className="h-40 bg-gray-800/30 rounded-lg animate-pulse" />
    </div>
  );
}

/**
 * Custom tooltip for the bar chart
 */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-2 shadow-xl">
      <p className="text-xs text-gray-400 mb-1">Position #{label}</p>
      <p className="text-sm font-semibold text-cyan-400">
        {payload[0].value} rankings
      </p>
    </div>
  );
}

/**
 * RankingDistribution - Visual histogram of community rankings
 *
 * Displays how the community has ranked this item across different positions,
 * along with key statistics like average position, total rankings, and confidence.
 */
export function RankingDistribution({
  stats,
  loading = false,
  className,
}: RankingDistributionProps) {
  // Transform distribution data for chart
  const chartData = useMemo(() => {
    if (!stats?.distribution) return [];

    // Get all positions that have rankings
    const positions = Object.keys(stats.distribution)
      .map(Number)
      .sort((a, b) => a - b);

    if (positions.length === 0) return [];

    // Find range to display (pad by 2 on each side)
    const minPos = Math.max(1, positions[0] - 2);
    const maxPos = Math.min(50, positions[positions.length - 1] + 2);

    // Create data array with all positions in range
    const data = [];
    for (let i = minPos; i <= maxPos; i++) {
      data.push({
        position: i,
        count: stats.distribution[i] || 0,
        isMedian: i === Math.round(stats.medianPosition),
      });
    }

    return data;
  }, [stats]);

  // Determine volatility level and color
  const volatilityInfo = useMemo(() => {
    if (!stats) return { level: 'unknown', color: 'text-gray-400', label: 'Unknown' };

    if (stats.volatility < 2) {
      return { level: 'stable', color: 'text-emerald-400', label: 'Very Stable' };
    } else if (stats.volatility < 4) {
      return { level: 'moderate', color: 'text-cyan-400', label: 'Moderate' };
    } else if (stats.volatility < 6) {
      return { level: 'contested', color: 'text-amber-400', label: 'Contested' };
    } else {
      return { level: 'polarizing', color: 'text-rose-400', label: 'Polarizing' };
    }
  }, [stats]);

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2 text-gray-400">
          <BarChart3 className="w-4 h-4" />
          <span className="text-sm font-medium">Community Rankings</span>
        </div>
        <DistributionSkeleton />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={cn("text-center py-6 text-gray-500", className)}>
        <BarChart3 className="w-5 h-5 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No ranking data available</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 text-gray-400">
        <BarChart3 className="w-4 h-4" />
        <span className="text-sm font-medium">Community Rankings</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard
          icon={<Target className="w-4 h-4" />}
          label="Avg Position"
          value={`#${stats.averagePosition.toFixed(1)}`}
          color="text-cyan-400"
        />
        <StatCard
          icon={<Users className="w-4 h-4" />}
          label="Total Rankings"
          value={stats.totalRankings}
          color="text-purple-400"
        />
        <StatCard
          icon={<Award className="w-4 h-4" />}
          label="Confidence"
          value={`${Math.round(stats.confidence * 100)}%`}
          subtext="agreement level"
          color="text-emerald-400"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Volatility"
          value={volatilityInfo.label}
          color={volatilityInfo.color}
        />
      </div>

      {/* Percentiles */}
      <div className="flex items-center justify-center gap-4 py-2 text-xs">
        <div className="text-center">
          <span className="text-gray-500">25th</span>
          <p className="font-semibold text-gray-300">#{stats.percentiles.p25}</p>
        </div>
        <div className="h-8 w-px bg-gray-700" />
        <div className="text-center">
          <span className="text-gray-500">Median</span>
          <p className="font-bold text-cyan-400 text-sm">#{stats.percentiles.p50}</p>
        </div>
        <div className="h-8 w-px bg-gray-700" />
        <div className="text-center">
          <span className="text-gray-500">75th</span>
          <p className="font-semibold text-gray-300">#{stats.percentiles.p75}</p>
        </div>
      </div>

      {/* Distribution Chart */}
      {chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="h-36 w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
            >
              <XAxis
                dataKey="position"
                tick={{ fill: '#6B7280', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#374151' }}
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                x={Math.round(stats.medianPosition)}
                stroke="#22D3EE"
                strokeDasharray="3 3"
                strokeWidth={2}
              />
              <Bar
                dataKey="count"
                radius={[2, 2, 0, 0]}
                maxBarSize={20}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isMedian ? '#22D3EE' : 'rgba(34, 211, 238, 0.4)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Chart legend */}
      <div className="flex justify-center gap-4 text-[10px] text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-cyan-500/40" />
          <span>Rankings count</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-cyan-400 border-dashed" style={{ borderStyle: 'dashed' }} />
          <span>Median position</span>
        </div>
      </div>
    </div>
  );
}
