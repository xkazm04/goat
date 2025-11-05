"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingState } from '@/hooks';

interface LoadingStateIndicatorProps {
  state: LoadingState;
  className?: string;
}

interface LoadingPhase {
  id: string;
  label: string;
  state: 'LOADING_LIST' | 'LOADING_FETCH' | 'LOADING_BACKLOG';
}

const loadingPhases: LoadingPhase[] = [
  { id: 'list', label: 'Loading List', state: 'LOADING_LIST' },
  { id: 'fetch', label: 'Fetching Data', state: 'LOADING_FETCH' },
  { id: 'backlog', label: 'Loading Items', state: 'LOADING_BACKLOG' }
];

export function LoadingStateIndicator({ state, className = '' }: LoadingStateIndicatorProps) {
  // Don't show if not in a loading state
  if (state.type !== 'LOADING_LIST' && state.type !== 'LOADING_FETCH' && state.type !== 'LOADING_BACKLOG') {
    return null;
  }

  const currentPhaseIndex = loadingPhases.findIndex(phase => phase.state === state.type);

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg px-6 py-4 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <motion.div
              className="w-4 h-4 bg-blue-500 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.8, 1]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="absolute inset-0 w-4 h-4 bg-blue-500 rounded-full"
              animate={{
                scale: [1, 1.5, 2],
                opacity: [0.8, 0.4, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
          </div>
          <span className="text-sm font-medium text-slate-200">
            {loadingPhases[currentPhaseIndex]?.label || 'Loading...'}
          </span>
        </div>

        {/* Progress bar container */}
        <div className="flex items-center gap-2">
          {loadingPhases.map((phase, index) => {
            const isActive = index === currentPhaseIndex;
            const isCompleted = index < currentPhaseIndex;
            const isPending = index > currentPhaseIndex;

            return (
              <React.Fragment key={phase.id}>
                {/* Phase indicator */}
                <div className="flex flex-col items-center gap-1">
                  <motion.div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                    animate={isActive ? {
                      boxShadow: [
                        '0 0 0 0 rgba(59, 130, 246, 0.7)',
                        '0 0 0 8px rgba(59, 130, 246, 0)',
                        '0 0 0 0 rgba(59, 130, 246, 0)'
                      ]
                    } : {}}
                    transition={{
                      duration: 1.5,
                      repeat: isActive ? Infinity : 0,
                      ease: "easeInOut"
                    }}
                  >
                    {isCompleted ? (
                      <motion.svg
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </motion.svg>
                    ) : (
                      index + 1
                    )}
                  </motion.div>

                  {/* Phase label */}
                  <span className={`text-xs whitespace-nowrap transition-colors ${
                    isActive ? 'text-blue-400' : isPending ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    {phase.label.split(' ')[1]}
                  </span>
                </div>

                {/* Connector line */}
                {index < loadingPhases.length - 1 && (
                  <div className="flex-1 h-0.5 bg-slate-700 relative overflow-hidden min-w-[60px]">
                    <AnimatePresence>
                      {(isCompleted || isActive) && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-blue-500 to-green-500"
                          initial={{ width: '0%' }}
                          animate={{ width: isCompleted ? '100%' : '50%' }}
                          exit={{ width: '100%' }}
                          transition={{
                            duration: 0.5,
                            ease: "easeOut"
                          }}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Progress percentage */}
        {'progress' in state && typeof state.progress === 'number' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 border-t border-slate-700"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Progress</span>
              <span className="text-blue-400 font-semibold">{Math.round(state.progress)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                initial={{ width: 0 }}
                animate={{ width: `${state.progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
