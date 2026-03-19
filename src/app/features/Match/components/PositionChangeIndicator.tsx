'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PositionChange } from '../hooks/usePositionHistory';

interface PositionChangeIndicatorProps {
  change: PositionChange | null;
  className?: string;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md';
}

const sizeConfig = {
  xs: { text: 'text-2xs', arrow: 'text-3xs', px: 'px-0.5', h: 'h-3', gap: 'gap-0' },
  sm: { text: 'text-2xs', arrow: 'text-2xs', px: 'px-1', h: 'h-3.5', gap: 'gap-0.5' },
  md: { text: 'text-xs', arrow: 'text-2xs', px: 'px-1', h: 'h-4', gap: 'gap-0.5' },
};

/**
 * Billboard/Spotify-style position change indicator.
 *
 * Shows a colored arrow with the magnitude of change:
 * - Green up-arrow for rank improvements (+3 means moved up 3 spots)
 * - Red down-arrow for rank drops (-2 means dropped 2 spots)
 * - Gold "NEW" badge for items that just entered the grid
 * - Nothing for items with no change
 */
export const PositionChangeIndicator = memo(function PositionChangeIndicator({
  change,
  className = '',
  size = 'sm',
}: PositionChangeIndicatorProps) {
  if (!change) return null;

  const { delta, previousPosition } = change;
  const config = sizeConfig[size];

  // New entry
  if (previousPosition === null) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.3 }}
          className={`inline-flex items-center ${config.h} ${config.px} rounded-sm bg-amber-500/25 border border-amber-500/40 ${className}`}
        >
          <span className={`${config.text} font-bold text-amber-400 leading-none`}>NEW</span>
        </motion.div>
      </AnimatePresence>
    );
  }

  // No change
  if (delta === 0) return null;

  const isUp = delta > 0;
  const magnitude = Math.abs(delta);
  const arrow = isUp ? '▲' : '▼';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: isUp ? 6 : -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.2 }}
        className={`inline-flex items-center ${config.gap} ${config.h} ${config.px} rounded-sm ${className} ${
          isUp
            ? 'bg-emerald-500/20 border border-emerald-500/30'
            : 'bg-rose-500/20 border border-rose-500/30'
        }`}
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 15, delay: 0.35 }}
          className={`${config.arrow} leading-none ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}
        >
          {arrow}
        </motion.span>
        <span
          className={`${config.text} font-bold tabular-nums leading-none ${
            isUp ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {magnitude}
        </span>
      </motion.div>
    </AnimatePresence>
  );
});
