"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Trophy, Crown } from "lucide-react";

type DiffStatus = "winner" | "loser" | "neutral" | "tie";

interface DiffIndicatorProps {
  status: DiffStatus;
  isOverallWinner?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

const SIZE_CONFIG = {
  sm: {
    icon: "w-3 h-3",
    badge: "px-1.5 py-0.5 text-xs",
    dot: "w-1.5 h-1.5",
  },
  md: {
    icon: "w-4 h-4",
    badge: "px-2 py-1 text-xs",
    dot: "w-2 h-2",
  },
  lg: {
    icon: "w-5 h-5",
    badge: "px-2.5 py-1 text-sm",
    dot: "w-2.5 h-2.5",
  },
};

const STATUS_CONFIG: Record<
  DiffStatus,
  {
    bg: string;
    text: string;
    border: string;
    glow: string;
    icon: typeof TrendingUp;
    label: string;
  }
> = {
  winner: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-400",
    border: "border-emerald-500/40",
    glow: "shadow-emerald-500/30",
    icon: TrendingUp,
    label: "Best",
  },
  loser: {
    bg: "bg-rose-500/10",
    text: "text-rose-400/70",
    border: "border-rose-500/20",
    glow: "",
    icon: TrendingDown,
    label: "Lower",
  },
  neutral: {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/20",
    glow: "",
    icon: Minus,
    label: "—",
  },
  tie: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
    glow: "shadow-amber-500/20",
    icon: Minus,
    label: "Tie",
  },
};

/**
 * DiffIndicator - Visual indicator for better/worse/neutral comparison results
 */
export const DiffIndicator = memo(function DiffIndicator({
  status,
  isOverallWinner = false,
  showLabel = false,
  size = "md",
  animated = true,
}: DiffIndicatorProps) {
  const sizeConfig = SIZE_CONFIG[size];
  const statusConfig = STATUS_CONFIG[status];
  const Icon = isOverallWinner ? Crown : statusConfig.icon;

  const indicator = (
    <div
      className={`
        inline-flex items-center gap-1 rounded-full
        ${sizeConfig.badge}
        ${statusConfig.bg}
        ${statusConfig.text}
        border ${statusConfig.border}
        ${status === "winner" || isOverallWinner ? `shadow-lg ${statusConfig.glow}` : ""}
      `}
    >
      <Icon className={sizeConfig.icon} />
      {showLabel && <span className="font-medium">{statusConfig.label}</span>}
    </div>
  );

  if (animated && status === "winner") {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        {indicator}
      </motion.div>
    );
  }

  return indicator;
});

/**
 * WinnerBadge - Special badge for overall winner
 */
interface WinnerBadgeProps {
  wins: number;
  total: number;
  percentage: number;
  size?: "sm" | "md" | "lg";
}

export const WinnerBadge = memo(function WinnerBadge({
  wins,
  total,
  percentage,
  size = "md",
}: WinnerBadgeProps) {
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <motion.div
      className={`
        inline-flex items-center gap-1.5 rounded-full
        ${sizeConfig.badge}
        bg-gradient-to-r from-amber-500/20 to-yellow-500/20
        text-amber-400
        border border-amber-500/40
        shadow-lg shadow-amber-500/20
      `}
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
    >
      <Trophy className={sizeConfig.icon} />
      <span className="font-semibold">
        {wins}/{total}
      </span>
      <span className="text-amber-500/70">({percentage}%)</span>
    </motion.div>
  );
});

/**
 * ComparisonDot - Minimal dot indicator for compact views
 */
interface ComparisonDotProps {
  status: DiffStatus;
  size?: "sm" | "md" | "lg";
}

export const ComparisonDot = memo(function ComparisonDot({
  status,
  size = "md",
}: ComparisonDotProps) {
  const sizeConfig = SIZE_CONFIG[size];
  const statusConfig = STATUS_CONFIG[status];

  return (
    <motion.div
      className={`
        ${sizeConfig.dot} rounded-full
        ${status === "winner" ? "bg-emerald-400" : ""}
        ${status === "loser" ? "bg-rose-400/50" : ""}
        ${status === "neutral" ? "bg-slate-500/50" : ""}
        ${status === "tie" ? "bg-amber-400" : ""}
        ${status === "winner" ? "shadow-md shadow-emerald-500/50" : ""}
      `}
      initial={status === "winner" ? { scale: 0 } : {}}
      animate={status === "winner" ? { scale: 1 } : {}}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
    />
  );
});

/**
 * getDiffStatus - Helper to determine status from comparison result
 */
export function getDiffStatus(
  itemIndex: number,
  winnerIndex: number | null
): DiffStatus {
  if (winnerIndex === null) return "neutral";
  if (itemIndex === winnerIndex) return "winner";
  return "loser";
}

export type { DiffStatus };
