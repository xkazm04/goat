'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION } from '@/lib/animations/motion-presets';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RankingAnomaly } from '@/lib/ranking-graph/types';

interface AnomalyAlertProps {
  anomaly: RankingAnomaly;
  isHovered?: boolean;
  position?: 'top-left' | 'top-right';
  className?: string;
}

/**
 * AnomalyAlert
 *
 * Subtle badge shown when a user's ranking significantly deviates
 * from cross-list consensus. Appears on hover to avoid distraction.
 */
export function AnomalyAlert({
  anomaly,
  isHovered = false,
  position = 'top-right',
  className,
}: AnomalyAlertProps) {
  const positionClasses = position === 'top-left' ? 'top-1 left-1' : 'top-1 right-1';

  const style = useMemo(() => {
    if (anomaly.anomalyScore >= 0.7) {
      return {
        bg: 'from-rose-500/85 to-red-600/85',
        text: 'text-white font-semibold',
        ring: 'ring-rose-400/50',
        icon: AlertTriangle,
      };
    }
    if (anomaly.anomalyScore >= 0.5) {
      return {
        bg: 'from-amber-500/80 to-orange-600/80',
        text: 'text-white font-medium',
        ring: 'ring-amber-400/40',
        icon: anomaly.direction === 'ranked_higher' ? TrendingUp : TrendingDown,
      };
    }
    return {
      bg: 'from-blue-500/70 to-indigo-600/70',
      text: 'text-white',
      ring: 'ring-blue-400/30',
      icon: anomaly.direction === 'ranked_higher' ? TrendingUp : TrendingDown,
    };
  }, [anomaly]);

  const Icon = style.icon;

  const label = useMemo(() => {
    if (anomaly.direction === 'ranked_higher') {
      return `Top ${anomaly.percentile}%`;
    }
    return `Bottom ${anomaly.percentile}%`;
  }, [anomaly]);

  return (
    <AnimatePresence>
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: 1,
            scale: 1,
            transition: { type: 'spring', stiffness: 400, damping: 25 },
          }}
          exit={{ opacity: 0, scale: 0.8, transition: { duration: DURATION.quick } }}
          className={cn(
            'absolute z-20',
            positionClasses,
            'backdrop-blur-md',
            'bg-linear-to-br',
            style.bg,
            'flex items-center gap-1',
            'h-[20px] px-1.5',
            'rounded-control',
            'ring-1',
            style.ring,
            'shadow-lg shadow-black/30',
            'cursor-help',
            className
          )}
          title={anomaly.reasoning}
          data-testid={`anomaly-alert-${anomaly.itemId}`}
        >
          <Icon className={cn('w-2.5 h-2.5 shrink-0', style.text)} />
          <span className={cn('text-2xs leading-none whitespace-nowrap', style.text)}>
            {label}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AnomalyAlert;
