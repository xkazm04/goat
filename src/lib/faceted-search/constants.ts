/**
 * Faceted Search Constants
 * Animation timing and transition tokens used by facet UI components.
 */

export const FACET_TIMING = {
  fast: 0.15,
  standard: 0.2,
  slow: 0.3,
  stagger: 0.05,
  staggerChildren: 0.03,
} as const;

export const FACET_ANIMATIONS = {
  panel: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
    mass: 0.8,
  },
  chip: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 35,
    mass: 0.6,
  },
  transition: {
    duration: FACET_TIMING.standard,
    ease: [0.4, 0, 0.2, 1] as const,
  },
  stagger: {
    delayChildren: FACET_TIMING.stagger,
    staggerChildren: FACET_TIMING.staggerChildren,
  },
};
