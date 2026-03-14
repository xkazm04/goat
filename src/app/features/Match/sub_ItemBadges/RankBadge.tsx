'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, TrendingUp, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RankBadgeProps {
  /** Average ranking score (0-5 stars) or numeric rank */
  ranking?: number;
  /** Display format: 'stars' for rating (⭐ 4.8), 'rank' for position (#42) */
  format?: 'stars' | 'rank';
  /** Index of the item for staggered animation (0-based) */
  animationIndex?: number;
  /** Base delay before animation starts (ms) */
  baseDelay?: number;
  /** Stagger delay per item (ms) */
  staggerDelay?: number;
  /** Additional CSS classes */
  className?: string;
  /** Unique item ID for tracking rank changes */
  itemId?: string;
}

/**
 * RankBadge
 *
 * Displays a small, elegant glassmorphism rank badge in the corner of collection items.
 * Features:
 * - Staggered scale-up and fade entrance animation
 * - Pulse animation when rank changes
 * - Premium glass effect with backdrop blur
 * - Supports both star ratings (⭐ 4.8) and rank positions (#42)
 */
export function RankBadge({
  ranking,
  format = 'rank',
  animationIndex = 0,
  baseDelay = 200,
  staggerDelay = 50,
  className,
  itemId,
}: RankBadgeProps) {
  const [isPulsing, setIsPulsing] = useState(false);
  const previousRankRef = useRef<number | undefined>(ranking);

  // Detect rank changes and trigger pulse animation
  useEffect(() => {
    if (
      previousRankRef.current !== undefined &&
      previousRankRef.current !== ranking &&
      ranking !== undefined
    ) {
      setIsPulsing(true);
      const timeout = setTimeout(() => setIsPulsing(false), 600);
      return () => clearTimeout(timeout);
    }
    previousRankRef.current = ranking;
  }, [ranking]);

  // Don't render if no ranking data
  if (ranking === undefined || ranking === null) {
    return null;
  }

  // Calculate animation delay based on index
  const entranceDelay = (baseDelay + animationIndex * staggerDelay) / 1000;

  // Format display based on type
  const displayValue =
    format === 'stars'
      ? ranking.toFixed(1)
      : `#${Math.round(ranking)}`;

  // Get badge color based on rank/rating
  const getBadgeStyle = () => {
    if (format === 'stars') {
      // Star rating colors (higher is better)
      if (ranking >= 4.5) {
        return {
          bg: 'from-yellow-500/90 to-amber-600/90',
          text: 'text-black',
          ring: 'ring-yellow-400/50',
          icon: 'text-black',
        };
      }
      if (ranking >= 4.0) {
        return {
          bg: 'from-cyan-500/80 to-blue-600/80',
          text: 'text-white',
          ring: 'ring-cyan-400/40',
          icon: 'text-white',
        };
      }
      if (ranking >= 3.0) {
        return {
          bg: 'from-purple-500/80 to-indigo-600/80',
          text: 'text-white',
          ring: 'ring-purple-400/30',
          icon: 'text-white',
        };
      }
      return {
        bg: 'from-gray-600/80 to-gray-700/80',
        text: 'text-gray-200',
        ring: 'ring-gray-500/20',
        icon: 'text-gray-300',
      };
    }

    // Rank position colors (lower is better)
    const rankNum = Math.round(ranking);
    if (rankNum <= 3) {
      return {
        bg: 'from-yellow-500/90 to-amber-600/90',
        text: 'text-black font-bold',
        ring: 'ring-yellow-400/50',
        icon: 'text-black',
      };
    }
    if (rankNum <= 10) {
      return {
        bg: 'from-cyan-500/80 to-blue-600/80',
        text: 'text-white font-semibold',
        ring: 'ring-cyan-400/40',
        icon: 'text-white',
      };
    }
    if (rankNum <= 25) {
      return {
        bg: 'from-purple-500/80 to-indigo-600/80',
        text: 'text-white',
        ring: 'ring-purple-400/30',
        icon: 'text-white',
      };
    }
    return {
      bg: 'from-gray-600/80 to-gray-700/80',
      text: 'text-gray-200',
      ring: 'ring-gray-500/20',
      icon: 'text-gray-300',
    };
  };

  const style = getBadgeStyle();

  // Icon based on format
  const BadgeIcon =
    format === 'stars' ? Star : ranking <= 10 ? TrendingUp : Hash;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          transition: {
            type: 'spring',
            stiffness: 400,
            damping: 25,
            delay: entranceDelay,
          },
        }}
        exit={{ scale: 0, opacity: 0, transition: { duration: 0.15 } }}
        className={cn(
          // Position in top-left corner
          'absolute top-1 left-1 z-10',
          // Glassmorphism styling
          'backdrop-blur-md',
          'bg-gradient-to-br',
          style.bg,
          // Layout
          'flex items-center gap-0.5',
          'min-w-[22px] h-[18px] px-1',
          'rounded-md',
          // Border and shadow
          'ring-1',
          style.ring,
          'shadow-lg shadow-black/20',
          className
        )}
        data-testid={`rank-badge-${itemId || 'item'}`}
      >
        {/* Pulse animation overlay */}
        {isPulsing && (
          <motion.div
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{
              opacity: 0,
              scale: 1.5,
              transition: { duration: 0.6, ease: 'easeOut' },
            }}
            className={cn(
              'absolute inset-0 rounded-md',
              'bg-white/40'
            )}
          />
        )}

        {/* Icon */}
        <BadgeIcon
          className={cn('w-2.5 h-2.5 flex-shrink-0', style.icon)}
        />

        {/* Value */}
        <span
          className={cn(
            'text-[9px] leading-none whitespace-nowrap',
            style.text
          )}
        >
          {displayValue}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

export default RankBadge;
