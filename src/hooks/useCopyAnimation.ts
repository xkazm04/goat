/**
 * useCopyAnimation Hook
 *
 * Provides consistent clipboard copy functionality with animated feedback.
 * Shows checkmark confirmation and handles timing automatically.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseCopyAnimationOptions {
  /** Duration to show success state in ms (default: 2000) */
  successDuration?: number;
  /** Callback when copy succeeds */
  onSuccess?: () => void;
  /** Callback when copy fails */
  onError?: (error: Error) => void;
}

export interface UseCopyAnimationReturn {
  /** Whether content was recently copied */
  copied: boolean;
  /** Whether copy is in progress */
  copying: boolean;
  /** Copy text to clipboard with animation */
  copy: (text: string) => Promise<boolean>;
  /** Reset copied state */
  reset: () => void;
}

/**
 * Hook for animated clipboard copy functionality
 *
 * @example
 * ```tsx
 * const { copied, copy } = useCopyAnimation();
 *
 * return (
 *   <button onClick={() => copy(shareUrl)}>
 *     {copied ? <Check /> : <Copy />}
 *   </button>
 * );
 * ```
 */
export function useCopyAnimation(
  options: UseCopyAnimationOptions = {}
): UseCopyAnimationReturn {
  const {
    successDuration = 2000,
    onSuccess,
    onError,
  } = options;

  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    setCopied(false);
    setCopying(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (copying) return false;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setCopying(true);

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopying(false);
      onSuccess?.();

      // Auto-reset after success duration
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, successDuration);

      return true;
    } catch (error) {
      setCopying(false);
      const err = error instanceof Error ? error : new Error('Copy failed');
      onError?.(err);
      console.error('Failed to copy:', err);
      return false;
    }
  }, [copying, successDuration, onSuccess, onError]);

  return {
    copied,
    copying,
    copy,
    reset,
  };
}

export default useCopyAnimation;
