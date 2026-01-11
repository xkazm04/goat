'use client';

import { motion } from 'framer-motion';
import { Check, Sparkles, Trophy, Star, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackSuccessStateProps {
  /** Success title */
  title?: string;
  /** Success message */
  message?: string;
  /** Icon variant */
  icon?: 'check' | 'sparkles' | 'trophy' | 'star' | 'party';
  /** Primary action text */
  actionText?: string;
  /** Primary action callback */
  onAction?: () => void;
  /** Secondary action text */
  secondaryActionText?: string;
  /** Secondary action callback */
  onSecondaryAction?: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Whether to show celebration animation */
  celebrate?: boolean;
}

const iconMap = {
  check: Check,
  sparkles: Sparkles,
  trophy: Trophy,
  star: Star,
  party: PartyPopper,
};

const sizeClasses = {
  sm: { container: 'py-6', icon: 'w-12 h-12', iconInner: 'w-6 h-6', title: 'text-lg', text: 'text-xs' },
  md: { container: 'py-10', icon: 'w-16 h-16', iconInner: 'w-8 h-8', title: 'text-xl', text: 'text-sm' },
  lg: { container: 'py-14', icon: 'w-20 h-20', iconInner: 'w-10 h-10', title: 'text-2xl', text: 'text-base' },
};

/**
 * A reusable success state component with celebration animations.
 */
export function FeedbackSuccessState({
  title = 'Success!',
  message,
  icon = 'check',
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  size = 'md',
  className,
  celebrate = false,
}: FeedbackSuccessStateProps) {
  const IconComponent = iconMap[icon];
  const sizes = sizeClasses[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center text-center relative',
        sizes.container,
        className
      )}
      data-testid="feedback-success-state"
    >
      {/* Celebration burst effect */}
      {celebrate && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-400"
              initial={{
                x: 0,
                y: 0,
                scale: 0,
              }}
              animate={{
                x: Math.cos((i * Math.PI * 2) / 8) * 60,
                y: Math.sin((i * Math.PI * 2) / 8) * 60,
                scale: [0, 1.5, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 0.8,
                delay: 0.1,
                ease: 'easeOut',
              }}
            />
          ))}
        </motion.div>
      )}

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0.5 }}
        className={cn(
          'rounded-full flex items-center justify-center mb-4',
          sizes.icon
        )}
        style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
        }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', delay: 0.2, duration: 0.4 }}
        >
          <IconComponent className={cn('text-green-400', sizes.iconInner)} />
        </motion.div>
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={cn('font-semibold text-slate-200 mb-2', sizes.title)}
      >
        {title}
      </motion.h3>

      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className={cn('text-slate-400 max-w-md mb-4', sizes.text)}
        >
          {message}
        </motion.p>
      )}

      {(actionText || secondaryActionText) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex gap-3 mt-2"
        >
          {actionText && onAction && (
            <button
              onClick={onAction}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              data-testid="success-primary-action"
            >
              {actionText}
            </button>
          )}
          {secondaryActionText && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              data-testid="success-secondary-action"
            >
              {secondaryActionText}
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
