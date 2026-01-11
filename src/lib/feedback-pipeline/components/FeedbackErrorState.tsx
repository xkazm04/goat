'use client';

import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, Home, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackErrorStateProps {
  /** Error title */
  title?: string;
  /** Error message or description */
  message: string;
  /** Retry action */
  onRetry?: () => void;
  /** Retry button text */
  retryText?: string;
  /** Home/dismiss action */
  onDismiss?: () => void;
  /** Dismiss button text */
  dismissText?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Whether to show as an inline alert */
  inline?: boolean;
}

const sizeClasses = {
  sm: { container: 'py-6 px-4', icon: 'w-10 h-10', iconInner: 'w-5 h-5', title: 'text-base', text: 'text-xs' },
  md: { container: 'py-8 px-6', icon: 'w-14 h-14', iconInner: 'w-7 h-7', title: 'text-lg', text: 'text-sm' },
  lg: { container: 'py-12 px-8', icon: 'w-16 h-16', iconInner: 'w-8 h-8', title: 'text-xl', text: 'text-base' },
};

/**
 * A reusable error state component with retry and dismiss options.
 */
export function FeedbackErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryText = 'Try Again',
  onDismiss,
  dismissText = 'Go Back',
  size = 'md',
  className,
  inline = false,
}: FeedbackErrorStateProps) {
  const sizes = sizeClasses[size];

  if (inline) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg',
          className
        )}
        data-testid="feedback-error-inline"
      >
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
        <p className="text-sm text-red-200 flex-1">{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-red-500/20 rounded transition-colors"
            data-testid="error-dismiss-btn"
          >
            <X className="w-4 h-4 text-red-400" />
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
      data-testid="feedback-error-state"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1 }}
        className={cn(
          'rounded-full flex items-center justify-center mb-4 bg-red-500/10',
          sizes.icon
        )}
      >
        <AlertCircle className={cn('text-red-400', sizes.iconInner)} />
      </motion.div>

      <h3 className={cn('font-semibold text-slate-200 mb-2', sizes.title)}>
        {title}
      </h3>

      <p className={cn('text-slate-400 max-w-md mb-4', sizes.text)}>
        {message}
      </p>

      <div className="flex gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            data-testid="error-retry-btn"
          >
            <RefreshCw className="w-4 h-4" />
            {retryText}
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            data-testid="error-dismiss-btn"
          >
            <Home className="w-4 h-4" />
            {dismissText}
          </button>
        )}
      </div>
    </motion.div>
  );
}
