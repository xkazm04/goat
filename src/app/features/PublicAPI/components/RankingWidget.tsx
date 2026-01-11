"use client";

import React, { memo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, TrendingDown, Minus, Flame, Users, Zap } from "lucide-react";
import type { PublicRankingItem, WidgetConfig } from "@/types/api-keys";
import { cn } from "@/lib/utils";

interface RankingWidgetProps {
  config: Partial<WidgetConfig>;
  rankings?: PublicRankingItem[];
  isLoading?: boolean;
  error?: string;
}

const sizeClasses = {
  compact: {
    container: "max-w-xs",
    padding: "p-2",
    title: "text-sm",
    item: "py-1.5",
    rank: "text-xs w-6",
    name: "text-xs",
    image: "w-6 h-6",
  },
  default: {
    container: "max-w-sm",
    padding: "p-3",
    title: "text-base",
    item: "py-2",
    rank: "text-sm w-8",
    name: "text-sm",
    image: "w-8 h-8",
  },
  large: {
    container: "max-w-md",
    padding: "p-4",
    title: "text-lg",
    item: "py-3",
    rank: "text-base w-10",
    name: "text-base",
    image: "w-10 h-10",
  },
};

const themeClasses = {
  dark: {
    bg: "bg-gray-900",
    border: "border-gray-800",
    text: "text-white",
    muted: "text-gray-400",
    itemBg: "bg-gray-800/50",
    itemHover: "hover:bg-gray-800",
    accent: "text-cyan-400",
  },
  light: {
    bg: "bg-white",
    border: "border-gray-200",
    text: "text-gray-900",
    muted: "text-gray-500",
    itemBg: "bg-gray-50",
    itemHover: "hover:bg-gray-100",
    accent: "text-cyan-600",
  },
  auto: {
    bg: "bg-gray-900 dark:bg-gray-900",
    border: "border-gray-800 dark:border-gray-800",
    text: "text-white dark:text-white",
    muted: "text-gray-400 dark:text-gray-400",
    itemBg: "bg-gray-800/50 dark:bg-gray-800/50",
    itemHover: "hover:bg-gray-800 dark:hover:bg-gray-800",
    accent: "text-cyan-400 dark:text-cyan-400",
  },
};

function VolatilityBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    stable: "bg-emerald-500/20 text-emerald-400",
    moderate: "bg-cyan-500/20 text-cyan-400",
    contested: "bg-amber-500/20 text-amber-400",
    polarizing: "bg-rose-500/20 text-rose-400",
  };

  const icons: Record<string, React.ReactNode> = {
    stable: <Zap className="w-3 h-3" />,
    moderate: <Users className="w-3 h-3" />,
    contested: <TrendingUp className="w-3 h-3" />,
    polarizing: <Flame className="w-3 h-3" />,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
        colors[level] || colors.moderate
      )}
      data-testid={`volatility-badge-${level}`}
    >
      {icons[level]}
      {level}
    </span>
  );
}

function TrendIndicator({ direction, change }: { direction: string; change: number }) {
  if (direction === "up") {
    return (
      <span className="inline-flex items-center text-emerald-400 text-xs" data-testid="trend-up">
        <TrendingUp className="w-3 h-3 mr-0.5" />+{Math.abs(change)}
      </span>
    );
  }
  if (direction === "down") {
    return (
      <span className="inline-flex items-center text-rose-400 text-xs" data-testid="trend-down">
        <TrendingDown className="w-3 h-3 mr-0.5" />-{Math.abs(change)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-gray-400 text-xs" data-testid="trend-stable">
      <Minus className="w-3 h-3" />
    </span>
  );
}

function RankBadge({ rank, size }: { rank: number; size: string }) {
  const isTop3 = rank <= 3;
  const colors = ["text-yellow-400", "text-gray-300", "text-amber-600"];

  return (
    <span
      className={cn(
        "font-bold flex items-center justify-center",
        sizeClasses[size as keyof typeof sizeClasses]?.rank || sizeClasses.default.rank,
        isTop3 ? colors[rank - 1] : "text-gray-500"
      )}
      data-testid={`rank-badge-${rank}`}
    >
      {isTop3 ? <Trophy className="w-4 h-4" /> : `#${rank}`}
    </span>
  );
}

export const RankingWidget = memo(function RankingWidget({
  config,
  rankings = [],
  isLoading = false,
  error,
}: RankingWidgetProps) {
  const theme = config.theme || "dark";
  const size = config.size || "default";
  const limit = config.limit || 10;
  const showVolatility = config.showVolatility ?? false;

  const sizes = sizeClasses[size];
  const themes = themeClasses[theme];
  const displayRankings = rankings.slice(0, limit);

  if (error) {
    return (
      <div
        className={cn(
          "rounded-xl border",
          sizes.container,
          sizes.padding,
          themes.bg,
          themes.border
        )}
        data-testid="ranking-widget-error"
      >
        <p className={cn("text-sm", themes.muted)}>{error}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        sizes.container,
        themes.bg,
        themes.border
      )}
      data-testid="ranking-widget"
    >
      {/* Header */}
      <div className={cn("border-b", sizes.padding, themes.border)}>
        <div className="flex items-center justify-between">
          <h3 className={cn("font-semibold", sizes.title, themes.text)}>
            {config.category ? `Top ${limit} ${config.category}` : "GOAT Rankings"}
          </h3>
          <a
            href="https://goat.app"
            target="_blank"
            rel="noopener noreferrer"
            className={cn("text-xs", themes.muted, "hover:opacity-80")}
            data-testid="powered-by-goat"
          >
            Powered by GOAT
          </a>
        </div>
        {config.subcategory && (
          <p className={cn("text-xs mt-1", themes.muted)}>{config.subcategory}</p>
        )}
      </div>

      {/* Rankings List */}
      <div className={cn("divide-y", `divide-${themes.border.replace("border-", "")}`)}>
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: limit }).map((_, i) => (
            <div
              key={i}
              className={cn("flex items-center gap-3", sizes.padding, sizes.item)}
              data-testid={`ranking-skeleton-${i}`}
            >
              <div className={cn("rounded bg-gray-700 animate-pulse", sizes.rank, "h-4")} />
              <div className={cn("rounded-md bg-gray-700 animate-pulse", sizes.image)} />
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4" />
              </div>
            </div>
          ))
        ) : (
          displayRankings.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex items-center gap-3 transition-colors",
                sizes.padding,
                sizes.item,
                themes.itemHover
              )}
              data-testid={`ranking-item-${item.id}`}
            >
              <RankBadge rank={item.consensus.rank} size={size} />

              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className={cn("rounded-md object-cover", sizes.image)}
                  data-testid={`ranking-item-image-${item.id}`}
                />
              )}

              <div className="flex-1 min-w-0">
                <p
                  className={cn("font-medium truncate", sizes.name, themes.text)}
                  title={item.name}
                  data-testid={`ranking-item-name-${item.id}`}
                >
                  {item.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {showVolatility && (
                    <VolatilityBadge level={item.consensus.volatilityLevel} />
                  )}
                  {item.extended?.trend && (
                    <TrendIndicator
                      direction={item.extended.trend.direction}
                      change={item.extended.trend.change}
                    />
                  )}
                </div>
              </div>

              <div className="text-right">
                <span
                  className={cn("text-xs", themes.muted)}
                  data-testid={`ranking-item-rankings-${item.id}`}
                >
                  {item.consensus.totalRankings.toLocaleString()} votes
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className={cn("border-t", sizes.padding, themes.border)}>
        <a
          href={`https://goat.app/explore/${config.category?.toLowerCase() || ""}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("text-xs font-medium", themes.accent, "hover:underline")}
          data-testid="view-full-rankings"
        >
          View full rankings on GOAT →
        </a>
      </div>
    </div>
  );
});

export default RankingWidget;
