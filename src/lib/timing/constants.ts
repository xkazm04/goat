/**
 * Timing Constants
 * Centralized configuration for debounce, delays, and UI timing
 */

/**
 * Debounce timing (milliseconds)
 */
export const DEBOUNCE = {
  /** Standard debounce for session sync operations */
  SESSION_SYNC: 300,
  /** Quick debounce for UI feedback */
  UI_FEEDBACK: 100,
  /** Search input debounce */
  SEARCH_INPUT: 300,
  /** Resize observer debounce */
  RESIZE: 150,
} as const;

/**
 * UI timing delays (milliseconds)
 */
export const UI_TIMING = {
  /** Delay before showing loading indicator */
  LOADING_DELAY: 200,
  /** Tooltip show delay */
  TOOLTIP_DELAY: 500,
  /** Toast auto-dismiss duration */
  TOAST_DURATION: 5000,
  /** Panel collapse animation duration */
  PANEL_TRANSITION: 300,
} as const;

/**
 * Retry timing (milliseconds)
 */
export const RETRY_TIMING = {
  /** Delay between retry attempts */
  RETRY_DELAY: 50,
  /** Exponential backoff base */
  BACKOFF_BASE: 100,
  /** Maximum retry delay */
  MAX_RETRY_DELAY: 5000,
} as const;

/**
 * Animation timing (milliseconds)
 * Note: Match/physics-specific timing is in PhysicsConfig.ts
 */
export const ANIMATION = {
  /** Fast UI transitions */
  FAST: 150,
  /** Normal UI transitions */
  NORMAL: 300,
  /** Slow/emphasized transitions */
  SLOW: 500,
} as const;
