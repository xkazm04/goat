'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUniversalRatingBadge } from '@/hooks/use-ranking-graph';

interface UniversalRatingBadgeProps {
  itemId: string;
  isHovered?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left';
  className?: string;
}

/**
 * UniversalRatingBadge
 *
 * Displays a cross-list universal ELO tier badge on collection items.
 * Shows the item's universal tier and ELO score across all lists.
 */
export function UniversalRatingBadge({
  itemId,
  isHovered = false,
  position = 'top-left',
  className,
}: UniversalRatingBadgeProps) {
  const badge = useUniversalRatingBadge(itemId);

  const positionClasses = useMemo(() => {
    switch (position) {
      case 'top-left':
        return 'top-1 left-1';
      case 'top-right':
        return 'top-1 right-1';
      case 'bottom-left':
        return 'bottom-1 left-1';
      case 'bottom-right':
      default:
        return 'bottom-1 right-1';
    }
  }, [position]);

  const tierStyle = useMemo(() => {
    if (!badge) {
      return {
        bg: 'from-gray-600/80 to-gray-700/80',
        text: 'text-gray-300',
        ring: 'ring-gray-500/30',
        glow: '',
      };
    }

    const tier = badge.tier;
    if (tier === 'S+' || tier === 'S') {
      return {
        bg: 'from-yellow-500/90 to-amber-600/90',
        text: 'text-black font-bold',
        ring: 'ring-yellow-400/60',
        glow: 'shadow-yellow-500/40',
      };
    }
    if (tier === 'A+' || tier === 'A' || tier === 'A-') {
      return {
        bg: 'from-orange-500/85 to-red-600/85',
        text: 'text-white font-semibold',
        ring: 'ring-orange-400/50',
        glow: 'shadow-orange-500/30',
      };
    }
    if (tier === 'B+' || tier === 'B' || tier === 'B-') {
      return {
        bg: 'from-brand/80 to-blue-600/80',
        text: 'text-white font-medium',
        ring: 'ring-brand-hover/40',
        glow: 'shadow-blue-500/20',
      };
    }
    if (tier === 'C+' || tier === 'C' || tier === 'C-') {
      return {
        bg: 'from-emerald-500/75 to-green-600/75',
        text: 'text-white',
        ring: 'ring-emerald-400/35',
        glow: '',
      };
    }
    return {
      bg: 'from-gray-600/75 to-gray-700/75',
      text: 'text-gray-200',
      ring: 'ring-gray-500/25',
      glow: '',
    };
  }, [badge]);

  if (!badge || badge.listCount < 2) {
    return null;
  }

  return (
    <AnimatePresence>
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -4 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { type: 'spring', stiffness: 400, damping: 25 },
          }}
          exit={{
            opacity: 0,
            scale: 0.8,
            y: -4,
            transition: { duration: 0.15 },
          }}
          className={cn(
            'absolute z-20',
            positionClasses,
            'backdrop-blur-md',
            'bg-linear-to-br',
            tierStyle.bg,
            'flex items-center gap-1',
            'h-[20px] px-1.5',
            'rounded-md',
            'ring-1',
            tierStyle.ring,
            'shadow-lg shadow-black/30',
            tierStyle.glow,
            className
          )}
          data-testid={`universal-rating-badge-${itemId}`}
          title={`Universal ELO: ${badge.eloScore} | Across ${badge.listCount} lists | Confidence: ${Math.round(badge.confidence * 100)}%`}
        >
          <Globe className={cn('w-2.5 h-2.5 shrink-0', tierStyle.text)} />
          <span className={cn('text-[9px] leading-none whitespace-nowrap', tierStyle.text)}>
            {badge.tier}
          </span>
          {badge.confidence >= 0.7 && (
            <Zap className={cn('w-2 h-2 shrink-0 opacity-70', tierStyle.text)} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default UniversalRatingBadge;
