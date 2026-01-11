"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Trophy, Flame, Users, ChevronRight, Sparkles } from "lucide-react";
import type { PublicRankingItem, WidgetConfig } from "@/types/api-keys";
import { cn } from "@/lib/utils";

interface ComparisonWidgetProps {
  items: PublicRankingItem[];
  config: Partial<WidgetConfig>;
  isLoading?: boolean;
  error?: string;
}

const themeClasses = {
  dark: {
    bg: "bg-gray-900",
    border: "border-gray-800",
    text: "text-white",
    muted: "text-gray-400",
    card: "bg-gray-800/50",
    cardBorder: "border-gray-700",
    accent: "text-cyan-400",
  },
  light: {
    bg: "bg-white",
    border: "border-gray-200",
    text: "text-gray-900",
    muted: "text-gray-500",
    card: "bg-gray-50",
    cardBorder: "border-gray-200",
    accent: "text-cyan-600",
  },
  auto: {
    bg: "bg-gray-900",
    border: "border-gray-800",
    text: "text-white",
    muted: "text-gray-400",
    card: "bg-gray-800/50",
    cardBorder: "border-gray-700",
    accent: "text-cyan-400",
  },
};

function RankDisplay({
  rank,
  size = "default",
}: {
  rank: number;
  size?: "compact" | "default" | "large";
}) {
  const sizeClasses = {
    compact: "text-2xl",
    default: "text-3xl",
    large: "text-4xl",
  };

  const colorClasses =
    rank === 1
      ? "text-yellow-400"
      : rank === 2
        ? "text-gray-300"
        : rank === 3
          ? "text-amber-500"
          : rank <= 10
            ? "text-cyan-400"
            : "text-gray-500";

  return (
    <div className="flex items-center gap-1">
      {rank <= 3 && <Trophy className="w-5 h-5" style={{ color: "inherit" }} />}
      <span className={cn("font-bold", sizeClasses[size], colorClasses)}>#{rank}</span>
    </div>
  );
}

function VolatilityBar({
  level,
  confidence,
}: {
  level: string;
  confidence: number;
}) {
  const colors: Record<string, string> = {
    stable: "bg-emerald-400",
    moderate: "bg-cyan-400",
    contested: "bg-amber-400",
    polarizing: "bg-rose-400",
  };

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span className="capitalize">{level}</span>
        <span>{Math.round(confidence * 100)}% confident</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", colors[level] || colors.moderate)}
          initial={{ width: 0 }}
          animate={{ width: `${confidence * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function ItemCard({
  item,
  isWinner,
  themes,
  size,
}: {
  item: PublicRankingItem;
  isWinner: boolean;
  themes: (typeof themeClasses)["dark"];
  size: string;
}) {
  return (
    <motion.div
      className={cn(
        "flex-1 rounded-xl border p-4",
        themes.card,
        themes.cardBorder,
        isWinner && "ring-2 ring-cyan-400/50"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid={`comparison-item-${item.id}`}
    >
      {/* Winner badge */}
      {isWinner && (
        <div className="flex items-center gap-1 text-cyan-400 text-xs font-medium mb-2">
          <Sparkles className="w-3 h-3" />
          Community Favorite
        </div>
      )}

      {/* Image */}
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-32 object-cover rounded-lg mb-3"
          data-testid={`comparison-item-image-${item.id}`}
        />
      )}

      {/* Name */}
      <h4
        className={cn("font-semibold mb-2 line-clamp-2", themes.text)}
        data-testid={`comparison-item-name-${item.id}`}
      >
        {item.name}
      </h4>

      {/* Rank */}
      <RankDisplay rank={item.consensus.rank} size={size as "compact" | "default" | "large"} />

      {/* Stats */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className={themes.muted}>Total votes</span>
          <span className={cn("font-medium", themes.text)}>
            {item.consensus.totalRankings.toLocaleString()}
          </span>
        </div>
        <VolatilityBar
          level={item.consensus.volatilityLevel}
          confidence={item.consensus.confidence}
        />
      </div>

      {/* Peer clusters */}
      {item.extended?.peerClusters && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className={cn("text-xs mb-2", themes.muted)}>Community breakdown:</p>
          <div className="space-y-1">
            {item.extended.peerClusters.map((cluster) => (
              <div
                key={cluster.label}
                className="flex items-center justify-between text-xs"
                data-testid={`comparison-cluster-${cluster.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <span className={themes.muted}>{cluster.label}</span>
                <span className={themes.text}>#{cluster.medianRank}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export const ComparisonWidget = memo(function ComparisonWidget({
  items,
  config,
  isLoading = false,
  error,
}: ComparisonWidgetProps) {
  const theme = config.theme || "dark";
  const size = config.size || "default";
  const themes = themeClasses[theme];

  if (error) {
    return (
      <div
        className={cn("rounded-xl border p-4", themes.bg, themes.border)}
        data-testid="comparison-widget-error"
      >
        <p className={themes.muted}>{error}</p>
      </div>
    );
  }

  if (isLoading || items.length < 2) {
    return (
      <div
        className={cn("rounded-xl border p-4", themes.bg, themes.border)}
        data-testid="comparison-widget-loading"
      >
        <div className="flex gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex-1 animate-pulse">
              <div className="h-32 bg-gray-700 rounded-lg mb-3" />
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-8 bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const [item1, item2] = items;
  const winner =
    item1.consensus.medianRank <= item2.consensus.medianRank ? item1.id : item2.id;

  return (
    <div
      className={cn("rounded-xl border overflow-hidden", themes.bg, themes.border)}
      data-testid="comparison-widget"
    >
      {/* Header */}
      <div className={cn("border-b p-3 flex items-center justify-between", themes.border)}>
        <h3 className={cn("font-semibold", themes.text)}>GOAT Comparison</h3>
        <a
          href="https://goat.app"
          target="_blank"
          rel="noopener noreferrer"
          className={cn("text-xs", themes.muted, "hover:opacity-80")}
          data-testid="powered-by-goat-comparison"
        >
          Powered by GOAT
        </a>
      </div>

      {/* Items */}
      <div className="p-4">
        <div className="flex gap-4">
          <ItemCard
            item={item1}
            isWinner={item1.id === winner}
            themes={themes}
            size={size}
          />
          <div className="flex items-center">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                themes.card,
                themes.cardBorder,
                "border"
              )}
            >
              <span className={cn("text-sm font-bold", themes.accent)}>VS</span>
            </div>
          </div>
          <ItemCard
            item={item2}
            isWinner={item2.id === winner}
            themes={themes}
            size={size}
          />
        </div>
      </div>

      {/* Footer */}
      <div className={cn("border-t p-3", themes.border)}>
        <a
          href={`https://goat.app/compare?items=${item1.id},${item2.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center justify-center gap-1 text-sm font-medium",
            themes.accent,
            "hover:underline"
          )}
          data-testid="compare-on-goat"
        >
          Compare on GOAT
          <ChevronRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
});

export default ComparisonWidget;
