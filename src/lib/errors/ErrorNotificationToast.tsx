'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useErrorNotifications, type ErrorNotification } from './error-notification-store';
import type { ErrorSeverity } from './types';

// ============================================================================
// Styles
// ============================================================================

const severityStyles: Record<
  ErrorSeverity,
  { icon: typeof AlertCircle; bg: string; border: string; iconColor: string }
> = {
  error: {
    icon: AlertCircle,
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    iconColor: 'text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    iconColor: 'text-amber-400',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    iconColor: 'text-blue-400',
  },
};

// ============================================================================
// Individual Toast Component
// ============================================================================

interface ErrorToastProps {
  notification: ErrorNotification;
  onDismiss: (id: string) => void;
}

function ErrorToast({ notification, onDismiss }: ErrorToastProps) {
  const [copied, setCopied] = useState(false);
  const styles = severityStyles[notification.severity];
  const Icon = styles.icon;

  const handleCopyTraceId = async () => {
    try {
      await navigator.clipboard.writeText(notification.traceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      console.error('Failed to copy trace ID');
    }
  };

  const handleRetry = () => {
    notification.onRetry?.();
    onDismiss(notification.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'relative overflow-hidden rounded-lg border backdrop-blur-md shadow-lg',
        styles.bg,
        styles.border
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={cn('w-5 h-5', styles.iconColor)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-slate-200">
            {notification.title}
          </h4>
          <p className="mt-1 text-sm text-slate-400">
            {notification.description}
          </p>

          {/* Actions */}
          <div className="mt-2 flex items-center gap-2">
            {notification.retriable && notification.onRetry && (
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}

            {/* Trace ID (for debugging) */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={handleCopyTraceId}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 transition-colors"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copied!' : notification.traceId.slice(0, 12)}...
              </button>
            )}
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => onDismiss(notification.id)}
          className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Progress bar for auto-dismiss */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{
          duration:
            notification.severity === 'error'
              ? 10
              : notification.severity === 'warning'
              ? 6
              : 4,
          ease: 'linear',
        }}
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-current origin-left opacity-30"
        style={{ color: styles.iconColor.replace('text-', '') }}
      />
    </motion.div>
  );
}

// ============================================================================
// Toast Container Component
// ============================================================================

interface ErrorNotificationToastContainerProps {
  /** Position on screen */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  /** Maximum notifications to show */
  maxVisible?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Container component that renders error notifications as toasts.
 * Place this once in your app layout.
 *
 * @example
 * ```tsx
 * // In your layout
 * <ErrorNotificationToastContainer position="top-right" />
 * ```
 */
export function ErrorNotificationToastContainer({
  position = 'top-right',
  maxVisible = 5,
  className,
}: ErrorNotificationToastContainerProps) {
  const { notifications, dismiss, clearAll } = useErrorNotifications();

  const visibleNotifications = notifications.slice(-maxVisible);
  const hiddenCount = Math.max(0, notifications.length - maxVisible);

  const positionClasses: Record<typeof position, string> = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-2 w-full max-w-sm',
        positionClasses[position],
        className
      )}
    >
      {/* Hidden count indicator */}
      {hiddenCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-slate-500 text-center"
        >
          +{hiddenCount} more notification{hiddenCount > 1 ? 's' : ''}
        </motion.div>
      )}

      {/* Clear all button (when multiple) */}
      {notifications.length > 1 && (
        <button
          onClick={clearAll}
          className="self-end text-xs text-slate-500 hover:text-slate-400 transition-colors mb-1"
        >
          Clear all
        </button>
      )}

      {/* Notifications */}
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((notification) => (
          <ErrorToast
            key={notification.id}
            notification={notification}
            onDismiss={dismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Inline Error Display
// ============================================================================

interface InlineErrorDisplayProps {
  /** Error code to filter notifications */
  filterCode?: string;
  /** Source to filter notifications */
  filterSource?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Inline error display component for showing errors within a specific context.
 *
 * @example
 * ```tsx
 * <InlineErrorDisplay filterSource="list-form" />
 * ```
 */
export function InlineErrorDisplay({
  filterCode,
  filterSource,
  className,
}: InlineErrorDisplayProps) {
  const { notifications, dismiss } = useErrorNotifications();

  const filteredNotifications = notifications.filter((n) => {
    if (filterCode && n.code !== filterCode) return false;
    if (filterSource && n.source !== filterSource) return false;
    return true;
  });

  if (filteredNotifications.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <AnimatePresence mode="popLayout">
        {filteredNotifications.map((notification) => {
          const styles = severityStyles[notification.severity];
          const Icon = styles.icon;

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border',
                styles.bg,
                styles.border
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', styles.iconColor)} />
              <p className="text-sm text-slate-300 flex-1">
                {notification.description}
              </p>
              <button
                onClick={() => dismiss(notification.id)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-3 h-3 text-slate-400" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
