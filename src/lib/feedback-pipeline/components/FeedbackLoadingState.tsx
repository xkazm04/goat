'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { FeedbackProgress } from './FeedbackProgress';
import type { FeedbackProgressData } from '../types';
import { cn } from '@/lib/utils';

interface FeedbackLoadingStateProps {
  /** Loading message */
  message?: string;
  /** Secondary message */
  submessage?: string;
  /** Progress data (optional) */
  progress?: FeedbackProgressData | null;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Whether to show an overlay */
  overlay?: boolean;
}

const sizeClasses = {
  sm: { container: 'py-6', spinner: 'w-6 h-6', text: 'text-sm' },
  md: { container: 'py-10', spinner: 'w-10 h-10', text: 'text-base' },
  lg: { container: 'py-14', spinner: 'w-12 h-12', text: 'text-lg' },
};

/**
 * A reusable loading state component with optional progress display.
 */
export function FeedbackLoadingState({
  message = 'Loading...',
  submessage,
  progress,
  size = 'md',
  className,
  overlay = false,
}: FeedbackLoadingStateProps) {
  const sizes = sizeClasses[size];

  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
      data-testid="feedback-loading-state"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="mb-4"
      >
        <Loader2 className={cn('text-blue-400', sizes.spinner)} />
      </motion.div>

      <p className={cn('font-medium text-white', sizes.text)}>{message}</p>

      {submessage && (
        <p className="text-sm text-gray-400 mt-1">{submessage}</p>
      )}

      {progress && (
        <div className="w-48 mt-4">
          <FeedbackProgress progress={progress} size="sm" variant="cyan" />
        </div>
      )}
    </motion.div>
  );

  if (overlay) {
    return (
      <div
        className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl"
        data-testid="feedback-loading-overlay"
      >
        {content}
      </div>
    );
  }

  return content;
}
