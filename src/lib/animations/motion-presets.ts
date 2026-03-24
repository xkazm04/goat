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
// Duration presets (seconds) — 4-tier scale
// Mirrors CSS custom properties in design-tokens.css:
//   --duration-instant · --duration-quick · --duration-normal · --duration-slow
// ---------------------------------------------------------------------------

export const DURATION = {
  /** 50 ms — focus rings, active/pressed, tap feedback */
  instant: 0.05,
  /** 150 ms — hover, toggle, small state changes */
  quick: 0.15,
  /** 200 ms — fade-in, collapse, subtle transitions */
  fast: 0.2,
  /** 300 ms — modal entry/exit, panel slide, standard transitions */
  normal: 0.3,
  /** 500 ms — page transitions, stagger base */
  slow: 0.5,
  /** 600 ms — celebration animations, extended entrances */
  emphasis: 0.6,
  /** 800 ms — dramatic reveals, hero animations */
  dramatic: 0.8,
} as const;

// ---------------------------------------------------------------------------
// Easing presets — cubic-bezier curves for Framer Motion `ease` prop
// ---------------------------------------------------------------------------

export const EASE = {
  /** Quick departure, smooth arrival — entrances & exits */
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  /** Smooth throughout — transforms & state changes */
  inOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  /** Bouncy, playful overshoot */
  spring: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  /** Gradual deceleration — settling animations */
  decel: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
} as const;

/**
 * Easing presets — verbose key alias of EASE for self-documenting usage.
 * Canonical curves live in EASE above; prefer EASE for new code.
 */
export const EASING = {
  /** Quick departure, smooth arrival — entrances & exits */
  easeOut: EASE.out,
  /** Smooth throughout — transforms & state changes */
  easeInOut: EASE.inOut,
  /** Bouncy, playful overshoot */
  spring: EASE.spring,
  /** Gradual deceleration — settling animations */
  decel: EASE.decel,
  /** Sharp snap — icon rotations, toggles */
  snap: [0.68, -0.55, 0.27, 1.55] as [number, number, number, number],
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
    return { duration: DURATION.quick };
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
