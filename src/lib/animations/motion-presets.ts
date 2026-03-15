/**
 * Shared Motion Presets
 *
 * Centralized spring/transition configs for consistent kinetic feel.
 * All Collection-context components should use these instead of
 * inventing their own spring parameters.
 *
 * Pair with useReducedMotion() from '@/hooks/use-reduced-motion'
 * to respect prefers-reduced-motion.
 */

import type { Transition, Variant } from 'framer-motion';

// ---------------------------------------------------------------------------
// Spring presets
// ---------------------------------------------------------------------------

export const SPRING = {
  /** Quick, responsive feel — buttons, toggles, small elements */
  snappy: { type: 'spring' as const, stiffness: 400, damping: 30 },
  /** Default — modals, panels, cards */
  smooth: { type: 'spring' as const, stiffness: 300, damping: 30 },
  /** Playful overshoot — celebration, score reveals */
  bouncy: { type: 'spring' as const, stiffness: 350, damping: 15 },
} satisfies Record<string, Transition>;

// ---------------------------------------------------------------------------
// Duration presets (for opacity / color transitions)
// ---------------------------------------------------------------------------

export const DURATION = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
} as const;

// ---------------------------------------------------------------------------
// Common entrance/exit variant sets
// ---------------------------------------------------------------------------

export const FADE_VARIANTS = {
  hidden: { opacity: 0 } as Variant,
  visible: { opacity: 1 } as Variant,
  exit: { opacity: 0 } as Variant,
};

export const SCALE_FADE_VARIANTS = {
  hidden: { opacity: 0, scale: 0.95 } as Variant,
  visible: { opacity: 1, scale: 1 } as Variant,
  exit: { opacity: 0, scale: 0.95 } as Variant,
};

export const SLIDE_UP_VARIANTS = {
  hidden: { opacity: 0, y: 20 } as Variant,
  visible: { opacity: 1, y: 0 } as Variant,
  exit: { opacity: 0, y: 20 } as Variant,
};

// ---------------------------------------------------------------------------
// Reduced-motion helpers (non-hook, for use outside components)
// ---------------------------------------------------------------------------

/**
 * Returns true if the user prefers reduced motion.
 * Safe for server-side — returns false when window is unavailable.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Returns a reduced-motion-safe transition.
 * When reduced motion is preferred, falls back to a fast opacity-only tween.
 */
export function safeTransition(transition: Transition): Transition {
  if (prefersReducedMotion()) {
    return { duration: DURATION.fast };
  }
  return transition;
}

/**
 * Returns reduced-motion-safe initial/animate props.
 * When reduced motion is preferred, only opacity animates (no scale/translate).
 */
export function safeAnimate(
  initial: Record<string, unknown>,
  animate: Record<string, unknown>,
): { initial: Record<string, unknown>; animate: Record<string, unknown> } {
  if (prefersReducedMotion()) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
    };
  }
  return { initial, animate };
}
