"use client";

import { motion } from "framer-motion";
import { useItemStat } from "@/hooks/use-item-stats";
import { TrendingUp, Award, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AverageRankingBadgeProps {
  itemId: string;
  /** Position of the badge on the item */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Show full stats or compact version */
  variant?: "compact" | "full";
  /** Custom className */
  className?: string;
}

/**
 * AverageRankingBadge Component
 *
 * Displays the average ranking badge overlay on draggable items.
 * Fetches real-time ranking data from the backend and shows:
 * - Average ranking position
 * - Percentile score
 * - Selection count
 *
 * Integrates with DragDistanceIndicator for cohesive visual feedback.
 */
export function AverageRankingBadge({
  itemId,
  position = "top-right",
  variant = "compact",
  className,
}: AverageRankingBadgeProps) {
  const { data: itemStat, isLoading, isError } = useItemStat(itemId, {
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Don't render if loading, error, or no data
  if (isLoading || isError || !itemStat) {
    return null;
  }

  const positionClasses = {
    "top-left": "top-2 left-2",
    "top-right": "top-2 right-2",
    "bottom-left": "bottom-2 left-2",
    "bottom-right": "bottom-2 right-2",
  };

  // Determine badge color based on percentile
  const getBadgeColor = (percentile: number) => {
    if (percentile >= 80) return "from-yellow-500/90 to-orange-500/90"; // Top 20%
    if (percentile >= 60) return "from-cyan-500/90 to-blue-500/90"; // Top 40%
    if (percentile >= 40) return "from-green-500/90 to-teal-500/90"; // Top 60%
    return "from-gray-500/90 to-gray-600/90"; // Bottom 40%
  };

  const badgeColor = getBadgeColor(itemStat.percentile);

  // Compact variant - just show ranking with icon
  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className={cn(
          "absolute z-10 pointer-events-none",
          positionClasses[position],
          className
        )}
        data-testid="average-ranking-badge-compact"
      >
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md backdrop-blur-md",
            "bg-gradient-to-r shadow-lg border border-white/20",
            badgeColor
          )}
        >
          <Award className="w-3 h-3 text-white" />
          <span className="text-xs font-bold text-white">
            #{itemStat.average_ranking}
          </span>
        </div>
      </motion.div>
    );
  }

  // Full variant - show more details
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={cn(
        "absolute z-10 pointer-events-none",
        positionClasses[position],
        className
      )}
      data-testid="average-ranking-badge-full"
    >
      <div
        className={cn(
          "flex flex-col gap-1 px-2.5 py-1.5 rounded-lg backdrop-blur-md",
          "bg-gradient-to-r shadow-xl border border-white/30",
          badgeColor
        )}
      >
        {/* Ranking */}
        <div className="flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-white" />
          <span className="text-sm font-bold text-white">
            #{itemStat.average_ranking}
          </span>
        </div>

        {/* Percentile */}
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-white/90" />
          <span className="text-xs font-medium text-white/90">
            Top {100 - itemStat.percentile}%
          </span>
        </div>

        {/* Selection count */}
        {itemStat.selection_count > 0 && (
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3 text-white/80" />
            <span className="text-xs font-medium text-white/80">
              {itemStat.selection_count} picks
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
