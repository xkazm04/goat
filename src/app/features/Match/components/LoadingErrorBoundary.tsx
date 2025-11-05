"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LoadingState,
  ErrorType
} from '@/hooks';
import {
  WifiOff,
  AlertCircle,
  ServerCrash,
  HelpCircle,
  X,
  RotateCcw,
  Info
} from 'lucide-react';

interface LoadingErrorBoundaryProps {
  state: LoadingState;
  onDismiss: () => void;
}

// Error type configurations with icons and colors
const errorConfigs = {
  NETWORK: {
    icon: WifiOff,
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    iconColor: 'text-orange-400',
    title: 'Network Error',
    animation: 'animate-pulse'
  },
  VALIDATION: {
    icon: AlertCircle,
    color: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    iconColor: 'text-yellow-400',
    title: 'Validation Error',
    animation: 'animate-bounce'
  },
  SERVER: {
    icon: ServerCrash,
    color: 'from-red-500 to-pink-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    iconColor: 'text-red-400',
    title: 'Server Error',
    animation: 'animate-pulse'
  },
  UNKNOWN: {
    icon: HelpCircle,
    color: 'from-gray-500 to-slate-500',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    iconColor: 'text-gray-400',
    title: 'Unexpected Error',
    animation: 'animate-pulse'
  }
};

export function LoadingErrorBoundary({ state, onDismiss }: LoadingErrorBoundaryProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (state.type === 'ERROR') {
      setIsVisible(true);
    } else {
      setIsVisible(false);
      setShowDetails(false);
    }
  }, [state]);

  if (state.type !== 'ERROR') {
    return null;
  }

  const config = errorConfigs[state.errorType as ErrorType];
  const Icon = config.icon;

  const handleRetry = () => {
    if (state.recoveryAction) {
      state.recoveryAction();
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
        >
          <div
            className={`
              relative overflow-hidden rounded-xl border backdrop-blur-xl
              ${config.bgColor} ${config.borderColor}
              shadow-2xl
            `}
          >
            {/* Gradient overlay */}
            <div
              className={`
                absolute inset-0 opacity-20 blur-xl
                bg-gradient-to-r ${config.color}
              `}
            />

            {/* Content */}
            <div className="relative p-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-4 flex-1">
                  {/* Animated Icon */}
                  <div className={`${config.animation} mt-1`}>
                    <Icon className={`w-8 h-8 ${config.iconColor}`} />
                  </div>

                  {/* Error info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-white mb-1">
                      {config.title}
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {state.message}
                    </p>

                    {/* Status code badge */}
                    {state.statusCode && (
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 text-xs font-mono text-gray-400">
                        Status: {state.statusCode}
                      </div>
                    )}
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={handleDismiss}
                  className="
                    p-2 rounded-lg transition-colors
                    hover:bg-white/10 active:bg-white/20
                    text-gray-400 hover:text-white
                  "
                  aria-label="Dismiss error"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-4">
                {/* Retry button */}
                {state.recoveryAction && (
                  <button
                    onClick={handleRetry}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg
                      bg-gradient-to-r ${config.color}
                      text-white font-medium text-sm
                      transition-all duration-200
                      hover:shadow-lg hover:scale-105
                      active:scale-95
                    `}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Retry
                  </button>
                )}

                {/* Dismiss button */}
                <button
                  onClick={handleDismiss}
                  className="
                    px-4 py-2 rounded-lg text-sm font-medium
                    text-gray-300 hover:text-white
                    bg-white/5 hover:bg-white/10
                    transition-all duration-200
                  "
                >
                  Dismiss
                </button>

                {/* Show details toggle */}
                {state.details && (
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                      text-gray-400 hover:text-gray-300
                      hover:bg-white/5
                      transition-all duration-200
                      ml-auto
                    "
                  >
                    <Info className="w-4 h-4" />
                    {showDetails ? 'Hide' : 'Show'} Details
                  </button>
                )}
              </div>

              {/* Error details */}
              <AnimatePresence>
                {showDetails && state.details && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs font-semibold text-gray-400 mb-2">
                        Technical Details
                      </p>
                      <pre className="text-xs text-gray-500 bg-black/30 p-3 rounded-lg overflow-x-auto font-mono">
                        {state.details}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Timestamp */}
              <div className="mt-4 text-xs text-gray-500">
                {new Date(state.timestamp).toLocaleString()}
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
              <div className={`w-full h-full bg-gradient-to-br ${config.color} rounded-full blur-3xl`} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
