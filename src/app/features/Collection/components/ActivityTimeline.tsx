"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowUpDown,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DURATION } from "@/lib/animations/motion-presets";
import type { ActivityTimelineData, ActivityEvent, TrajectoryPoint } from "@/types/item-details";

interface ActivityTimelineProps {
  itemId: string;
}

const ACTION_CONFIG: Record<
  ActivityEvent["action"],
  { icon: typeof Plus; label: string; color: string; bgColor: string }
> = {
  assign: {
    icon: Plus,
    label: "Added to grid",
    color: "#10B981",
    bgColor: "rgba(16,185,129,0.15)",
  },
  move: {
    icon: ArrowRight,
    label: "Moved",
    color: "#3B82F6",
    bgColor: "rgba(59,130,246,0.15)",
  },
  swap: {
    icon: ArrowUpDown,
    label: "Swapped",
    color: "#8B5CF6",
    bgColor: "rgba(139,92,246,0.15)",
  },
  remove: {
    icon: Minus,
    label: "Removed",
    color: "#EF4444",
    bgColor: "rgba(239,68,68,0.15)",
  },
  rank_change: {
    icon: Activity,
    label: "Ranking saved",
    color: "#F59E0B",
    bgColor: "rgba(245,158,11,0.15)",
  },
};

/**
 * ActivityTimeline - Vertical timeline showing item ranking history.
 * Used in ItemInspector as a collapsible section.
 */
export function ActivityTimeline({ itemId }: ActivityTimelineProps) {
  const [data, setData] = useState<ActivityTimelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId) return;

    const fetchActivity = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/items/${itemId}/activity?limit=20`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // Non-critical, silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [itemId]);

  if (loading) {
    return (
      <div className="space-y-3 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-6 h-6 rounded-full bg-slate-800/50" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-2/3 bg-slate-800/50 rounded" />
              <div className="h-2 w-1/3 bg-slate-800/30 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.events.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-4">
        <Activity className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-sm text-slate-500">No activity yet</p>
        <p className="text-xs text-slate-600 mt-1">
          Ranking events will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mini Trajectory Sparkline */}
      {data.trajectory.length >= 2 && (
        <TrajectorySparkline points={data.trajectory} />
      )}

      {/* Event Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-3 top-3 bottom-3 w-px bg-slate-700/50" />

        <div className="space-y-1">
          {data.events.map((event, index) => (
            <TimelineEvent key={event.id} event={event} index={index} />
          ))}
        </div>
      </div>

      {data.totalEvents > data.events.length && (
        <p className="text-2xs text-slate-600 text-center">
          Showing {data.events.length} of {data.totalEvents} events
        </p>
      )}
    </div>
  );
}

function TimelineEvent({ event, index }: { event: ActivityEvent; index: number }) {
  const config = ACTION_CONFIG[event.action];
  const Icon = config.icon;

  const positionChange = useMemo(() => {
    if (event.position_before == null || event.position_after == null) return null;
    return event.position_after - event.position_before;
  }, [event.position_before, event.position_after]);

  const timeAgo = useMemo(() => formatTimeAgo(event.created_at), [event.created_at]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: DURATION.fast }}
      className="relative flex items-start gap-3 pl-0.5 py-1.5 group"
    >
      {/* Icon dot */}
      <div
        className="relative z-10 shrink-0 w-6 h-6 rounded-full flex items-center justify-center border"
        style={{
          background: config.bgColor,
          borderColor: `${config.color}40`,
        }}
      >
        <Icon className="w-3 h-3" style={{ color: config.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-300">
            {config.label}
          </span>
          {event.position_after != null && (
            <span
              className="text-2xs font-bold px-1 py-0.5 rounded"
              style={{ background: config.bgColor, color: config.color }}
            >
              #{event.position_after + 1}
            </span>
          )}
          {positionChange !== null && positionChange !== 0 && (
            <PositionChangeBadge change={positionChange} />
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          {event.list_title && (
            <span className="text-2xs text-slate-500 truncate max-w-[140px]">
              {event.list_title}
            </span>
          )}
          <span className="text-2xs text-slate-600 shrink-0">{timeAgo}</span>
        </div>
      </div>
    </motion.div>
  );
}

function PositionChangeBadge({ change }: { change: number }) {
  const improved = change < 0; // Lower position number = better rank
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-2xs font-bold px-1 py-0.5 rounded",
        improved
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-red-500/15 text-red-400"
      )}
    >
      {improved ? (
        <TrendingUp className="w-2.5 h-2.5" />
      ) : (
        <TrendingDown className="w-2.5 h-2.5" />
      )}
      {improved ? "+" : ""}
      {Math.abs(change)}
    </span>
  );
}

/**
 * Mini sparkline showing position trajectory over time.
 */
function TrajectorySparkline({ points }: { points: TrajectoryPoint[] }) {
  const { svgPath, minPos, maxPos, trend } = useMemo(() => {
    if (points.length < 2) return { svgPath: "", minPos: 0, maxPos: 0, trend: 0 };

    const positions = points.map((p) => p.position + 1); // 1-based for display
    const minP = Math.min(...positions);
    const maxP = Math.max(...positions);
    const range = Math.max(maxP - minP, 1);

    const width = 200;
    const height = 32;
    const padding = 4;

    const xStep = (width - padding * 2) / (points.length - 1);

    // SVG path - NOTE: y is inverted (lower position = higher on chart = better rank)
    const pathPoints = positions.map((pos, i) => {
      const x = padding + i * xStep;
      const y = padding + ((pos - minP) / range) * (height - padding * 2);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    });

    const trendVal = positions[positions.length - 1] - positions[0];

    return {
      svgPath: pathPoints.join(" "),
      minPos: minP,
      maxPos: maxP,
      trend: trendVal,
    };
  }, [points]);

  if (!svgPath) return null;

  const trendColor = trend < 0 ? "#10B981" : trend > 0 ? "#EF4444" : "#64748b";
  const trendLabel =
    trend < 0
      ? `Climbing (${Math.abs(trend)} positions)`
      : trend > 0
        ? `Falling (${trend} positions)`
        : "Stable";

  return (
    <div
      className="rounded-lg p-2"
      style={{
        background: `${trendColor}08`,
        border: `1px solid ${trendColor}20`,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-2xs text-slate-500 uppercase font-mono tracking-wide">
          Rank Trajectory
        </span>
        <span
          className="text-2xs font-medium px-1.5 py-0.5 rounded"
          style={{ background: `${trendColor}20`, color: trendColor }}
        >
          {trendLabel}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-2xs text-slate-600 font-mono">#{minPos}</span>
        <svg
          viewBox="0 0 200 32"
          className="flex-1 h-8"
          preserveAspectRatio="none"
        >
          <path
            d={svgPath}
            fill="none"
            stroke={trendColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Dots at endpoints */}
          {points.length > 0 && (
            <>
              <circle
                cx="4"
                cy={
                  4 +
                  ((points[0].position + 1 - (Math.min(...points.map(p => p.position + 1)))) /
                    Math.max(Math.max(...points.map(p => p.position + 1)) - Math.min(...points.map(p => p.position + 1)), 1)) *
                    24
                }
                r="2.5"
                fill={trendColor}
                opacity="0.5"
              />
              <circle
                cx={4 + (points.length - 1) * ((200 - 8) / (points.length - 1))}
                cy={
                  4 +
                  ((points[points.length - 1].position + 1 - (Math.min(...points.map(p => p.position + 1)))) /
                    Math.max(Math.max(...points.map(p => p.position + 1)) - Math.min(...points.map(p => p.position + 1)), 1)) *
                    24
                }
                r="3"
                fill={trendColor}
              />
            </>
          )}
        </svg>
        <span className="text-2xs text-slate-600 font-mono">#{maxPos}</span>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default ActivityTimeline;
