/**
 * Sharing Animation Variants
 *
 * Unified animation system for social sharing UX.
 * Provides consistent timing, easing, and motion patterns across all sharing surfaces.
 */

import type { Variants, Transition } from 'framer-motion';

// ============================================================================
// Animation Constants
// ============================================================================

/** Standard easing curves */
export const EASING = {
  /** For entrances and reveals */
  easeOut: [0.16, 1, 0.3, 1] as const,
  /** For interactive feedback */
  easeInOut: [0.4, 0, 0.2, 1] as const,
  /** Bouncy spring effect */
  spring: [0.34, 1.56, 0.64, 1] as const,
  /** Smooth deceleration */
  decel: [0, 0.55, 0.45, 1] as const,
} as const;

/**
 * Duration tiers (seconds) — aligned with design-tokens.css
 *   --duration-instant · --duration-quick · --duration-normal · --duration-slow
 */
export const DURATION = {
  /** 50 ms — focus rings, active/pressed, tap feedback */
  instant: 0.05,
  /** 150 ms — hover, toggle, small state changes */
  quick: 0.15,
  /** 300 ms — modal entry/exit, panel slide, standard transitions */
  normal: 0.3,
  /** 500 ms — page transitions, stagger base, emphasis */
  slow: 0.5,
  /** 800 ms — celebration animations (extended tier) */
  celebration: 0.8,
} as const;

/** Stagger delay between items */
export const STAGGER = {
  /** Fast stagger for lists */
  fast: 0.03,
  /** Normal stagger */
  normal: 0.05,
  /** Slow stagger for emphasis */
  slow: 0.08,
} as const;

// ============================================================================
// Social Platform Colors
// ============================================================================

export const SOCIAL_COLORS = {
  twitter: '#1DA1F2',
  facebook: '#4267B2',
  linkedin: '#0077B5',
  reddit: '#FF4500',
  whatsapp: '#25D366',
  discord: '#5865F2',
  tiktok: '#000000',
  instagram: '#E4405F',
  youtube: '#FF0000',
} as const;

export type SocialPlatform = keyof typeof SOCIAL_COLORS;

// ============================================================================
// Reusable Animation Variants
// ============================================================================

/** Page entrance animation */
export const pageEntranceVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.slow,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeInOut,
    },
  },
};

/** Card entrance with scale */
export const cardEntranceVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: DURATION.slow,
      ease: EASING.easeOut,
    },
  },
};

/** List item stagger animation */
export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
  },
};

/** Container for staggered children */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER.normal,
      delayChildren: 0.1,
    },
  },
};

/** Social button hover effect */
export const socialButtonVariants: Variants = {
  idle: {
    scale: 1,
    boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
  },
  hover: {
    scale: 1.08,
    transition: {
      duration: DURATION.quick,
      ease: EASING.easeOut,
    },
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: DURATION.quick,
    },
  },
};

/** Copy confirmation animation */
export const copyConfirmVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.5,
    rotate: -90,
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.spring,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.5,
    transition: {
      duration: DURATION.quick,
    },
  },
};

/** Success celebration pulse */
export const celebrationPulseVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
  },
  visible: {
    opacity: [0, 1, 0.8, 0],
    scale: [0.5, 1.2, 1.4, 1.6],
    transition: {
      duration: DURATION.celebration,
      ease: EASING.easeOut,
    },
  },
};

/** Shimmer effect for cards */
export const shimmerVariants: Variants = {
  hidden: {
    x: '-100%',
    opacity: 0,
  },
  visible: {
    x: '100%',
    opacity: [0, 0.5, 0],
    transition: {
      duration: 1.5,
      ease: 'linear',
      repeat: Infinity,
      repeatDelay: 3,
    },
  },
};

/** Medal bounce animation */
export const medalBounceVariants: Variants = {
  hidden: {
    scale: 0,
    rotate: -180,
  },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 15,
    },
  },
  hover: {
    scale: 1.15,
    rotate: [0, -5, 5, 0],
    transition: {
      duration: DURATION.normal,
    },
  },
};

/** Counter number animation */
export const counterVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
};

/** Download progress animation */
export const progressVariants: Variants = {
  hidden: {
    scaleX: 0,
    originX: 0,
  },
  visible: (progress: number) => ({
    scaleX: progress,
    transition: {
      duration: DURATION.quick,
      ease: EASING.easeOut,
    },
  }),
};

// ============================================================================
// Transition Presets
// ============================================================================

/** Spring transition for bouncy effects */
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 25,
};

/** Smooth transition for subtle effects */
export const smoothTransition: Transition = {
  duration: DURATION.normal,
  ease: EASING.easeInOut,
};

/** Fast micro-interaction transition */
export const microTransition: Transition = {
  duration: DURATION.quick,
  ease: EASING.easeOut,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get platform-specific glow shadow
 */
export function getPlatformGlow(platform: SocialPlatform, intensity: number = 0.3): string {
  const color = SOCIAL_COLORS[platform];
  return `0 0 ${20 * intensity}px ${color}${Math.round(intensity * 100).toString(16).padStart(2, '0')}`;
}

/**
 * Get stagger delay for item index
 */
export function getStaggerDelay(index: number, type: keyof typeof STAGGER = 'normal'): number {
  return index * STAGGER[type];
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get animation props respecting reduced motion preference
 */
export function getMotionProps<T extends Variants>(
  variants: T,
  reducedMotion: boolean = prefersReducedMotion()
): { variants: T; initial: string; animate: string } | { initial: false } {
  if (reducedMotion) {
    return { initial: false };
  }
  return {
    variants,
    initial: 'hidden',
    animate: 'visible',
  };
}
