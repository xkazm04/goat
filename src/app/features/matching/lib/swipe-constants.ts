/**
 * Constants for SwipeableCard component
 */

// Motion animation thresholds
export const ROTATION_RANGE = [-200, 0, 200] as const;
export const ROTATION_OUTPUT = [-25, 0, 25] as const;
export const OPACITY_RANGE = [-200, -150, 0, 150, 200] as const;
export const OPACITY_OUTPUT = [0.5, 1, 1, 1, 0.5] as const;

// Swipe detection thresholds
export const SWIPE_DIRECTION_THRESHOLD = 30; // pixels before direction is registered
export const SWIPE_OFF_SCREEN_DISTANCE = 400; // pixels for off-screen animation

// Animation durations (ms)
export const SWIPE_ANIMATION_DURATION = 0.3;
export const RESET_ANIMATION_DELAY = 350;

// Haptic feedback duration (ms)
export const HAPTIC_VIBRATION_DURATION = 50;

// Swipe gesture configuration
export const SWIPE_GESTURE_CONFIG = {
  minDistance: 50,
  maxDuration: 500,
  minVelocity: 0.3,
  debounceMs: 300,
  preventScroll: true,
} as const;

// Spring animation config
export const SPRING_CONFIG = {
  stiffness: 300,
  damping: 30,
} as const;

// Vertical movement reduction factor
export const VERTICAL_MOVEMENT_FACTOR = 0.3;
