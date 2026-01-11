"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface RankingProgressIndicatorProps {
  /** Number of filled/ranked positions */
  filled: number;
  /** Total number of positions */
  total: number;
  /** Primary color for the progress indicator */
  primaryColor?: string;
  /** Secondary color for the gradient */
  secondaryColor?: string;
  /** Variant: 'arc' for circular or 'bar' for linear segmented */
  variant?: "arc" | "bar";
  /** Size: 'sm' for compact, 'md' for default */
  size?: "sm" | "md";
  /** Show completion status text */
  showText?: boolean;
  /** Test ID prefix for testing */
  testIdPrefix?: string;
}

/**
 * Visual progress indicator for ranking completion.
 * Shows how many positions are filled in a list (e.g., 7/10 ranked).
 *
 * Features:
 * - Circular arc or segmented bar display
 * - Category-themed accent colors
 * - Subtle pulse animation when incomplete
 * - Opacity-based fill states for segments
 */
export const RankingProgressIndicator = memo(function RankingProgressIndicator({
  filled,
  total,
  primaryColor = "#06b6d4",
  secondaryColor = "#22d3ee",
  variant = "bar",
  size = "sm",
  showText = true,
  testIdPrefix = "ranking-progress",
}: RankingProgressIndicatorProps) {
  const prefersReducedMotion = useReducedMotion();

  const percentage = useMemo(() => {
    if (total === 0) return 0;
    return Math.round((filled / total) * 100);
  }, [filled, total]);

  const isComplete = percentage >= 100;
  const isStarted = filled > 0;

  // Generate segment data for the segmented bar variant
  const segments = useMemo(() => {
    // Cap at 10 visible segments for readability
    const displaySegments = Math.min(total, 10);
    const itemsPerSegment = total / displaySegments;

    return Array.from({ length: displaySegments }, (_, i) => {
      const segmentStart = i * itemsPerSegment;
      const segmentEnd = (i + 1) * itemsPerSegment;

      // Calculate fill level for this segment (0 = empty, 1 = full)
      let fillLevel = 0;
      if (filled >= segmentEnd) {
        fillLevel = 1;
      } else if (filled > segmentStart) {
        fillLevel = (filled - segmentStart) / itemsPerSegment;
      }

      return { index: i, fillLevel };
    });
  }, [filled, total]);

  if (variant === "arc") {
    return (
      <ArcProgress
        percentage={percentage}
        filled={filled}
        total={total}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        size={size}
        showText={showText}
        isComplete={isComplete}
        isStarted={isStarted}
        prefersReducedMotion={prefersReducedMotion}
        testIdPrefix={testIdPrefix}
      />
    );
  }

  return (
    <SegmentedBar
      segments={segments}
      filled={filled}
      total={total}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      size={size}
      showText={showText}
      isComplete={isComplete}
      isStarted={isStarted}
      prefersReducedMotion={prefersReducedMotion}
      testIdPrefix={testIdPrefix}
    />
  );
});

// Segmented bar variant
const SegmentedBar = memo(function SegmentedBar({
  segments,
  filled,
  total,
  primaryColor,
  secondaryColor,
  size,
  showText,
  isComplete,
  isStarted,
  prefersReducedMotion,
  testIdPrefix,
}: {
  segments: Array<{ index: number; fillLevel: number }>;
  filled: number;
  total: number;
  primaryColor: string;
  secondaryColor: string;
  size: "sm" | "md";
  showText: boolean;
  isComplete: boolean;
  isStarted: boolean;
  prefersReducedMotion: boolean;
  testIdPrefix: string;
}) {
  const barHeight = size === "sm" ? "h-1" : "h-1.5";
  const gap = size === "sm" ? "gap-0.5" : "gap-1";

  return (
    <div
      className="flex items-center gap-2"
      data-testid={`${testIdPrefix}-bar`}
      role="progressbar"
      aria-valuenow={filled}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`Ranking progress: ${filled} of ${total} ranked`}
    >
      {/* Segmented progress bar */}
      <motion.div
        className={`flex ${gap} flex-1 min-w-0`}
        initial={prefersReducedMotion ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {segments.map(({ index, fillLevel }) => (
          <motion.div
            key={index}
            className={`${barHeight} flex-1 rounded-full overflow-hidden`}
            style={{
              background: `rgba(255, 255, 255, 0.08)`,
            }}
            data-testid={`${testIdPrefix}-segment-${index}`}
          >
            <motion.div
              className={`${barHeight} rounded-full`}
              style={{
                background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
                boxShadow: fillLevel > 0 ? `0 0 6px ${primaryColor}40` : undefined,
              }}
              initial={prefersReducedMotion ? { width: `${fillLevel * 100}%` } : { width: 0 }}
              animate={{
                width: `${fillLevel * 100}%`,
                opacity: fillLevel > 0 ? 1 : 0,
              }}
              transition={{
                duration: 0.4,
                delay: index * 0.03,
                ease: "easeOut"
              }}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Progress text */}
      {showText && (
        <motion.div
          className="flex items-center gap-1 flex-shrink-0"
          initial={prefersReducedMotion ? {} : { opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <span
            className="text-xs font-medium tabular-nums"
            style={{
              color: isComplete ? secondaryColor : isStarted ? primaryColor : "rgb(148, 163, 184)",
            }}
            data-testid={`${testIdPrefix}-filled`}
          >
            {filled}
          </span>
          <span className="text-xs text-slate-500">/</span>
          <span
            className="text-xs text-slate-400 tabular-nums"
            data-testid={`${testIdPrefix}-total`}
          >
            {total}
          </span>

          {/* Pulse indicator for incomplete lists */}
          {!isComplete && isStarted && !prefersReducedMotion && (
            <motion.div
              className="w-1.5 h-1.5 rounded-full ml-1"
              style={{
                background: primaryColor,
                boxShadow: `0 0 6px ${primaryColor}60`,
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              data-testid={`${testIdPrefix}-pulse`}
            />
          )}

          {/* Completion indicator */}
          {isComplete && (
            <motion.svg
              className="w-3 h-3 ml-1"
              viewBox="0 0 16 16"
              initial={prefersReducedMotion ? {} : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              data-testid={`${testIdPrefix}-complete`}
            >
              <motion.circle
                cx="8"
                cy="8"
                r="7"
                fill={primaryColor}
                fillOpacity="0.2"
              />
              <motion.path
                d="M5 8l2 2 4-4"
                stroke={secondaryColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={prefersReducedMotion ? {} : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              />
            </motion.svg>
          )}
        </motion.div>
      )}
    </div>
  );
});

// Circular arc variant
const ArcProgress = memo(function ArcProgress({
  percentage,
  filled,
  total,
  primaryColor,
  secondaryColor,
  size,
  showText,
  isComplete,
  isStarted,
  prefersReducedMotion,
  testIdPrefix,
}: {
  percentage: number;
  filled: number;
  total: number;
  primaryColor: string;
  secondaryColor: string;
  size: "sm" | "md";
  showText: boolean;
  isComplete: boolean;
  isStarted: boolean;
  prefersReducedMotion: boolean;
  testIdPrefix: string;
}) {
  const svgSize = size === "sm" ? 28 : 36;
  const strokeWidth = size === "sm" ? 3 : 4;
  const radius = (svgSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className="flex items-center gap-2"
      data-testid={`${testIdPrefix}-arc`}
      role="progressbar"
      aria-valuenow={filled}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`Ranking progress: ${filled} of ${total} ranked`}
    >
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg
          width={svgSize}
          height={svgSize}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={strokeWidth}
          />

          {/* Progress arc */}
          <motion.circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke={`url(#progress-gradient-${testIdPrefix})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={prefersReducedMotion ? { strokeDashoffset } : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              filter: isStarted ? `drop-shadow(0 0 4px ${primaryColor}50)` : undefined,
            }}
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient
              id={`progress-gradient-${testIdPrefix}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor={primaryColor} />
              <stop offset="100%" stopColor={secondaryColor} />
            </linearGradient>
          </defs>
        </svg>

        {/* Center text */}
        {showText && size === "md" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-[10px] font-bold tabular-nums"
              style={{ color: isComplete ? secondaryColor : primaryColor }}
            >
              {percentage}%
            </span>
          </div>
        )}

        {/* Pulse animation for incomplete */}
        {!isComplete && isStarted && !prefersReducedMotion && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              border: `1px solid ${primaryColor}`,
            }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.4, 0, 0.4],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </div>

      {/* Text label beside arc */}
      {showText && (
        <div className="flex flex-col">
          <span
            className="text-xs font-medium leading-none"
            style={{
              color: isComplete ? secondaryColor : isStarted ? primaryColor : "rgb(148, 163, 184)",
            }}
            data-testid={`${testIdPrefix}-label`}
          >
            {filled}/{total}
          </span>
          <span className="text-[10px] text-slate-500 leading-tight">
            {isComplete ? "Complete" : "ranked"}
          </span>
        </div>
      )}
    </div>
  );
});
