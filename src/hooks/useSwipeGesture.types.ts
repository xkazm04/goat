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
  /** Enable two-stage drag for reordering (lift then move) */
  enableReorder?: boolean;
  /** Distance threshold to lift card in reorder mode */
  liftThreshold?: number;
  /** Duration to hold before lifting (ms) */
  liftHoldDuration?: number;
}

export interface GridPosition {
  x: number;
  y: number;
  index: number;
}

export interface ReorderEvent {
  /** Current touch position */
  position: TouchPosition;
  /** Target grid position if hovering over one */
  targetGridPosition: GridPosition | null;
  /** Whether the card is lifted (stage 2) */
  isLifted: boolean;
}

export interface SwipeCallbacks {
  onSwipeStart?: (event: TouchEvent) => void;
  onSwipeMove?: (event: TouchEvent, progress: number) => void;
  onSwipe?: (event: SwipeEvent) => void;
  onSwipeEnd?: () => void;
  /** Called when card is lifted in reorder mode */
  onCardLift?: () => void;
  /** Called during reorder drag with position updates */
  onReorderMove?: (event: ReorderEvent) => void;
  /** Called when reorder completes with final position */
  onReorderComplete?: (targetPosition: GridPosition | null) => void;
}
