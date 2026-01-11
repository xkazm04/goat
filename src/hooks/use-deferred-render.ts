/**
 * useDeferredRender - Deferred rendering hook for non-critical components
 *
 * This hook defers the rendering of components until after the initial paint,
 * improving perceived performance by allowing critical content to render first.
 *
 * Use cases:
 * - Below-the-fold content
 * - Modal/dialog content that starts hidden
 * - Heavy components with complex initialization
 * - Features that can wait for user interaction
 *
 * @param delay - Time in ms to wait before rendering (default: 0, uses requestIdleCallback)
 * @param options - Configuration options
 * @returns boolean indicating whether the component should render
 */

import { useState, useEffect } from 'react';

interface UseDeferredRenderOptions {
  /**
   * Skip deferred rendering entirely (useful for SSR or critical content)
   */
  skip?: boolean;
  /**
   * Priority level for the deferred render
   * - 'idle': Wait for browser idle (requestIdleCallback)
   * - 'animation': Wait for next animation frame (requestAnimationFrame)
   * - 'timeout': Wait for specified delay
   */
  priority?: 'idle' | 'animation' | 'timeout';
}

export function useDeferredRender(
  delay: number = 0,
  options: UseDeferredRenderOptions = {}
): boolean {
  const { skip = false, priority = delay > 0 ? 'timeout' : 'idle' } = options;
  const [shouldRender, setShouldRender] = useState(skip);

  useEffect(() => {
    if (skip) {
      setShouldRender(true);
      return;
    }

    let cleanup: (() => void) | undefined;

    switch (priority) {
      case 'idle':
        // Use requestIdleCallback for lowest priority
        if (typeof requestIdleCallback !== 'undefined') {
          const id = requestIdleCallback(() => setShouldRender(true), {
            timeout: 1000, // Fallback after 1 second
          });
          cleanup = () => cancelIdleCallback(id);
        } else {
          // Fallback for browsers without requestIdleCallback
          const timeoutId = setTimeout(() => setShouldRender(true), 50);
          cleanup = () => clearTimeout(timeoutId);
        }
        break;

      case 'animation':
        // Use requestAnimationFrame for medium priority
        const rafId = requestAnimationFrame(() => setShouldRender(true));
        cleanup = () => cancelAnimationFrame(rafId);
        break;

      case 'timeout':
      default:
        // Use setTimeout with specified delay
        const timeoutId = setTimeout(() => setShouldRender(true), delay);
        cleanup = () => clearTimeout(timeoutId);
        break;
    }

    return cleanup;
  }, [delay, priority, skip]);

  return shouldRender;
}

/**
 * useDeferredValue - Returns a value that updates only after idle
 *
 * Similar to React.useDeferredValue but works with requestIdleCallback
 * for lower priority updates.
 */
export function useDeferredValue<T>(value: T, delay: number = 0): T {
  const [deferredValue, setDeferredValue] = useState<T>(value);

  useEffect(() => {
    if (delay === 0 && typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(() => setDeferredValue(value), {
        timeout: 1000,
      });
      return () => cancelIdleCallback(id);
    } else {
      const timeoutId = setTimeout(() => setDeferredValue(value), delay);
      return () => clearTimeout(timeoutId);
    }
  }, [value, delay]);

  return deferredValue;
}

/**
 * useAfterPaint - Runs callback after the first paint
 *
 * Useful for deferring expensive operations until after the initial render.
 */
export function useAfterPaint(callback: () => void): void {
  useEffect(() => {
    // Schedule after the current frame
    const rafId = requestAnimationFrame(() => {
      // Then schedule for idle time
      if (typeof requestIdleCallback !== 'undefined') {
        const idleId = requestIdleCallback(callback, { timeout: 1000 });
        return () => cancelIdleCallback(idleId);
      } else {
        const timeoutId = setTimeout(callback, 50);
        return () => clearTimeout(timeoutId);
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [callback]);
}

export default useDeferredRender;
