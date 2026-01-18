'use client';

/**
 * TouchGestureHandler
 * Swipe/pinch gesture recognition for touch devices
 */

import React, {
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from 'react';
import { cn } from '@/lib/utils';
import { useLayout } from '../LayoutManager';
import { GESTURE_THRESHOLDS } from '../constants';
import type { GestureType } from '../types';

/**
 * Touch point tracking
 */
interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

/**
 * Gesture result
 */
interface GestureResult {
  type: GestureType;
  direction?: 'up' | 'down' | 'left' | 'right';
  velocity?: { x: number; y: number };
  distance?: { x: number; y: number };
  scale?: number;
  duration: number;
}

/**
 * TouchGestureHandler Props
 */
interface TouchGestureHandlerProps {
  children: ReactNode;
  className?: string;
  /** Enable gesture handling */
  enabled?: boolean;
  /** Gestures to recognize */
  enabledGestures?: GestureType[];
  /** Callback when gesture is recognized */
  onGesture?: (gesture: GestureResult) => void;
  /** Callback for specific gestures */
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchIn?: (scale: number) => void;
  onPinchOut?: (scale: number) => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  /** Prevent default touch behavior */
  preventDefault?: boolean;
  /** Stop propagation */
  stopPropagation?: boolean;
}

/**
 * TouchGestureHandler Component
 */
export function TouchGestureHandler({
  children,
  className,
  enabled = true,
  enabledGestures,
  onGesture,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinchIn,
  onPinchOut,
  onDoubleTap,
  onLongPress,
  preventDefault = false,
  stopPropagation = false,
}: TouchGestureHandlerProps) {
  const layout = useLayout();
  const containerRef = useRef<HTMLDivElement>(null);

  // Touch tracking state
  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchesRef = useRef<React.Touch[]>([]);
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialPinchDistanceRef = useRef<number>(0);

  // Check if gesture is enabled
  const isGestureEnabled = useCallback(
    (gesture: GestureType): boolean => {
      if (!enabled || !layout.gestureEnabled) return false;
      if (!enabledGestures) return true;
      return enabledGestures.includes(gesture);
    },
    [enabled, layout.gestureEnabled, enabledGestures]
  );

  // Calculate distance between two touch points
  const getDistance = useCallback((touch1: { clientX: number; clientY: number }, touch2: { clientX: number; clientY: number }): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Handle gesture result
  const handleGestureResult = useCallback(
    (result: GestureResult) => {
      onGesture?.(result);

      // Call specific handlers
      switch (result.type) {
        case 'swipe-left':
          onSwipeLeft?.();
          layout.handleGesture('swipe-left');
          break;
        case 'swipe-right':
          onSwipeRight?.();
          layout.handleGesture('swipe-right');
          break;
        case 'swipe-up':
          onSwipeUp?.();
          layout.handleGesture('swipe-up');
          break;
        case 'swipe-down':
          onSwipeDown?.();
          layout.handleGesture('swipe-down');
          break;
        case 'pinch-in':
          onPinchIn?.(result.scale || 1);
          layout.handleGesture('pinch-in');
          break;
        case 'pinch-out':
          onPinchOut?.(result.scale || 1);
          layout.handleGesture('pinch-out');
          break;
        case 'double-tap':
          onDoubleTap?.();
          layout.handleGesture('double-tap');
          break;
        case 'long-press':
          onLongPress?.();
          layout.handleGesture('long-press');
          break;
      }
    },
    [
      onGesture,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      onPinchIn,
      onPinchOut,
      onDoubleTap,
      onLongPress,
      layout,
    ]
  );

  // Touch start handler
  const handleTouchStart = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      if (!enabled) return;
      if (preventDefault) e.preventDefault();
      if (stopPropagation) e.stopPropagation();

      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
      };
      touchesRef.current = Array.from(e.touches);

      // Check for double tap
      const now = Date.now();
      if (
        isGestureEnabled('double-tap') &&
        now - lastTapRef.current < GESTURE_THRESHOLDS.doubleTapDelay
      ) {
        handleGestureResult({
          type: 'double-tap',
          duration: now - lastTapRef.current,
        });
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }

      // Start long press timer
      if (isGestureEnabled('long-press')) {
        longPressTimerRef.current = setTimeout(() => {
          handleGestureResult({
            type: 'long-press',
            duration: GESTURE_THRESHOLDS.longPressDelay,
          });
        }, GESTURE_THRESHOLDS.longPressDelay);
      }

      // Track initial pinch distance
      if (e.touches.length === 2) {
        initialPinchDistanceRef.current = getDistance(
          e.touches[0],
          e.touches[1]
        );
      }
    },
    [
      enabled,
      preventDefault,
      stopPropagation,
      isGestureEnabled,
      handleGestureResult,
      getDistance,
    ]
  );

  // Touch move handler
  const handleTouchMove = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      if (!enabled) return;
      if (preventDefault) e.preventDefault();

      // Cancel long press on move
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      // Track pinch
      if (e.touches.length === 2 && initialPinchDistanceRef.current > 0) {
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / initialPinchDistanceRef.current;

        // Detect pinch direction
        if (scale < GESTURE_THRESHOLDS.pinchMinScale) {
          if (isGestureEnabled('pinch-in')) {
            // Will fire on touch end
          }
        } else if (scale > 1 + GESTURE_THRESHOLDS.pinchMinScale) {
          if (isGestureEnabled('pinch-out')) {
            // Will fire on touch end
          }
        }
      }

      touchesRef.current = Array.from(e.touches);
    },
    [enabled, preventDefault, getDistance, isGestureEnabled]
  );

  // Touch end handler
  const handleTouchEnd = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      if (!enabled || !touchStartRef.current) return;
      if (preventDefault) e.preventDefault();
      if (stopPropagation) e.stopPropagation();

      // Cancel long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      const start = touchStartRef.current;
      const end: TouchPoint = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
        timestamp: Date.now(),
      };

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const duration = end.timestamp - start.timestamp;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check for pinch
      if (touchesRef.current.length === 2 && initialPinchDistanceRef.current > 0) {
        const lastDistance = getDistance(
          touchesRef.current[0],
          touchesRef.current[1]
        );
        const scale = lastDistance / initialPinchDistanceRef.current;

        if (scale < 1 - GESTURE_THRESHOLDS.pinchMinScale) {
          if (isGestureEnabled('pinch-in')) {
            handleGestureResult({
              type: 'pinch-in',
              scale,
              duration,
            });
          }
        } else if (scale > 1 + GESTURE_THRESHOLDS.pinchMinScale) {
          if (isGestureEnabled('pinch-out')) {
            handleGestureResult({
              type: 'pinch-out',
              scale,
              duration,
            });
          }
        }

        initialPinchDistanceRef.current = 0;
        touchStartRef.current = null;
        return;
      }

      // Check for swipe
      if (
        distance >= GESTURE_THRESHOLDS.swipeMinDistance &&
        duration <= GESTURE_THRESHOLDS.swipeMaxDuration
      ) {
        const velocity = {
          x: dx / duration,
          y: dy / duration,
        };

        // Determine swipe direction
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx > absDy) {
          // Horizontal swipe
          const type = dx > 0 ? 'swipe-right' : 'swipe-left';
          if (isGestureEnabled(type)) {
            handleGestureResult({
              type,
              direction: dx > 0 ? 'right' : 'left',
              velocity,
              distance: { x: dx, y: dy },
              duration,
            });
          }
        } else {
          // Vertical swipe
          const type = dy > 0 ? 'swipe-down' : 'swipe-up';
          if (isGestureEnabled(type)) {
            handleGestureResult({
              type,
              direction: dy > 0 ? 'down' : 'up',
              velocity,
              distance: { x: dx, y: dy },
              duration,
            });
          }
        }
      }

      touchStartRef.current = null;
      touchesRef.current = [];
    },
    [
      enabled,
      preventDefault,
      stopPropagation,
      getDistance,
      isGestureEnabled,
      handleGestureResult,
    ]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn('touch-manipulation', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        touchStartRef.current = null;
        touchesRef.current = [];
      }}
    >
      {children}
    </div>
  );
}

/**
 * useGesture hook - for using gestures without wrapper
 */
export function useGesture(options: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  enabled?: boolean;
}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onDoubleTap,
    onLongPress,
    enabled = true,
  } = options;

  const touchStartRef = useRef<TouchPoint | null>(null);
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlers = {
    onTouchStart: useCallback(
      (e: ReactTouchEvent) => {
        if (!enabled) return;

        const touch = e.touches[0];
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          timestamp: Date.now(),
        };

        // Double tap check
        const now = Date.now();
        if (now - lastTapRef.current < GESTURE_THRESHOLDS.doubleTapDelay) {
          onDoubleTap?.();
          lastTapRef.current = 0;
        } else {
          lastTapRef.current = now;
        }

        // Long press
        longPressTimerRef.current = setTimeout(() => {
          onLongPress?.();
        }, GESTURE_THRESHOLDS.longPressDelay);
      },
      [enabled, onDoubleTap, onLongPress]
    ),

    onTouchMove: useCallback(() => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }, []),

    onTouchEnd: useCallback(
      (e: ReactTouchEvent) => {
        if (!enabled || !touchStartRef.current) return;

        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }

        const start = touchStartRef.current;
        const end = e.changedTouches[0];
        const dx = end.clientX - start.x;
        const dy = end.clientY - start.y;
        const duration = Date.now() - start.timestamp;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (
          distance >= GESTURE_THRESHOLDS.swipeMinDistance &&
          duration <= GESTURE_THRESHOLDS.swipeMaxDuration
        ) {
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          if (absDx > absDy) {
            if (dx > 0) onSwipeRight?.();
            else onSwipeLeft?.();
          } else {
            if (dy > 0) onSwipeDown?.();
            else onSwipeUp?.();
          }
        }

        touchStartRef.current = null;
      },
      [enabled, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]
    ),

    onTouchCancel: useCallback(() => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      touchStartRef.current = null;
    }, []),
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return handlers;
}
