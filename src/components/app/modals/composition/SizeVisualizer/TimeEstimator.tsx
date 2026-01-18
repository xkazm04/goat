"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Zap, Brain, Coffee } from "lucide-react";
import {
  TimeEstimate,
  TimeEstimateFactor,
  CATEGORY_TIME_MULTIPLIERS,
  calculateComparisons,
} from "./types";

interface TimeEstimatorProps {
  size: number;
  category?: string;
  subcategory?: string;
  color: { primary: string; secondary: string; accent: string };
  compact?: boolean;
  showFactors?: boolean;
}

/**
 * Calculate time estimate for ranking
 */
function calculateTimeEstimate(
  size: number,
  category?: string,
  subcategory?: string
): TimeEstimate {
  // Base time calculation (minutes)
  // Approximately 15-30 seconds per comparison decision
  const comparisons = calculateComparisons(size);
  const baseSecondsPerComparison = 20;
  const baseMinutes = (comparisons * baseSecondsPerComparison) / 60;

  const factors: TimeEstimateFactor[] = [];

  // Apply category multiplier
  let multiplier = 1.0;
  if (category) {
    const categoryMultiplier = CATEGORY_TIME_MULTIPLIERS[category] || 1.0;
    multiplier *= categoryMultiplier;

    if (categoryMultiplier !== 1.0) {
      factors.push({
        category: category,
        multiplier: categoryMultiplier,
        reason:
          categoryMultiplier > 1.0
            ? "More nuanced decisions"
            : "Quicker decisions",
      });
    }
  }

  // Apply size complexity factor
  if (size > 50) {
    const complexityFactor = 1.15;
    multiplier *= complexityFactor;
    factors.push({
      category: "Large list",
      multiplier: complexityFactor,
      reason: "Decision fatigue increases",
    });
  }

  // Apply subcategory factor (more specific = slightly faster)
  if (subcategory) {
    const subcategoryFactor = 0.95;
    multiplier *= subcategoryFactor;
    factors.push({
      category: subcategory,
      multiplier: subcategoryFactor,
      reason: "Narrower focus speeds decisions",
    });
  }

  const estimatedMinutes = Math.round(baseMinutes * multiplier);

  // Calculate range (±20%)
  const variance = 0.2;
  const range = {
    min: Math.max(1, Math.round(estimatedMinutes * (1 - variance))),
    max: Math.round(estimatedMinutes * (1 + variance)),
  };

  // Determine difficulty
  let difficulty: "easy" | "medium" | "hard";
  if (estimatedMinutes <= 5) {
    difficulty = "easy";
  } else if (estimatedMinutes <= 15) {
    difficulty = "medium";
  } else {
    difficulty = "hard";
  }

  return {
    minutes: estimatedMinutes,
    range,
    factors,
    comparisons,
    difficulty,
  };
}

/**
 * Format minutes to human readable string
 */
function formatDuration(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Get difficulty icon and color
 */
function getDifficultyConfig(difficulty: "easy" | "medium" | "hard") {
  switch (difficulty) {
    case "easy":
      return {
        icon: Zap,
        label: "Quick",
        color: "#4ade80",
        description: "Perfect for a coffee break",
      };
    case "medium":
      return {
        icon: Brain,
        label: "Thoughtful",
        color: "#facc15",
        description: "Take your time",
      };
    case "hard":
      return {
        icon: Coffee,
        label: "Deep Dive",
        color: "#f97316",
        description: "Grab a drink",
      };
  }
}

/**
 * Time Estimator Component
 * Displays effort calculation for completing a ranking
 */
export const TimeEstimator = memo(function TimeEstimator({
  size,
  category,
  subcategory,
  color,
  compact = false,
  showFactors = false,
}: TimeEstimatorProps) {
  const estimate = useMemo(
    () => calculateTimeEstimate(size, category, subcategory),
    [size, category, subcategory]
  );

  const difficultyConfig = getDifficultyConfig(estimate.difficulty);
  const DifficultyIcon = difficultyConfig.icon;

  if (compact) {
    return (
      <motion.div
        className="flex items-center gap-1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Clock className="w-3 h-3 text-slate-400" />
        <span className="text-xs text-slate-400">
          ~{formatDuration(estimate.minutes)}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="rounded-xl p-4"
      style={{
        background: "rgba(15, 23, 42, 0.5)",
        border: `1px solid ${color.primary}20`,
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" style={{ color: color.accent }} />
          <span className="text-sm font-medium text-slate-300">
            Time Estimate
          </span>
        </div>
        <motion.div
          className="flex items-center gap-1.5 px-2 py-1 rounded-full"
          style={{
            background: `${difficultyConfig.color}20`,
            border: `1px solid ${difficultyConfig.color}40`,
          }}
          whileHover={{ scale: 1.05 }}
        >
          <DifficultyIcon
            className="w-3 h-3"
            style={{ color: difficultyConfig.color }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: difficultyConfig.color }}
          >
            {difficultyConfig.label}
          </span>
        </motion.div>
      </div>

      {/* Main estimate */}
      <div className="flex items-baseline gap-2 mb-2">
        <motion.span
          className="text-3xl font-bold"
          style={{
            background: `linear-gradient(135deg, ${color.primary}, ${color.accent})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
          key={estimate.minutes}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          {formatDuration(estimate.minutes)}
        </motion.span>
        <span className="text-xs text-slate-500">
          ({estimate.range.min}-{estimate.range.max} min)
        </span>
      </div>

      {/* Comparisons count */}
      <div className="text-xs text-slate-500 mb-3">
        ~{estimate.comparisons} comparisons to make
      </div>

      {/* Progress bar visualization */}
      <div className="relative h-2 rounded-full overflow-hidden bg-slate-700/50 mb-3">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${difficultyConfig.color}, ${color.accent})`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (estimate.minutes / 40) * 100)}%` }}
          transition={{ delay: 0.2, duration: 0.5 }}
        />
        {/* Markers */}
        <div className="absolute inset-0 flex justify-between px-1">
          {[5, 15, 30].map((marker) => (
            <div
              key={marker}
              className="w-px h-full bg-slate-600"
              style={{ marginLeft: `${(marker / 40) * 100}%` }}
            />
          ))}
        </div>
      </div>

      {/* Difficulty description */}
      <p className="text-xs text-slate-400">{difficultyConfig.description}</p>

      {/* Factors breakdown */}
      {showFactors && estimate.factors.length > 0 && (
        <motion.div
          className="mt-4 pt-3 border-t border-slate-700/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-xs font-medium text-slate-400 block mb-2">
            Factors:
          </span>
          <div className="space-y-1">
            {estimate.factors.map((factor, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-slate-500">{factor.category}</span>
                <span
                  className={
                    factor.multiplier > 1 ? "text-amber-400" : "text-green-400"
                  }
                >
                  {factor.multiplier > 1 ? "+" : ""}
                  {Math.round((factor.multiplier - 1) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
});

/**
 * Inline time badge for compact displays
 */
export const TimeBadge = memo(function TimeBadge({
  size,
  category,
  color,
}: {
  size: number;
  category?: string;
  color: { primary: string; secondary: string; accent: string };
}) {
  const estimate = useMemo(
    () => calculateTimeEstimate(size, category),
    [size, category]
  );

  const difficultyConfig = getDifficultyConfig(estimate.difficulty);

  return (
    <motion.div
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
      style={{
        background: `${difficultyConfig.color}15`,
        border: `1px solid ${difficultyConfig.color}30`,
        color: difficultyConfig.color,
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Clock className="w-3 h-3" />
      <span>~{formatDuration(estimate.minutes)}</span>
    </motion.div>
  );
});
