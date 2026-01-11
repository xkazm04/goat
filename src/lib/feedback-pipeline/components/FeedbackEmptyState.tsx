'use client';

import { motion } from 'framer-motion';
import { Crown, Inbox, Search, Sparkles, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackEmptyStateProps {
  /** Title for the empty state */
  title: string;
  /** Description text */
  description?: string;
  /** Icon variant */
  icon?: 'crown' | 'inbox' | 'search' | 'sparkles' | 'plus';
  /** Action button text */
  actionText?: string;
  /** Action callback */
  onAction?: () => void;
  /** Secondary action text */
  secondaryActionText?: string;
  /** Secondary action callback */
  onSecondaryAction?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const iconMap = {
  crown: Crown,
  inbox: Inbox,
  search: Search,
  sparkles: Sparkles,
  plus: Plus,
};

const sizeClasses = {
  sm: { container: 'py-8', icon: 'w-12 h-12', iconInner: 'w-6 h-6', title: 'text-lg', desc: 'text-xs' },
  md: { container: 'py-12', icon: 'w-16 h-16', iconInner: 'w-8 h-8', title: 'text-xl', desc: 'text-sm' },
  lg: { container: 'py-16', icon: 'w-20 h-20', iconInner: 'w-10 h-10', title: 'text-2xl', desc: 'text-base' },
};

/**
 * A reusable empty state component for when there's no content to display.
 */
export function FeedbackEmptyState({
  title,
  description,
  icon = 'inbox',
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className,
  size = 'md',
}: FeedbackEmptyStateProps) {
  const IconComponent = iconMap[icon];
  const sizes = sizeClasses[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
      data-testid="feedback-empty-state"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1 }}
        className={cn(
          'rounded-full flex items-center justify-center mb-4',
          sizes.icon
        )}
        style={{
          background: `
            linear-gradient(135deg,
              rgba(71, 85, 105, 0.2) 0%,
              rgba(100, 116, 139, 0.2) 100%
            )
          `,
        }}
      >
        <IconComponent className={cn('text-slate-500', sizes.iconInner)} />
      </motion.div>

      <h3 className={cn('font-semibold text-slate-200 mb-2', sizes.title)}>
        {title}
      </h3>

      {description && (
        <p className={cn('text-slate-400 max-w-md mb-4', sizes.desc)}>
          {description}
        </p>
      )}

      {(actionText || secondaryActionText) && (
        <div className="flex gap-3 mt-2">
          {actionText && onAction && (
            <button
              onClick={onAction}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              data-testid="empty-state-primary-action"
            >
              {actionText}
            </button>
          )}
          {secondaryActionText && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              data-testid="empty-state-secondary-action"
            >
              {secondaryActionText}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
