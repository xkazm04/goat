'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CriterionDisplaySize } from '@/lib/criteria/types';
import { DURATION } from '@/lib/animations/motion-presets';

export interface RingScoreOverlayProps {
  /** Score value (0-10 or 0-100 depending on scale) */
  score: number;
  /** Maximum score for percentage calculation */
  maxScore?: number;
  /** Size variant */
  size?: CriterionDisplaySize;
  /** Accent color for the ring */
  color?: string;
  /** Optional criterion name to display */
  name?: string;
  /** Whether to show the name */
  showName?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to animate on mount */
  animated?: boolean;
}

// Size configurations
const SIZE_CONFIG = {
  sm: {
    dimensions: 28,
    strokeWidth: 2.5,
    radius: 11,
    fontSize: 'text-3xs',
    viewBox: '0 0 28 28',
    center: 14,
  },
  md: {
    dimensions: 36,
    strokeWidth: 3,
    radius: 14,
    fontSize: 'text-2xs',
    viewBox: '0 0 36 36',
    center: 18,
  },
  lg: {
    dimensions: 44,
    strokeWidth: 3.5,
    radius: 17,
    fontSize: 'text-xs',
    viewBox: '0 0 44 44',
    center: 22,
  },
};

/**
 * RingScoreOverlay
 *
 * Circular progress ring with score in center.
 * Uses SVG with stroke-dasharray for the progress animation.
 */
export const RingScoreOverlay = memo(function RingScoreOverlay({
  score,
  maxScore = 10,
  size = 'md',
  color = '#f59e0b',
  name,
  showName = false,
  className,
  animated = true,
}: RingScoreOverlayProps) {
  const config = SIZE_CONFIG[size];

  // Calculate percentage (0-100)
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));

  // Circumference of the ring
  const circumference = 2 * Math.PI * config.radius;

  // Stroke offset for progress
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Format display score
  const displayScore = score % 1 === 0 ? score.toString() : score.toFixed(1);

  return (
    <div className={cn('flex flex-col items-center gap-0.5', className)}>
      <div
        className="relative rounded-full backdrop-blur-md border border-white/10 shadow-lg"
        style={{
          width: config.dimensions,
          height: config.dimensions,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          boxShadow: `var(--elevation-card), 0 0 12px ${color}30`,
        }}
      >
        <svg
          viewBox={config.viewBox}
          className="absolute inset-0 -rotate-90"
          style={{ width: config.dimensions, height: config.dimensions }}
        >
          {/* Background ring */}
          <circle
            cx={config.center}
            cy={config.center}
            r={config.radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={config.strokeWidth}
          />

          {/* Progress ring */}
          <motion.circle
            cx={config.center}
            cy={config.center}
            r={config.radius}
            fill="none"
            stroke={color}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={animated ? { strokeDashoffset: circumference } : { strokeDashoffset }}
            animate={{ strokeDashoffset }}
            transition={{ duration: DURATION.dramatic, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 4px ${color}80)`,
            }}
          />
        </svg>

        {/* Score text in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className={cn('font-bold text-white', config.fontSize)}
            initial={animated ? { opacity: 0, scale: 0.8 } : {}}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: DURATION.normal }}
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          >
            {displayScore}
          </motion.span>
        </div>
      </div>

      {/* Optional name label */}
      {showName && name && (
        <span
          className="text-3xs font-medium text-white/80 max-w-[60px] truncate text-center"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
        >
          {name}
        </span>
      )}
    </div>
  );
});

export default RingScoreOverlay;
