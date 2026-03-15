/**
 * Shared constants for themed score renderers and score bar components.
 *
 * Centralises animation timing, score thresholds, and formatting
 * so that every renderer stays visually consistent.
 */

// ─── Animation ───────────────────────────────────────────────────────

/** Default fill-animation duration (seconds). Individual renderers may override. */
export const SCORE_ANIMATION_DURATION = 0.5;

/** Default easing curve for score fill animations. */
export const SCORE_ANIMATION_EASE = 'easeOut' as const;

// ─── Score thresholds ────────────────────────────────────────────────

/** Scores at or below this value are considered "low" (red zone). */
export const SCORE_LOW_THRESHOLD = 33;

/** Scores at or below this value are considered "mid" (yellow zone). */
export const SCORE_MID_THRESHOLD = 66;

// ─── Formatting ──────────────────────────────────────────────────────

/** Format a 0-100 score for display (integer, no decimals). */
export function formatScore(score: number): string {
  return score.toFixed(0);
}
