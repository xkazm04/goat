'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ExtendedFeedbackState,
  FeedbackPipelineConfig,
  FeedbackPipelineResult,
  FeedbackProgressData,
} from './types';

/**
 * Custom hook for managing async operations with visual feedback.
 *
 * This hook provides a consistent pattern for:
 * - Loading states
 * - Error handling
 * - Progress tracking
 * - Success animations
 * - Auto-reset behavior
 *
 * @example
 * ```tsx
 * const { state, execute, isProcessing, result, error } = useFeedbackPipeline({
 *   id: 'generate-image',
 *   operation: async (data) => await generateImage(data),
 *   onSuccess: (result) => console.log('Done!', result),
 *   autoResetDelay: 3000,
 * });
 *
 * // In your component:
 * <button onClick={() => execute(imageData)} disabled={isProcessing}>
 *   {isProcessing ? 'Generating...' : 'Generate'}
 * </button>
 * ```
 */
export function useFeedbackPipeline<TData = unknown, TResult = unknown>(
  config: FeedbackPipelineConfig<TData, TResult>
): FeedbackPipelineResult<TData, TResult> {
  const {
    initialState = 'idle',
    operation,
    onStateChange,
    onSuccess,
    onError,
    autoResetDelay,
    cacheResult = false,
  } = config;

  const [state, setStateInternal] = useState<ExtendedFeedbackState>(initialState);
  const [progress, setProgress] = useState<FeedbackProgressData | null>(null);
  const [result, setResult] = useState<TResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const prevStateRef = useRef<ExtendedFeedbackState>(initialState);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cachedResultRef = useRef<TResult | null>(null);

  // Clear reset timeout on unmount
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const setState = useCallback(
    (newState: ExtendedFeedbackState) => {
      const prevState = prevStateRef.current;
      prevStateRef.current = newState;
      setStateInternal(newState);
      onStateChange?.(newState, prevState);
    },
    [onStateChange]
  );

  const reset = useCallback(() => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    setState('idle');
    setProgress(null);
    setError(null);
    if (!cacheResult) {
      setResult(null);
    }
  }, [setState, cacheResult]);

  const execute = useCallback(
    async (data: TData): Promise<TResult | null> => {
      if (!operation) {
        console.warn('[FeedbackPipeline] No operation configured');
        return null;
      }

      // Check cache first
      if (cacheResult && cachedResultRef.current) {
        setResult(cachedResultRef.current);
        setState('success');
        return cachedResultRef.current;
      }

      try {
        setState('processing');
        setError(null);
        setProgress({ value: 0, indeterminate: true });

        const operationResult = await operation(data);

        setResult(operationResult);
        if (cacheResult) {
          cachedResultRef.current = operationResult;
        }
        setState('success');
        setProgress({ value: 100, label: 'Complete' });
        onSuccess?.(operationResult);

        // Auto-reset if configured
        if (autoResetDelay && autoResetDelay > 0) {
          resetTimeoutRef.current = setTimeout(() => {
            reset();
          }, autoResetDelay);
        }

        return operationResult;
      } catch (err) {
        const errorInstance = err instanceof Error ? err : new Error(String(err));
        setError(errorInstance);
        setState('error');
        setProgress(null);
        onError?.(errorInstance);
        return null;
      }
    },
    [operation, setState, onSuccess, onError, autoResetDelay, reset, cacheResult]
  );

  return {
    state,
    progress,
    result,
    error,
    isProcessing: state === 'processing' || state === 'pending' || state === 'generating',
    isSuccess: state === 'success' || state === 'complete',
    isError: state === 'error',
    isIdle: state === 'idle',
    execute,
    reset,
    setState,
    setProgress,
  };
}
