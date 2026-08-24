/**
 * Motion Tokens
 *
 * Choreographed animation timing presets for consistent, coordinated motion.
 * Use these tokens instead of hardcoding delay/duration/spring values so
 * the entire app's kinetic feel can be tuned from one place.
 *
 * Complements the lower-level DURATION / EASING constants in
 * micro-interactions.ts and the SPRING presets in motion-presets.ts.
 */

import type { Transition } from 'framer-motion';

// ---------------------------------------------------------------------------
// Stagger timing — controls cascading entrance sequences
// ---------------------------------------------------------------------------

/** Base stagger increment (seconds). Multiply by index for per-item delay. */
export const STAGGER_BASE = 0.05;

export const STAGGER = {
  /** Card entrance lists: i * 50ms */
  cards: STAGGER_BASE,
  /** Podium children cascade */
  podium: 0.15,
  /** Podium initial delay before children start */
  podiumDelay: 0.1,
  /** Bracket connector paths: round * 80ms */
  bracketRound: 0.08,
  /** Particle trails: (i+1) * 40ms */
  particleTrail: 0.04,
} as const;

// ---------------------------------------------------------------------------
// Entrance timing — orchestrated reveal delays (seconds)
// ---------------------------------------------------------------------------

export const ENTRANCE = {
  /** First element in a sequence (e.g. 1st-place podium block) */
  first: 0.1,
  /** Second element */
  second: 0.2,
  /** Third element */
  third: 0.3,
  /** Decorative element after main content (e.g. medal/award icons) */
  decoration: 0.4,
  /** Secondary decoration (e.g. 3rd-place award icon) */
  decorationAlt: 0.45,
  /** Trophy / hero element */
  hero: 0.5,
  /** Background / ambient effects */
  ambient: 0.6,
} as const;

export const ENTRANCE_DURATION = {
  /** Standard entrance (300ms) */
  normal: 0.3,
  /** Slow, dramatic entrance (500ms) */
  slow: 0.5,
  /** Background ambient fade (800ms) */
  ambient: 0.8,
  /** Spotlight / scenic effect (600ms) */
  scenic: 0.6,
} as const;

// ---------------------------------------------------------------------------
// Spring configs — Framer Motion transition objects
// ---------------------------------------------------------------------------

export const SPRING_CONFIG = {
  /** Podium items: gentle entrance with slight bounce */
  podiumEntrance: {
    type: 'spring' as const,
    stiffness: 100,
    damping: 14,
  } satisfies Transition,

  /** Champion / trophy appearance */
  champion: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 20,
  } satisfies Transition,

  /** Drop zone occupied card */
  dropZone: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 25,
  } satisfies Transition,

  /** Badge / icon pop-in */
  iconReveal: {
    type: 'spring' as const,
  } satisfies Transition,
} as const;

// ---------------------------------------------------------------------------
// Glow shadows — podium medal/trophy drop-shadows (Tailwind class-ready)
// ---------------------------------------------------------------------------

export const GLOW_SHADOWS = {
  /** 1st place — gold trophy glow */
  gold: {
    dropShadow: 'drop-shadow-[0_0_25px_rgba(250,204,21,0.8)]',
    textGlow: 'drop-shadow-[0_0_20px_rgba(250,204,21,0.3)]',
    color: 'rgba(250, 204, 21',
  },
  /** 2nd place — silver medal glow */
  silver: {
    dropShadow: 'drop-shadow-[0_0_10px_rgba(203,213,225,0.5)]',
    textGlow: 'drop-shadow-[0_0_10px_rgba(203,213,225,0.3)]',
    color: 'rgba(203, 213, 225',
  },
  /** 3rd place — bronze award glow */
  bronze: {
    dropShadow: 'drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]',
    textGlow: 'drop-shadow-[0_0_8px_rgba(251,146,60,0.3)]',
    color: 'rgba(251, 146, 60',
  },
  /** Champion trophy in bracket view */
  champion: {
    dropShadow: 'drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]',
    color: 'rgba(250, 204, 21',
  },
} as const;

// ---------------------------------------------------------------------------
// Connector / path animation timing
// ---------------------------------------------------------------------------

export const CONNECTOR = {
  /** Path draw duration */
  drawDuration: 0.4,
  /** Advancement orb travel duration */
  orbDuration: 0.8,
  /** Completion flash overlay duration */
  flashDuration: 1.2,
  /** Dash animation loop duration */
  dashLoop: 1.2,
  /** Pulsing indicator loop */
  pulseLoop: 1.5,
  /** Champion trophy bounce loop */
  bounceLoop: 2,
  /** Trophy sparkle loop */
  sparkleLoop: 2,
} as const;

// ---------------------------------------------------------------------------
// Celebration / arrival timing
// ---------------------------------------------------------------------------

export const CELEBRATION = {
  /** Arrival burst delay after orb reaches endpoint */
  burstDelay: 0.65,
  /** Flash overlay duration on matchup completion */
  flashDuration: 1.2,
  /** Time before flash overlay is removed from state (ms) */
  flashCleanupMs: 1300,
} as const;

// ---------------------------------------------------------------------------
// CSS animation timing (for non-Framer elements)
// ---------------------------------------------------------------------------

export const CSS_TIMING = {
  /** Rank number scale transition */
  rankTransition: 'duration-500',
  /** Fade-in for empty drop zones */
  fadeIn: 'animate-[fadeIn_200ms_ease-out]',
} as const;
