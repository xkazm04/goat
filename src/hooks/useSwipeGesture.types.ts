/**
 * Gesture Types
 * Type definitions for swipe gesture detection and handling
 */

export type SwipeDirection = 'left' | 'right' | 'up' | 'down' | 'none';

export interface SwipeEvent {
  direction: SwipeDirection;
  velocity: number;
  distance: number;
  duration: number;
}

export interface TouchPosition {
  x: number;
  y: number;
  timestamp: number;
}

export interface SwipeConfig {
  minDistance?: number;
  maxDuration?: number;
  minVelocity?: number;
  debounceMs?: number;
  preventScroll?: boolean;
}

export interface SwipeCallbacks {
  onSwipeStart?: (event: TouchEvent) => void;
  onSwipeMove?: (event: TouchEvent, progress: number) => void;
  onSwipe?: (event: SwipeEvent) => void;
  onSwipeEnd?: () => void;
}
