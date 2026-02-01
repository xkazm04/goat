'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CriterionDisplaySize } from '@/lib/criteria/types';

export interface BarScoreOverlayProps {
  /** Score value (0-10 or 0-100 depending on scale) */
  score: number;
  /** Maximum score for percentage calculation */
  maxScore?: number;
  /** Size variant */
  size?: CriterionDisplaySize;
  /** Accent color for the bar */
  color?: string;
  /** Optional criterion name to display */
  name?: string;
  /** Whether to show the name */
  showName?: boolean;
  /** Width of the bar in pixels */
  width?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to animate on mount */
  animated?: boolean;
}

// Size configurations for bar height
const SIZE_CONFIG = {
  sm: {
    height: 4,
    labelSize: 'text-[7px]',
    scoreSize: 'text-[8px]',
    padding: 'py-0.5 px-1',
  },
  md: {
    height: 6,
    labelSize: 'text-[8px]',
    scoreSize: 'text-[9px]',
    padding: 'py-0.5 px-1.5',
  },
  lg: {
    height: 8,
    labelSize: 'text-[9px]',
    scoreSize: 'text-[10px]',
    padding: 'py-1 px-2',
  },
};

/**
 * BarScoreOverlay
 *
 * Horizontal progress bar with optional label.
 * Compact design for secondary scores.
 */
export const BarScoreOverlay = memo(function BarScoreOverlay({
  score,
  maxScore = 10,
  size = 'md',
  color = '#3b82f6',
  name,
  showName = false,
  width = 60,
  className,
  animated = true,
}: BarScoreOverlayProps) {
  const config = SIZE_CONFIG[size];

  // Calculate percentage (0-100)
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));

  // Format display score
  const displayScore = score % 1 === 0 ? score.toString() : score.toFixed(1);

  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 backdrop-blur-md rounded border border-white/10 shadow-lg',
        config.padding,
        className
      )}
      style={{
        width,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Label row */}
      {showName && name && (
        <div className="flex items-center justify-between gap-1">
          <span
            className={cn('font-medium text-white/80 truncate', config.labelSize)}
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
          >
            {name}
          </span>
          <span
            className={cn('font-bold text-white shrink-0', config.scoreSize)}
            style={{ color, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          >
            {displayScore}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{
          height: config.height,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}80, ${color})`,
            boxShadow: `0 0 6px ${color}60`,
          }}
          initial={animated ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {/* Score only row (when no name shown) */}
      {!showName && (
        <div className="flex items-center justify-center">
          <span
            className={cn('font-bold text-white', config.scoreSize)}
            style={{ color, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          >
            {displayScore}
          </span>
        </div>
      )}
    </div>
  );
});

export default BarScoreOverlay;
