'use client';

import { motion } from 'framer-motion';
import type { FeedbackProgressData } from '../types';
import { cn } from '@/lib/utils';

interface FeedbackProgressProps {
  /** Progress data */
  progress: FeedbackProgressData | null;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'cyan' | 'purple';
  /** Whether to show the label */
  showLabel?: boolean;
  /** Whether to show percentage */
  showPercentage?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2',
};

const variantClasses = {
  default: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-orange-500',
  error: 'bg-red-500',
  cyan: 'bg-cyan-500',
  purple: 'bg-purple-500',
};

/**
 * A reusable progress bar component for the feedback pipeline.
 */
export function FeedbackProgress({
  progress,
  size = 'md',
  variant = 'default',
  showLabel = false,
  showPercentage = false,
  className,
}: FeedbackProgressProps) {
  if (!progress) return null;

  const { value, label, indeterminate } = progress;

  return (
    <div className={cn('w-full', className)} data-testid="feedback-progress">
      {(showLabel || showPercentage) && (
        <div className="flex justify-between items-center mb-1.5">
          {showLabel && label && (
            <span className="text-xs text-gray-400">{label}</span>
          )}
          {showPercentage && !indeterminate && (
            <span className="text-xs text-gray-400">{Math.round(value)}%</span>
          )}
        </div>
      )}

      <div
        className={cn(
          'w-full bg-gray-700 rounded-full overflow-hidden',
          sizeClasses[size]
        )}
      >
        {indeterminate ? (
          <motion.div
            className={cn('h-full rounded-full', variantClasses[variant])}
            initial={{ x: '-100%', width: '30%' }}
            animate={{ x: '400%' }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: 'linear',
            }}
          />
        ) : (
          <motion.div
            className={cn('h-full rounded-full', variantClasses[variant])}
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        )}
      </div>
    </div>
  );
}
