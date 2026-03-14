'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useItemConsensus } from '@/stores/consensus-store';

interface AvgRankBadgeProps {
  /** The item ID to fetch average ranking for */
  itemId: string;
  /** Whether the parent element is being hovered */
  isHovered?: boolean;
  /** Position of the badge */
  position?: 'top-right' | 'bottom-right' | 'bottom-left';
  /** Additional CSS classes */
  className?: string;
}

/**
 * AvgRankBadge
 *
 * Displays a subtle community average ranking badge on collection items.
 * Shows on hover to help users understand how others have ranked this item.
 *
 * Features:
 * - Displays "Avg #X" for community average ranking
 * - Shows total number of rankings for confidence
 * - Color-coded based on ranking position
 * - Subtle glassmorphism design matching existing UI
 */
export function AvgRankBadge({
  itemId,
  isHovered = false,
  position = 'bottom-right',
  className,
}: AvgRankBadgeProps) {
  const consensus = useItemConsensus(itemId);

  // Position classes based on prop
  const positionClasses = useMemo(() => {
    switch (position) {
      case 'top-right':
        return 'top-1 right-1';
      case 'bottom-left':
        return 'bottom-1 left-1';
      case 'bottom-right':
      default:
        return 'bottom-1 right-1';
    }
  }, [position]);

  // Get badge styling based on average rank
  const getBadgeStyle = useMemo(() => {
    if (!consensus) {
      return {
        bg: 'from-gray-600/80 to-gray-700/80',
        text: 'text-gray-200',
        ring: 'ring-gray-500/30',
      };
    }

    const avgRank = Math.round(consensus.averageRank);

    if (avgRank <= 3) {
      return {
        bg: 'from-yellow-500/80 to-amber-600/80',
        text: 'text-black font-semibold',
        ring: 'ring-yellow-400/50',
      };
    }
    if (avgRank <= 10) {
      return {
        bg: 'from-cyan-500/70 to-blue-600/70',
        text: 'text-white font-medium',
        ring: 'ring-cyan-400/40',
      };
    }
    if (avgRank <= 25) {
      return {
        bg: 'from-purple-500/70 to-indigo-600/70',
        text: 'text-white',
        ring: 'ring-purple-400/30',
      };
    }
    return {
      bg: 'from-gray-600/70 to-gray-700/70',
      text: 'text-gray-200',
      ring: 'ring-gray-500/25',
    };
  }, [consensus]);

  // Get confidence indicator based on total rankings
  const confidenceInfo = useMemo(() => {
    if (!consensus) return null;

    const total = consensus.totalRankings;
    if (total >= 100) {
      return { label: 'High confidence', color: 'text-emerald-400' };
    }
    if (total >= 50) {
      return { label: 'Good confidence', color: 'text-cyan-400' };
    }
    if (total >= 20) {
      return { label: 'Moderate confidence', color: 'text-amber-400' };
    }
    return { label: 'Low confidence', color: 'text-gray-400' };
  }, [consensus]);

  // Don't render if no consensus data
  if (!consensus) {
    return null;
  }

  const avgRank = Math.round(consensus.averageRank);
  const totalRankings = consensus.totalRankings;

  return (
    <AnimatePresence>
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 4 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
              type: 'spring',
              stiffness: 400,
              damping: 25,
            }
          }}
          exit={{
            opacity: 0,
            scale: 0.8,
            y: 4,
            transition: { duration: 0.15 }
          }}
          className={cn(
            'absolute z-20',
            positionClasses,
            // Glassmorphism styling
            'backdrop-blur-md',
            'bg-gradient-to-br',
            getBadgeStyle.bg,
            // Layout
            'flex items-center gap-1',
            'h-[20px] px-1.5',
            'rounded-md',
            // Border and shadow
            'ring-1',
            getBadgeStyle.ring,
            'shadow-lg shadow-black/30',
            className
          )}
          data-testid={`avg-rank-badge-${itemId}`}
        >
          {/* Community icon */}
          <Users className={cn('w-2.5 h-2.5 flex-shrink-0', getBadgeStyle.text)} />

          {/* Average rank display */}
          <span
            className={cn(
              'text-[9px] leading-none whitespace-nowrap',
              getBadgeStyle.text
            )}
          >
            Avg #{avgRank}
          </span>

          {/* Optional: Show total rankings for confidence */}
          {totalRankings >= 10 && (
            <span
              className={cn(
                'text-[8px] leading-none opacity-70 whitespace-nowrap',
                getBadgeStyle.text
              )}
              title={`Based on ${totalRankings} rankings - ${confidenceInfo?.label}`}
            >
              ({totalRankings})
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AvgRankBadge;
