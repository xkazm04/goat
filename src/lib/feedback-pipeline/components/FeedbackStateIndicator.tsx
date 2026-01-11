'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, X, Sparkles, AlertTriangle, Crown } from 'lucide-react';
import type { ExtendedFeedbackState, StateIndicatorConfig, FeedbackVisuals } from '../types';
import { cn } from '@/lib/utils';

interface FeedbackStateIndicatorProps {
  /** Current state to display */
  state: ExtendedFeedbackState;
  /** Configuration for each state */
  config?: Partial<Record<ExtendedFeedbackState, StateIndicatorConfig>>;
  /** Visual options */
  visuals?: FeedbackVisuals;
  /** Additional CSS classes */
  className?: string;
  /** Children to render inside the indicator */
  children?: React.ReactNode;
}

const iconMap = {
  spinner: Loader2,
  check: Check,
  error: X,
  sparkles: Sparkles,
  warning: AlertTriangle,
  crown: Crown,
};

const defaultStateIcons: Record<ExtendedFeedbackState, FeedbackVisuals['icon']> = {
  idle: undefined,
  pending: 'spinner',
  processing: 'spinner',
  success: 'check',
  error: 'error',
  'checking-cache': 'spinner',
  generating: 'sparkles',
  complete: 'check',
  dragging: undefined,
  dropping: 'sparkles',
  empty: 'crown',
};

const stateColors: Record<ExtendedFeedbackState, { bg: string; border: string; text: string }> = {
  idle: { bg: 'bg-gray-800/50', border: 'border-gray-700', text: 'text-gray-400' },
  pending: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  processing: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  success: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
  error: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  'checking-cache': { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400' },
  generating: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
  complete: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
  dragging: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400' },
  dropping: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400' },
  empty: { bg: 'bg-gray-800/50', border: 'border-gray-700', text: 'text-gray-500' },
};

/**
 * A reusable state indicator component that displays visual feedback
 * for async operations.
 */
export function FeedbackStateIndicator({
  state,
  config,
  visuals,
  className,
  children,
}: FeedbackStateIndicatorProps) {
  const stateConfig = config?.[state];
  const icon = visuals?.icon || defaultStateIcons[state];
  const IconComponent = icon ? iconMap[icon] : null;
  const colors = stateColors[state];
  const isSpinner = icon === 'spinner';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'rounded-xl border p-6',
          colors.bg,
          colors.border,
          className
        )}
        data-testid={`feedback-state-${state}`}
      >
        <div className="flex flex-col items-center text-center">
          {IconComponent && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center mb-4',
                colors.bg
              )}
            >
              <IconComponent
                className={cn(
                  'w-8 h-8',
                  colors.text,
                  isSpinner && 'animate-spin'
                )}
              />
            </motion.div>
          )}

          {stateConfig?.title && (
            <h3 className={cn('text-lg font-semibold mb-2', colors.text)}>
              {stateConfig.title}
            </h3>
          )}

          {stateConfig?.description && (
            <p className="text-sm text-gray-400 mb-4 max-w-md">
              {stateConfig.description}
            </p>
          )}

          {children}

          {(stateConfig?.actionText || stateConfig?.secondaryActionText) && (
            <div className="flex gap-3 mt-4">
              {stateConfig?.actionText && stateConfig?.onAction && (
                <button
                  onClick={stateConfig.onAction}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  data-testid="feedback-primary-action"
                >
                  {stateConfig.actionText}
                </button>
              )}
              {stateConfig?.secondaryActionText && stateConfig?.onSecondaryAction && (
                <button
                  onClick={stateConfig.onSecondaryAction}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  data-testid="feedback-secondary-action"
                >
                  {stateConfig.secondaryActionText}
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
