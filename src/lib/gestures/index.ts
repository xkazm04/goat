/**
 * Gestures Library
 * Unified gesture detection and action handling for touch-first interactions
 */

// Core gesture recognition
export {
  GestureRecognizer,
  createGestureRecognizer,
  DEFAULT_GESTURE_CONFIG,
} from './GestureRecognizer';
export type {
  GestureType,
  GestureState,
  GestureConfig,
  GestureCallbacks,
  GestureData,
  TouchPoint,
  Velocity,
} from './GestureRecognizer';

// Swipe action handling
export {
  SwipeActionHandler,
  createSwipeActionHandler,
  DEFAULT_SWIPE_ACTION_CONFIG,
  DEFAULT_BACKLOG_BINDINGS,
  DEFAULT_GRID_BINDINGS,
} from './SwipeActionHandler';
export type {
  SwipeAction,
  SwipeActionBinding,
  SwipeActionHandlerConfig,
  ActionContext,
  ActionResult,
  ActionHandler,
} from './SwipeActionHandler';
