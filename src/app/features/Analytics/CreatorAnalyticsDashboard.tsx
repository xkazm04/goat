"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Eye,
  Share2,
  Users,
  TrendingUp,
  ChevronDown,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { useCreatorAnalytics } from "@/hooks/use-top-lists";
import {
  compareInstant,
  compareNumeric,
  sortedBy,
  withIdTiebreak,
} from "@/lib/sorting/comparators";
import { cn } from "@/lib/utils";

import { ListAnalyticsCard } from "./ListAnalyticsCard";

import type { CreatorAnalyticsSummary, CreatorListAnalytics } from "@/types/top-lists";


interface CreatorAnalyticsDashboardProps {
  userId: string;
  className?: string;
}

type SortKey = "views" | "shares" | "rankers" | "recent";

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={cn("opacity-70", color)}>{icon}</span>
        <span className="text-xs text-slate-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <span className={cn("text-2xl font-bold", color)}>
        {value.toLocaleString()}
      </span>
    </motion.div>
  );
}

function AggregateViewsChart({
  summary,
}: {
  summary: CreatorAnalyticsSummary;
}) {
  const chartData = useMemo(() => {
    // Aggregate views_over_time across all lists
    const byDay: Record<string, number> = {};
    for (const list of summary.lists) {
      for (const point of list.views_over_time) {
        byDay[point.date] = (byDay[point.date] || 0) + point.views;
      }
    }
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, views]) => ({
        date: date.slice(5), // MM-DD
        views,
      }));
  }, [summary]);

  const hasData = chartData.some((d) => d.views > 0);
  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-slate-600">
        No view data in the last 30 days
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
      >
        <defs>
          <linearGradient id="agg-bar-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <CartesianGrid
          horizontal
          vertical={false}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="date"
          tick={{
            fill: "rgba(255,255,255,0.3)",
            fontSize: 9,
            fontFamily: "var(--font-family-mono)",
          }}
          tickLine={false}
          axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{
            fill: "rgba(255,255,255,0.25)",
            fontSize: 9,
            fontFamily: "var(--font-family-mono)",
          }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={({ active, payload, label }) =>
            active && payload?.[0] ? (
              <div
                className="rounded-md px-2.5 py-1.5 text-xs shadow-xl"
                style={{
                  background: "rgba(15,23,42,0.95)",
                  border: "1px solid rgba(34,211,238,0.3)",
                }}
              >
                <p className="text-slate-400">{label}</p>
                <p className="font-semibold text-brand-hover">
                  {payload[0].value} views
                </p>
              </div>
            ) : null
          }
          cursor={{
            fill: "rgba(34,211,238,0.06)",
          }}
        />
        <Bar
          dataKey="views"
          fill="url(#agg-bar-grad)"
          maxBarSize={12}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-xl bg-slate-800/30 border border-slate-700/30"
          />
        ))}
      </div>
      <div className="h-48 rounded-xl bg-slate-800/30 border border-slate-700/30" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-56 rounded-xl bg-slate-800/30 border border-slate-700/30"
          />
        ))}
      </div>
    </div>
  );
}

export function CreatorAnalyticsDashboard({
  userId,
  className,
}: CreatorAnalyticsDashboardProps) {
  const { data: summary, isLoading, error } = useCreatorAnalytics(userId);
  const [sortBy, setSortBy] = useState<SortKey>("views");

  const sortedLists = useMemo(() => {
    if (!summary?.lists) return [];
    // Every one of these metrics is zero for most of a creator's lists, so
    // ties are the common case, not the edge case: without the identity
    // tiebreak the card order reshuffled on every refetch of identical data.
    // (registry table/sorting — "the order must be total and deterministic")
    const compare = withIdTiebreak<CreatorListAnalytics>((a, b) => {
      switch (sortBy) {
        case "views":
          return compareNumeric(a.total_views, b.total_views, "desc");
        case "shares":
          return compareNumeric(a.share_count, b.share_count, "desc");
        case "rankers":
          return compareNumeric(a.unique_rankers, b.unique_rankers, "desc");
        case "recent":
          return compareInstant(a.created_at, b.created_at, "desc");
        default:
          return 0;
      }
    }, (list) => list.list_id);
    return sortedBy(summary.lists, compare);
  }, [summary, sortBy]);

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand-hover" />
          Creator Analytics
        </h2>
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-center py-12", className)}>
        <BarChart3 className="w-8 h-8 mx-auto mb-3 text-slate-600" />
        <p className="text-sm text-slate-400">
          Failed to load analytics: {error.message}
        </p>
      </div>
    );
  }

  if (!summary || summary.total_lists === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <BarChart3 className="w-8 h-8 mx-auto mb-3 text-slate-600" />
        <p className="text-sm text-slate-400">
          No published lists yet. Create a list to see analytics!
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Title */}
      <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-brand-hover" />
        Creator Analytics
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Lists"
          value={summary.total_lists}
          color="text-slate-200"
        />
        <SummaryCard
          icon={<Eye className="w-4 h-4" />}
          label="Total Views"
          value={summary.total_views}
          color="text-brand-hover"
        />
        <SummaryCard
          icon={<Share2 className="w-4 h-4" />}
          label="Shares"
          value={summary.total_shares}
          color="text-purple-400"
        />
        <SummaryCard
          icon={<Users className="w-4 h-4" />}
          label="Unique Rankers"
          value={summary.total_rankers}
          color="text-emerald-400"
        />
      </div>

      {/* Aggregate Views Chart */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-3">
        <h3 className="text-sm font-medium text-slate-400">
          Views Over Time (30 days)
        </h3>
        <AggregateViewsChart summary={summary} />
      </div>

      {/* Per-list analytics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-400">
            Per-List Breakdown
          </h3>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="appearance-none text-xs bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5 pr-7 text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand/50"
            >
              <option value="views">Most Viewed</option>
              <option value="shares">Most Shared</option>
              <option value="rankers">Most Rankers</option>
              <option value="recent">Most Recent</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {sortedLists.map((listAnalytics) => (
            <ListAnalyticsCard
              key={listAnalytics.list_id}
              analytics={listAnalytics}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
