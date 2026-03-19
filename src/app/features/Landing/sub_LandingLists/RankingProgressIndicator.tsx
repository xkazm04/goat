"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { DURATION } from '@/lib/animations/motion-presets';
import { useSimpleAnimationPause } from "@/hooks/use-animation-pause";

interface RankingProgressIndicatorProps {
  /** Number of filled/ranked positions */
  filled: number;
  /** Total number of positions */
  total: number;
  /** Primary color for the progress indicator */
  primaryColor?: string;
  /** Secondary color for the gradient */
  secondaryColor?: string;
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
 * - Segmented bar display
 * - Category-themed accent colors
 * - Subtle pulse animation when incomplete
 * - Opacity-based fill states for segments
 */
export const RankingProgressIndicator = memo(function RankingProgressIndicator({
  filled,
  total,
  primaryColor = "#06b6d4",
  secondaryColor = "#22d3ee",
  size = "sm",
  showText = true,
  testIdPrefix = "ranking-progress",
}: RankingProgressIndicatorProps) {
  const { shouldAnimate, motionCapabilities } = useSimpleAnimationPause();
  const prefersReducedMotion = !motionCapabilities.allowTransitions;

  const percentage = useMemo(() => {
    if (total === 0) return 0;
    return Math.round((filled / total) * 100);
  }, [filled, total]);

  const isComplete = percentage >= 100;
  const isStarted = filled > 0;

  // Generate segment data for the segmented bar
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
        transition={{ duration: DURATION.normal }}
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
                duration: DURATION.normal,
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
          className="flex items-center gap-1 shrink-0"
          initial={prefersReducedMotion ? {} : { opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: DURATION.normal, delay: 0.2 }}
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
              animate={shouldAnimate ? {
                scale: [1, 1.3, 1],
                opacity: [0.6, 1, 0.6],
              } : {
                scale: 1,
                opacity: 0.6,
              }}
              transition={shouldAnimate ? {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              } : {
                duration: DURATION.quick,
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
                transition={{ duration: DURATION.normal, delay: 0.1 }}
              />
            </motion.svg>
          )}
        </motion.div>
      )}
    </div>
  );
});
