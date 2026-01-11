'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { ExtendedFeedbackState, StateIndicatorConfig, FeedbackProgressData } from '../types';
import { FeedbackStateIndicator } from './FeedbackStateIndicator';
import { FeedbackProgress } from './FeedbackProgress';
import { cn } from '@/lib/utils';

interface FeedbackModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Modal title */
  title: string;
  /** Modal subtitle/description */
  subtitle?: string;
  /** Header icon component */
  headerIcon?: React.ReactNode;
  /** Current state of the modal operation */
  state?: ExtendedFeedbackState;
  /** State configuration for indicators */
  stateConfig?: Partial<Record<ExtendedFeedbackState, StateIndicatorConfig>>;
  /** Progress data */
  progress?: FeedbackProgressData | null;
  /** Whether to show the state indicator */
  showStateIndicator?: boolean;
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Additional header content */
  headerContent?: React.ReactNode;
  /** Main content */
  children: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Content container classes */
  contentClassName?: string;
  /** Z-index level */
  zIndex?: number;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[95vw]',
};

/**
 * A reusable modal component with built-in feedback pipeline support.
 * Provides consistent styling and behavior for all modals in the app.
 */
export function FeedbackModal({
  isOpen,
  onClose,
  title,
  subtitle,
  headerIcon,
  state = 'idle',
  stateConfig,
  progress,
  showStateIndicator = false,
  size = 'md',
  headerContent,
  children,
  footer,
  className,
  contentClassName,
  zIndex = 50,
}: FeedbackModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ zIndex }}
            onClick={onClose}
            data-testid="feedback-modal-backdrop"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className={cn(
                'w-full max-h-[90vh] overflow-hidden',
                sizeClasses[size],
                className
              )}
              onClick={(e) => e.stopPropagation()}
              data-testid="feedback-modal"
            >
              <div
                className="rounded-2xl border overflow-hidden"
                style={{
                  background: `
                    linear-gradient(135deg,
                      rgba(15, 23, 42, 0.98) 0%,
                      rgba(30, 41, 59, 0.98) 25%,
                      rgba(51, 65, 85, 0.98) 50%,
                      rgba(30, 41, 59, 0.98) 75%,
                      rgba(15, 23, 42, 0.98) 100%
                    )
                  `,
                  borderColor: 'rgba(71, 85, 105, 0.4)',
                  boxShadow: `
                    0 25px 50px -12px rgba(0, 0, 0, 0.8),
                    0 0 0 1px rgba(148, 163, 184, 0.1)
                  `,
                }}
              >
                {/* Header */}
                <div
                  className="px-6 py-4 border-b flex items-center justify-between"
                  style={{
                    borderColor: 'rgba(71, 85, 105, 0.4)',
                    background: `
                      linear-gradient(135deg,
                        rgba(30, 41, 59, 0.8) 0%,
                        rgba(51, 65, 85, 0.9) 100%
                      )
                    `,
                  }}
                >
                  <div className="flex items-center gap-4">
                    {headerIcon && (
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                          background: `
                            linear-gradient(135deg,
                              #4c1d95 0%,
                              #7c3aed 50%,
                              #3b82f6 100%
                            )
                          `,
                          boxShadow: `
                            0 4px 14px 0 rgba(124, 58, 237, 0.4),
                            inset 0 1px 0 rgba(255, 255, 255, 0.2)
                          `,
                        }}
                      >
                        {headerIcon}
                      </div>
                    )}
                    <div>
                      <h2
                        className="text-xl font-bold tracking-tight"
                        style={{
                          background: `
                            linear-gradient(135deg,
                              #f1f5f9 0%,
                              #cbd5e1 50%,
                              #f8fafc 100%
                            )
                          `,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {title}
                      </h2>
                      {subtitle && (
                        <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {headerContent}
                    <button
                      onClick={onClose}
                      className="p-2 rounded-lg transition-colors hover:bg-slate-700/50"
                      data-testid="feedback-modal-close"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Progress bar (if visible) */}
                {progress && (
                  <div className="px-6 pt-4">
                    <FeedbackProgress progress={progress} showLabel showPercentage />
                  </div>
                )}

                {/* Content */}
                <div
                  className={cn(
                    'p-6 max-h-[calc(90vh-180px)] overflow-y-auto',
                    contentClassName
                  )}
                  style={{
                    background: `
                      linear-gradient(180deg,
                        rgba(15, 23, 42, 0.7) 0%,
                        rgba(30, 41, 59, 0.8) 100%
                      )
                    `,
                  }}
                >
                  {showStateIndicator && state !== 'idle' ? (
                    <FeedbackStateIndicator state={state} config={stateConfig}>
                      {children}
                    </FeedbackStateIndicator>
                  ) : (
                    children
                  )}
                </div>

                {/* Footer */}
                {footer && (
                  <div
                    className="px-6 py-4 border-t"
                    style={{
                      borderColor: 'rgba(71, 85, 105, 0.4)',
                      background: 'rgba(15, 23, 42, 0.5)',
                    }}
                  >
                    {footer}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
