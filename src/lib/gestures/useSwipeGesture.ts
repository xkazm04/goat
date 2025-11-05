/**
 * useSwipeGesture Hook
 * Mobile-optimized swipe gesture detection with velocity and distance tracking
 */

import { useRef, useCallback, useEffect } from 'react';
import type { SwipeConfig, SwipeCallbacks, TouchPosition, SwipeEvent, SwipeDirection } from './types';

const DEFAULT_CONFIG: Required<SwipeConfig> = {
  minDistance: 50,
  maxDuration: 500,
  minVelocity: 0.3,
  debounceMs: 300,
  preventScroll: true,
};

export const useSwipeGesture = (
  elementRef: React.RefObject<HTMLElement>,
  callbacks: SwipeCallbacks,
  config: SwipeConfig = {}
) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const touchStart = useRef<TouchPosition | null>(null);
  const touchCurrent = useRef<TouchPosition | null>(null);
  const isDebouncing = useRef(false);
  const isSwiping = useRef(false);

  const calculateSwipeData = useCallback((
    start: TouchPosition,
    end: TouchPosition
  ): SwipeEvent | null => {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const duration = end.timestamp - start.timestamp;

    // Ignore swipes that are too short (accidental touches)
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance < 30) return null;

    // Check if duration exceeds max allowed
    if (duration > mergedConfig.maxDuration) return null;

    // Calculate velocity (pixels per millisecond)
    const velocity = distance / duration;

    // Ignore slow swipes
    if (velocity < mergedConfig.minVelocity) return null;

    // Determine primary direction
    let direction: SwipeDirection = 'none';
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Check if it meets minimum distance threshold
    if (distance < mergedConfig.minDistance) return null;

    // Determine if horizontal or vertical swipe
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      // Vertical swipe
      direction = deltaY > 0 ? 'down' : 'up';
    }

    return {
      direction,
      velocity,
      distance,
      duration,
    };
  }, [mergedConfig.maxDuration, mergedConfig.minDistance, mergedConfig.minVelocity]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Ignore multi-touch
    if (e.touches.length > 1) {
      touchStart.current = null;
      isSwiping.current = false;
      return;
    }

    // Ignore if currently debouncing
    if (isDebouncing.current) return;

    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };
    touchCurrent.current = touchStart.current;
    isSwiping.current = true;

    callbacks.onSwipeStart?.(e);
  }, [callbacks]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStart.current || !isSwiping.current) return;

    // Ignore multi-touch scenarios
    if (e.touches.length > 1) {
      touchStart.current = null;
      touchCurrent.current = null;
      isSwiping.current = false;
      return;
    }

    const touch = e.touches[0];
    touchCurrent.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    // Calculate progress for visual feedback
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const progress = Math.min(distance / mergedConfig.minDistance, 1);

    // Prevent default browser behavior if configured
    if (mergedConfig.preventScroll && Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
    }

    callbacks.onSwipeMove?.(e, progress);
  }, [callbacks, mergedConfig.minDistance, mergedConfig.preventScroll]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStart.current || !touchCurrent.current || !isSwiping.current) return;

    // Ignore multi-touch
    if (e.touches.length > 0) return;

    const swipeData = calculateSwipeData(touchStart.current, touchCurrent.current);

    if (swipeData) {
      callbacks.onSwipe?.(swipeData);

      // Apply debouncing to prevent rapid consecutive swipes
      isDebouncing.current = true;
      setTimeout(() => {
        isDebouncing.current = false;
      }, mergedConfig.debounceMs);
    }

    // Reset state
    touchStart.current = null;
    touchCurrent.current = null;
    isSwiping.current = false;

    callbacks.onSwipeEnd?.();
  }, [callbacks, calculateSwipeData, mergedConfig.debounceMs]);

  const handleTouchCancel = useCallback(() => {
    touchStart.current = null;
    touchCurrent.current = null;
    isSwiping.current = false;
    callbacks.onSwipeEnd?.();
  }, [callbacks]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Add event listeners with passive: false for preventDefault support
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  return {
    isDebouncing: isDebouncing.current,
    isSwiping: isSwiping.current,
  };
};
