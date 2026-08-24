"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Crown, X, RefreshCw } from "lucide-react";

interface StudioErrorProps {
  message: string;
  suggestion?: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  compact?: boolean;
}

/**
 * Branded error component for Studio
 *
 * Uses a tilted crown icon with warm red/amber palette.
 * Crown "rights itself" on dismiss via micro-animation.
 * Supports optional retry and dismiss actions.
 */
export function StudioError({ message, suggestion, onDismiss, onRetry, compact = false }: StudioErrorProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className={`flex items-start gap-2.5 rounded-control border border-red-500/20 bg-gradient-to-r from-red-500/10 via-amber-500/5 to-red-500/10 ${compact ? 'p-2' : 'p-3'}`}
      >
        {/* Tilted crown icon */}
        <motion.div
          className="shrink-0 mt-0.5"
          initial={{ rotate: -15 }}
          animate={{ rotate: -15 }}
          whileHover={{ rotate: 0, transition: { type: "spring", stiffness: 300 } }}
        >
          <Crown className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-amber-400/80`} />
        </motion.div>

        <div className="flex-1 min-w-0">
          <p className={`${compact ? 'text-xs' : 'text-sm'} text-red-300`}>{message}</p>
          {suggestion && (
            <p className={`${compact ? 'text-2xs' : 'text-xs'} text-amber-400/60 mt-0.5`}>{suggestion}</p>
          )}

          {/* Action buttons */}
          {(onRetry || onDismiss) && !compact && (
            <div className="flex items-center gap-2 mt-2">
              {onRetry && (
                <motion.button
                  onClick={onRetry}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-control
                    bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 hover:text-amber-300
                    border border-amber-500/30 transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  <RefreshCw className="w-3 h-3" />
                  Try Again
                </motion.button>
              )}
              {onDismiss && (
                <motion.button
                  onClick={onDismiss}
                  className="px-2.5 py-1 text-xs font-medium rounded-control
                    text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  Dismiss
                </motion.button>
              )}
            </div>
          )}
        </div>

        {/* Compact dismiss icon (only shown in compact mode) */}
        {onDismiss && compact && (
          <motion.button
            onClick={onDismiss}
            className="shrink-0 p-0.5 text-red-400/60 hover:text-red-300 transition-colors"
            whileTap={{ scale: 0.9 }}
            aria-label="Dismiss error"
          >
            <X className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
          </motion.button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
