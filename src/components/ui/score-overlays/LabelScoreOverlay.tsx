'use client';

import { motion } from 'framer-motion';
import { memo } from 'react';

import { DURATION } from '@/lib/animations/motion-presets';
import { cn } from '@/lib/utils';

import type { CriterionDisplaySize } from '@/lib/criteria/types';


export interface LabelScoreOverlayProps {
  /** Score value (0-10 or 0-100 depending on scale) */
  score: number;
  /** Maximum score for percentage calculation (used for color coding) */
  maxScore?: number;
  /** Size variant */
  size?: CriterionDisplaySize;
  /** Optional explicit color override (otherwise derived from score) */
  color?: string;
  /** Criterion name to display */
  name: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to animate on mount */
  animated?: boolean;
}

// Size configurations
const SIZE_CONFIG = {
  sm: {
    padding: 'px-1.5 py-0.5',
    scoreSize: 'text-2xs',
    nameSize: 'text-3xs',
    gap: 'gap-0.5',
  },
  md: {
    padding: 'px-2 py-1',
    scoreSize: 'text-2xs',
    nameSize: 'text-3xs',
    gap: 'gap-1',
  },
  lg: {
    padding: 'px-2.5 py-1.5',
    scoreSize: 'text-xs',
    nameSize: 'text-2xs',
    gap: 'gap-1',
  },
};

/**
 * Get color based on score quality
 * Low scores: red, Mid scores: amber, High scores: green
 */
function getScoreColor(score: number, maxScore: number): string {
  const percentage = (score / maxScore) * 100;

  if (percentage >= 80) return '#22c55e'; // green-500
  if (percentage >= 60) return '#84cc16'; // lime-500
  if (percentage >= 40) return '#f59e0b'; // amber-500
  if (percentage >= 20) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

/**
 * LabelScoreOverlay
 *
 * Pill badge with score and criterion name.
 * Text-focused design for detailed display.
 * Color-coded by score quality.
 */
export const LabelScoreOverlay = memo(function LabelScoreOverlay({
  score,
  maxScore = 10,
  size = 'md',
  color,
  name,
  className,
  animated = true,
}: LabelScoreOverlayProps) {
  const config = SIZE_CONFIG[size];

  // Use explicit color or derive from score
  const accentColor = color || getScoreColor(score, maxScore);

  // Format display score
  const displayScore = score % 1 === 0 ? score.toString() : score.toFixed(1);

  return (
    <motion.div
      className={cn(
        'flex items-center rounded-badge backdrop-blur-md border border-white/10 shadow-lg',
        config.padding,
        config.gap,
        className
      )}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        boxShadow: `var(--elevation-card), 0 0 8px ${accentColor}20`,
        borderColor: `${accentColor}30`,
      }}
      initial={animated ? { opacity: 0, scale: 0.8 } : {}}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: DURATION.normal, ease: 'easeOut' }}
    >
      {/* Score */}
      <span
        className={cn('font-bold', config.scoreSize)}
        style={{
          color: accentColor,
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        }}
      >
        {displayScore}
      </span>

      {/* Name */}
      <span
        className={cn('font-medium text-white/80 max-w-[50px] truncate', config.nameSize)}
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
      >
        {name}
      </span>
    </motion.div>
  );
});

export default LabelScoreOverlay;
