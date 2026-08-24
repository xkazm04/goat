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
 * Timeout timing (milliseconds)
 */
export const TIMEOUT = {
  /** Backlog initialization timeout */
  BACKLOG_INIT: 10_000,
} as const;

/**
 * Animation timing (milliseconds)
 *
 * 4-tier scale aligned with CSS custom properties in design-tokens.css:
 *   --duration-instant  · --duration-quick  · --duration-normal  · --duration-slow
 *
 * Note: Match/physics-specific timing is in PhysicsConfig.ts
 */
export const ANIMATION = {
  /** Instant — focus rings, active/pressed states, tap feedback (50 ms) */
  INSTANT: 50,
  /** Quick — hover, toggle, small state changes (150 ms) */
  QUICK: 150,
  /** Fast — fade-in, collapse, subtle transitions (200 ms) */
  FAST: 200,
  /** Normal — modal entry/exit, panel slide, standard transitions (300 ms) */
  NORMAL: 300,
  /** Slow — page transitions, stagger base (500 ms) */
  SLOW: 500,
  /** Emphasis — celebration animations, extended entrances (600 ms) */
  EMPHASIS: 600,
  /** Dramatic — dramatic reveals, hero animations (800 ms) */
  DRAMATIC: 800,
} as const;

/**
 * Typed timeout error for async operations that exceed their deadline.
 */
export class TimeoutError extends Error {
  readonly operation: string;
  readonly timeoutMs: number;

  constructor(operation: string, timeoutMs: number) {
    super(`Operation "${operation}" timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Race a promise against a timeout. Rejects with TimeoutError if the
 * deadline is exceeded.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => {
      setTimeout(() => reject(new TimeoutError(operation, timeoutMs)), timeoutMs);
    }),
  ]);
}
