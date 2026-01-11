"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Trophy, Flame, TrendingUp, TrendingDown, Star, Sparkles } from "lucide-react";
import type { PublicRankingItem, WidgetConfig } from "@/types/api-keys";
import { cn } from "@/lib/utils";

interface ItemBadgeProps {
  item?: PublicRankingItem;
  config: Partial<WidgetConfig>;
  isLoading?: boolean;
  error?: string;
}

const sizeClasses = {
  compact: {
    container: "h-8 px-2",
    icon: "w-4 h-4",
    text: "text-xs",
    rank: "text-sm font-bold",
  },
  default: {
    container: "h-10 px-3",
    icon: "w-5 h-5",
    text: "text-sm",
    rank: "text-base font-bold",
  },
  large: {
    container: "h-12 px-4",
    icon: "w-6 h-6",
    text: "text-base",
    rank: "text-lg font-bold",
  },
};

const themeClasses = {
  dark: {
    bg: "bg-gradient-to-r from-gray-900 to-gray-800",
    border: "border-gray-700",
    text: "text-white",
    muted: "text-gray-400",
    glow: "shadow-lg shadow-cyan-500/20",
  },
  light: {
    bg: "bg-gradient-to-r from-white to-gray-50",
    border: "border-gray-200",
    text: "text-gray-900",
    muted: "text-gray-500",
    glow: "shadow-lg shadow-cyan-500/10",
  },
  auto: {
    bg: "bg-gradient-to-r from-gray-900 to-gray-800",
    border: "border-gray-700",
    text: "text-white",
    muted: "text-gray-400",
    glow: "shadow-lg shadow-cyan-500/20",
  },
};

function getRankColor(rank: number): string {
  if (rank === 1) return "text-yellow-400";
  if (rank === 2) return "text-gray-300";
  if (rank === 3) return "text-amber-500";
  if (rank <= 10) return "text-cyan-400";
  return "text-gray-400";
}

function getVolatilityIcon(level: string) {
  switch (level) {
    case "polarizing":
      return <Flame className="w-3 h-3 text-rose-400" />;
    case "contested":
      return <TrendingUp className="w-3 h-3 text-amber-400" />;
    default:
      return null;
  }
}

export const ItemBadge = memo(function ItemBadge({
  item,
  config,
  isLoading = false,
  error,
}: ItemBadgeProps) {
  const theme = config.theme || "dark";
  const size = config.size || "default";
  const showVolatility = config.showVolatility ?? false;

  const sizes = sizeClasses[size];
  const themes = themeClasses[theme];

  if (error) {
    return (
      <div
        className={cn(
          "inline-flex items-center rounded-full border",
          sizes.container,
          themes.bg,
          themes.border
        )}
        data-testid="item-badge-error"
      >
        <span className={cn(sizes.text, themes.muted)}>Error loading</span>
      </div>
    );
  }

  if (isLoading || !item) {
    return (
      <div
        className={cn(
          "inline-flex items-center rounded-full border animate-pulse",
          sizes.container,
          themes.bg,
          themes.border
        )}
        data-testid="item-badge-loading"
      >
        <div className="w-16 h-4 bg-gray-700 rounded" />
      </div>
    );
  }

  const rank = item.consensus.rank;
  const isTopRank = rank <= 3;

  return (
    <motion.a
      href={`https://goat.app/item/${item.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border transition-all",
        sizes.container,
        themes.bg,
        themes.border,
        themes.glow,
        "hover:scale-105"
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      data-testid={`item-badge-${item.id}`}
    >
      {/* Rank Icon */}
      {isTopRank ? (
        <Trophy className={cn(sizes.icon, getRankColor(rank))} />
      ) : (
        <Star className={cn(sizes.icon, getRankColor(rank))} />
      )}

      {/* Rank Number */}
      <span className={cn(sizes.rank, getRankColor(rank))} data-testid="item-badge-rank">
        #{rank}
      </span>

      {/* Divider */}
      <div className={cn("w-px h-4 bg-gray-600")} />

      {/* GOAT Label */}
      <div className="flex items-center gap-1">
        <span className={cn(sizes.text, themes.text, "font-medium")}>GOAT</span>
        <Sparkles className="w-3 h-3 text-cyan-400" />
      </div>

      {/* Volatility indicator */}
      {showVolatility && getVolatilityIcon(item.consensus.volatilityLevel)}

      {/* Trend indicator */}
      {item.extended?.trend && item.extended.trend.direction !== "stable" && (
        <>
          {item.extended.trend.direction === "up" ? (
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3 h-3 text-rose-400" />
          )}
        </>
      )}
    </motion.a>
  );
});

export default ItemBadge;
