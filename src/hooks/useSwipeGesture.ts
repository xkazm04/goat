/**
 * useSwipeGesture Hook
 * Mobile-optimized swipe gesture detection with velocity and distance tracking
 * Supports two-stage drag-to-reorder: short swipe lifts card, then drag to reorder
 */

import { useRef, useCallback, useEffect } from 'react';
import type { SwipeConfig, SwipeCallbacks, TouchPosition, SwipeEvent, SwipeDirection, ReorderEvent } from './useSwipeGesture.types';

const DEFAULT_CONFIG: Required<SwipeConfig> = {
  minDistance: 50,
  maxDuration: 500,
  minVelocity: 0.3,
  debounceMs: 300,
  preventScroll: true,
  enableReorder: false,
  liftThreshold: 80,
  liftHoldDuration: 150,
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

  // Reorder mode state
  const isLifted = useRef(false);
  const liftTimer = useRef<NodeJS.Timeout | null>(null);
  const isReorderMode = useRef(false);

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

  // Helper to reset touch state for multi-touch
  const resetTouchState = useCallback(() => {
    touchStart.current = null;
    isSwiping.current = false;
    isLifted.current = false;
    isReorderMode.current = false;
    if (liftTimer.current) {
      clearTimeout(liftTimer.current);
      liftTimer.current = null;
    }
  }, []);

  // Helper to check if touch movement is within threshold for lift
  const isTouchWithinLiftThreshold = useCallback(() => {
    if (!touchStart.current) return false;
    const deltaX = (touchCurrent.current?.x || 0) - touchStart.current.x;
    const deltaY = (touchCurrent.current?.y || 0) - touchStart.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    return distance < 20;
  }, []);

  // Helper to trigger card lift
  const triggerCardLift = useCallback(() => {
    isLifted.current = true;
    isReorderMode.current = true;
    callbacks.onCardLift?.();
  }, [callbacks]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Ignore multi-touch
    if (e.touches.length > 1) {
      resetTouchState();
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

    // Start lift timer for reorder mode
    if (mergedConfig.enableReorder) {
      liftTimer.current = setTimeout(() => {
        const shouldLift = touchStart.current && !isLifted.current && isTouchWithinLiftThreshold();
        if (shouldLift) {
          triggerCardLift();
        }
      }, mergedConfig.liftHoldDuration);
    }

    callbacks.onSwipeStart?.(e);
  }, [callbacks, mergedConfig.enableReorder, mergedConfig.liftHoldDuration, resetTouchState, isTouchWithinLiftThreshold, triggerCardLift]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStart.current || !isSwiping.current) return;

    // Ignore multi-touch scenarios
    if (e.touches.length > 1) {
      touchCurrent.current = null;
      resetTouchState();
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

    // Cancel lift timer if moved too much before timer fires
    if (liftTimer.current && distance > 20) {
      clearTimeout(liftTimer.current);
      liftTimer.current = null;
    }

    // Handle reorder mode
    if (mergedConfig.enableReorder && isReorderMode.current) {
      // In reorder mode, fire reorder events
      const reorderEvent: ReorderEvent = {
        position: touchCurrent.current,
        targetGridPosition: null, // Will be calculated by consumer with grid dimensions
        isLifted: isLifted.current,
      };

      callbacks.onReorderMove?.(reorderEvent);

      // Prevent default browser behavior during reorder
      e.preventDefault();
      return;
    }

    // Check if we should trigger lift (swipe past threshold)
    const shouldTriggerLiftByThreshold = mergedConfig.enableReorder && !isLifted.current && distance >= mergedConfig.liftThreshold;
    if (shouldTriggerLiftByThreshold) {
      if (liftTimer.current) {
        clearTimeout(liftTimer.current);
        liftTimer.current = null;
      }
      triggerCardLift();
    }

    // Prevent default browser behavior if configured
    if (mergedConfig.preventScroll && Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
    }

    callbacks.onSwipeMove?.(e, progress);
  }, [callbacks, mergedConfig.minDistance, mergedConfig.preventScroll, mergedConfig.enableReorder, mergedConfig.liftThreshold, resetTouchState, triggerCardLift]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStart.current || !touchCurrent.current || !isSwiping.current) return;

    // Ignore multi-touch
    if (e.touches.length > 0) return;

    // Clear lift timer if still running
    if (liftTimer.current) {
      clearTimeout(liftTimer.current);
      liftTimer.current = null;
    }

    // Handle reorder completion
    if (mergedConfig.enableReorder && isReorderMode.current) {
      // Fire reorder complete callback with final position
      callbacks.onReorderComplete?.(null); // Consumer will calculate final grid position

      // Reset reorder state
      isLifted.current = false;
      isReorderMode.current = false;
      touchStart.current = null;
      touchCurrent.current = null;
      isSwiping.current = false;

      callbacks.onSwipeEnd?.();
      return;
    }

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
    isLifted.current = false;
    isReorderMode.current = false;

    callbacks.onSwipeEnd?.();
  }, [callbacks, calculateSwipeData, mergedConfig.debounceMs, mergedConfig.enableReorder]);

  const handleTouchCancel = useCallback(() => {
    if (liftTimer.current) {
      clearTimeout(liftTimer.current);
      liftTimer.current = null;
    }
    touchStart.current = null;
    touchCurrent.current = null;
    isSwiping.current = false;
    isLifted.current = false;
    isReorderMode.current = false;
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
    isLifted: isLifted.current,
    isReorderMode: isReorderMode.current,
  };
};
