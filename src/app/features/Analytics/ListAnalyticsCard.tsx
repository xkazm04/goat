"use client";

import { motion } from "framer-motion";
import { Eye, Share2, Users, Activity, Award, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

import { SparklineChart } from "./SparklineChart";

import type { CreatorListAnalytics } from "@/types/top-lists";

interface ListAnalyticsCardProps {
  analytics: CreatorListAnalytics;
  className?: string;
}

function MetricPill({
  icon,
  value,
  label,
  color = "text-slate-300",
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={cn("opacity-60", color)}>{icon}</span>
      <span className={cn("font-semibold", color)}>{value}</span>
      <span className="text-slate-500 hidden sm:inline">{label}</span>
    </div>
  );
}

export function ListAnalyticsCard({
  analytics,
  className,
}: ListAnalyticsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-3",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-100 truncate">
            {analytics.title}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-500 capitalize">
              {analytics.category}
            </span>
            <span className="text-xs text-slate-600">
              Top {analytics.size}
            </span>
          </div>
        </div>
        <span className="text-xs text-slate-600 whitespace-nowrap">
          {analytics.items_ranked}/{analytics.size} ranked
        </span>
      </div>

      {/* Metrics row */}
      <div className="flex flex-wrap gap-3">
        <MetricPill
          icon={<Eye className="w-3 h-3" />}
          value={analytics.total_views}
          label="views"
          color="text-brand-hover"
        />
        <MetricPill
          icon={<Share2 className="w-3 h-3" />}
          value={analytics.share_count}
          label="shares"
          color="text-purple-400"
        />
        <MetricPill
          icon={<Users className="w-3 h-3" />}
          value={analytics.unique_rankers}
          label="rankers"
          color="text-emerald-400"
        />
        <MetricPill
          icon={<Activity className="w-3 h-3" />}
          value={analytics.total_activities}
          label="actions"
          color="text-amber-400"
        />
      </div>

      {/* Sparkline */}
      <div className="pt-1">
        <SparklineChart data={analytics.views_over_time} height={40} />
      </div>

      {/* Top items */}
      {analytics.top_items.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-slate-500 font-medium">Most Interacted</p>
          <div className="flex flex-wrap gap-1.5">
            {analytics.top_items.slice(0, 5).map((item) => (
              <div
                key={item.item_id}
                className="flex items-center gap-1.5 rounded-full bg-slate-700/40 px-2 py-0.5"
              >
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt=""
                    className="w-4 h-4 rounded-full object-cover"
                  />
                )}
                <span className="text-xs text-slate-300 truncate max-w-[100px]">
                  {item.name}
                </span>
                {item.avg_position != null && (
                  <span className="text-2xs text-slate-500">
                    #{item.avg_position}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consensus */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-700/30">
        <div className="flex items-center gap-1.5 text-xs">
          <Award className="w-3 h-3 text-emerald-400 opacity-60" />
          <span className="text-slate-400">Agreement</span>
          {analytics.consensus.agreement_rate == null ? (
            <span className="font-semibold text-slate-500">Not enough data</span>
          ) : (
            <span
              className={cn(
                "font-semibold",
                analytics.consensus.agreement_rate >= 0.7
                  ? "text-emerald-400"
                  : analytics.consensus.agreement_rate >= 0.4
                  ? "text-amber-400"
                  : "text-rose-400"
              )}
            >
              {Math.round(analytics.consensus.agreement_rate * 100)}%
            </span>
          )}
        </div>

        {analytics.consensus.most_controversial.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <AlertTriangle className="w-3 h-3 text-rose-400/50" />
            <span className="truncate max-w-[120px]">
              {analytics.consensus.most_controversial[0].name}
            </span>
            <span className="text-rose-400/70 text-2xs">
              controversial
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
