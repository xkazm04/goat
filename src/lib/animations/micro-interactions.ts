/**
 * Micro-Interactions Animation Library
 *
 * Comprehensive animation system for the list creation flow and general UI.
 * Provides consistent, polished feedback at every touchpoint.
 *
 * Design Philosophy:
 * - Purposeful: Every animation serves a function
 * - Quick: Micro-interactions should be fast (100-300ms)
 * - Consistent: Use shared easing and timing across the app
 * - Accessible: Respect prefers-reduced-motion
 */

import type { Variants, Transition, TargetAndTransition } from 'framer-motion';

// =============================================================================
// Motion Design Tokens
// =============================================================================

/**
 * Standard easing curves
 * - easeOut: For departures and entrances (feels snappy)
 * - easeInOut: For transforms and state changes (feels smooth)
 * - spring: For bouncy, playful interactions
 * - decel: For settling animations
 */
export const EASING = {
  /** Quick departure, smooth arrival */
  easeOut: [0.16, 1, 0.3, 1] as const,
  /** Smooth throughout */
  easeInOut: [0.4, 0, 0.2, 1] as const,
  /** Bouncy, playful */
  spring: [0.34, 1.56, 0.64, 1] as const,
  /** Gradual deceleration */
  decel: [0.0, 0.0, 0.2, 1] as const,
  /** Sharp snap */
  snap: [0.68, -0.55, 0.27, 1.55] as const,
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

/**
 * Scale factors for press states
 */
export const SCALE = {
  /** Subtle press */
  pressed: 0.98,
  /** Normal press */
  pressedDeep: 0.95,
  /** Hover lift */
  hover: 1.02,
  /** Emphasis */
  emphasis: 1.05,
  /** Strong emphasis */
  pop: 1.1,
} as const;

/**
 * Standard shadows for depth
 */
export const SHADOWS = {
  none: 'none',
  sm: '0 2px 8px rgba(0, 0, 0, 0.15)',
  md: '0 4px 16px rgba(0, 0, 0, 0.2)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.25)',
  glow: (color: string, intensity = 0.3) =>
    `0 4px 20px rgba(${color}, ${intensity})`,
  focusRing: (color: string) =>
    `0 0 0 3px rgba(${color}, 0.4)`,
} as const;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check for reduced motion preference
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Get appropriate transition based on reduced motion preference
 */
export function getMotionSafeTransition(
  transition: Transition
): Transition {
  if (prefersReducedMotion()) {
    return { duration: 0 };
  }
  return transition;
}

/**
 * Create a spring transition with sensible defaults
 */
export function createSpringTransition(
  stiffness = 300,
  damping = 30,
  mass = 1
): Transition {
  return {
    type: 'spring',
    stiffness,
    damping,
    mass,
  };
}

// =============================================================================
// Button Micro-Interactions
// =============================================================================

/**
 * Standard button press animation
 * Use with whileTap
 */
export const buttonPress: TargetAndTransition = {
  scale: SCALE.pressed,
  transition: { duration: DURATION.instant },
};

/**
 * Deep button press animation
 * Use with whileTap for more emphasis
 */
export const buttonPressDeep: TargetAndTransition = {
  scale: SCALE.pressedDeep,
  transition: { duration: DURATION.instant },
};

/**
 * Button hover animation
 * Use with whileHover
 */
export const buttonHover: TargetAndTransition = {
  scale: SCALE.hover,
  transition: {
    duration: DURATION.quick,
    ease: EASING.easeOut,
  },
};

/**
 * Button hover with lift effect
 * Use with whileHover
 */
export const buttonHoverLift: TargetAndTransition = {
  scale: SCALE.hover,
  y: -2,
  transition: {
    duration: DURATION.quick,
    ease: EASING.easeOut,
  },
};

/**
 * Comprehensive button variants
 */
export const buttonVariants: Variants = {
  initial: {
    scale: 1,
    opacity: 1,
  },
  hover: {
    scale: SCALE.hover,
    transition: {
      duration: DURATION.quick,
      ease: EASING.easeOut,
    },
  },
  tap: {
    scale: SCALE.pressed,
    transition: { duration: DURATION.instant },
  },
  disabled: {
    opacity: 0.5,
    scale: 0.98,
  },
  loading: {
    opacity: 0.7,
  },
};

/**
 * Primary CTA button variants with glow
 */
export const ctaButtonVariants: Variants = {
  initial: {
    scale: 1,
    boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3)',
  },
  hover: {
    scale: SCALE.emphasis,
    boxShadow: '0 8px 30px rgba(6, 182, 212, 0.45)',
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
  tap: {
    scale: SCALE.pressed,
    boxShadow: '0 2px 10px rgba(6, 182, 212, 0.2)',
    transition: { duration: DURATION.instant },
  },
};

// =============================================================================
// Success Animations
// =============================================================================

/**
 * Success checkmark animation
 */
export const successCheckVariants: Variants = {
  hidden: {
    scale: 0,
    rotate: -45,
    opacity: 0,
  },
  visible: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 15,
    },
  },
};

/**
 * Success pulse ring animation
 */
export const successPulseVariants: Variants = {
  hidden: {
    scale: 0.8,
    opacity: 0,
  },
  visible: {
    scale: [1, 1.5, 1.8],
    opacity: [0.6, 0.3, 0],
    transition: {
      duration: DURATION.emphasis,
      ease: EASING.easeOut,
    },
  },
};

/**
 * Celebration confetti particle variants
 */
export const confettiVariants: Variants = {
  hidden: {
    y: 0,
    x: 0,
    scale: 0,
    rotate: 0,
    opacity: 0,
  },
  visible: (i: number) => ({
    y: [0, -100 - Math.random() * 100, 200],
    x: [0, (Math.random() - 0.5) * 200],
    scale: [0, 1, 0.5],
    rotate: [0, Math.random() * 360],
    opacity: [0, 1, 0],
    transition: {
      duration: DURATION.emphasis + Math.random() * 0.3,
      delay: i * 0.02,
      ease: EASING.easeOut,
    },
  }),
};

// =============================================================================
// Form Validation Micro-Interactions
// =============================================================================

/**
 * Form field focus animation
 */
export const fieldFocusVariants: Variants = {
  blur: {
    scale: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    boxShadow: 'none',
  },
  focus: {
    scale: 1.01,
    borderColor: 'rgba(6, 182, 212, 0.5)',
    boxShadow: '0 0 0 3px rgba(6, 182, 212, 0.15)',
    transition: {
      duration: DURATION.quick,
      ease: EASING.easeOut,
    },
  },
  error: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15)',
  },
  success: {
    borderColor: 'rgba(34, 197, 94, 0.5)',
    boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.15)',
  },
};

/**
 * Validation shake animation for errors
 */
export const errorShakeVariants: Variants = {
  initial: { x: 0 },
  shake: {
    x: [-8, 8, -6, 6, -4, 4, -2, 2, 0],
    transition: {
      duration: DURATION.slow,
      ease: 'linear',
    },
  },
};

/**
 * Validation indicator fade in
 */
export const validationIndicatorVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    x: -5,
  },
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: {
      duration: DURATION.quick,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    x: 5,
    transition: {
      duration: DURATION.quick,
    },
  },
};

// =============================================================================
// Card Interactions
// =============================================================================

/**
 * Card hover with 3D tilt
 */
export const cardHover3D = (rotateX = -5, rotateY = 5): TargetAndTransition => ({
  scale: SCALE.hover,
  rotateX,
  rotateY,
  z: 50,
  transition: {
    duration: DURATION.normal,
    ease: EASING.easeOut,
  },
});

/**
 * Card press animation
 */
export const cardPress: TargetAndTransition = {
  scale: SCALE.pressed,
  z: 0,
  transition: { duration: DURATION.instant },
};

/**
 * Card selection animation
 */
export const cardSelectVariants: Variants = {
  unselected: {
    scale: 1,
    opacity: 0.8,
    y: 0,
  },
  selected: {
    scale: SCALE.hover,
    opacity: 1,
    y: -4,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 20,
    },
  },
};

/**
 * Card entrance stagger animation
 */
export const cardEntranceVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.05,
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  }),
};

// =============================================================================
// Dropdown & Menu Animations
// =============================================================================

/**
 * Dropdown open/close animation
 */
export const dropdownVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -10,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: DURATION.quick,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: {
      duration: DURATION.quick,
      ease: EASING.easeInOut,
    },
  },
};

/**
 * Menu item hover
 */
export const menuItemVariants: Variants = {
  initial: {
    backgroundColor: 'transparent',
    x: 0,
  },
  hover: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    x: 4,
    transition: {
      duration: DURATION.quick,
      ease: EASING.easeOut,
    },
  },
  selected: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    x: 4,
  },
};

// =============================================================================
// Loading & Progress Animations
// =============================================================================

/**
 * Pulse loading animation
 */
export const pulseLoadingVariants: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Skeleton shimmer effect
 */
export const skeletonShimmerVariants: Variants = {
  initial: {
    backgroundPosition: '-200% 0',
  },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

/**
 * Progress bar fill animation
 */
export const progressFillVariants: Variants = {
  initial: { width: '0%' },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 20,
    },
  }),
};

// =============================================================================
// Icon Micro-Interactions
// =============================================================================

/**
 * Icon rotation on action (e.g., plus to X)
 */
export const iconRotateVariants: Variants = {
  initial: { rotate: 0 },
  active: {
    rotate: 45,
    transition: {
      duration: DURATION.quick,
      ease: EASING.snap,
    },
  },
};

/**
 * Icon bounce on success
 */
export const iconBounceVariants: Variants = {
  initial: { scale: 1, y: 0 },
  bounce: {
    scale: [1, 1.2, 1],
    y: [0, -5, 0],
    transition: {
      duration: DURATION.normal,
      ease: EASING.spring,
    },
  },
};

/**
 * Icon spin animation
 */
export const iconSpinVariants: Variants = {
  initial: { rotate: 0 },
  spin: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// =============================================================================
// Tooltip Animations
// =============================================================================

/**
 * Tooltip entrance animation
 */
export const tooltipVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 5,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: DURATION.quick,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: 5,
    scale: 0.95,
    transition: {
      duration: DURATION.instant,
    },
  },
};

// =============================================================================
// Color Transitions
// =============================================================================

/**
 * Color fade transition for validation states
 */
export function getValidationColorTransition(isValid: boolean, isError: boolean) {
  if (isError) {
    return {
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.05)',
    };
  }
  if (isValid) {
    return {
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.05)',
    };
  }
  return {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'transparent',
  };
}

// =============================================================================
// Spring Presets
// =============================================================================

/**
 * Pre-configured spring transitions
 */
export const SPRINGS = {
  /** Gentle, smooth spring */
  gentle: createSpringTransition(200, 25),
  /** Responsive, snappy spring */
  snappy: createSpringTransition(400, 30),
  /** Bouncy, playful spring */
  bouncy: createSpringTransition(300, 15),
  /** Stiff, minimal overshoot */
  stiff: createSpringTransition(500, 35),
} as const;

export default {
  EASING,
  DURATION,
  SCALE,
  SHADOWS,
  SPRINGS,
  prefersReducedMotion,
  getMotionSafeTransition,
  buttonVariants,
  ctaButtonVariants,
  successCheckVariants,
  successPulseVariants,
  confettiVariants,
  fieldFocusVariants,
  errorShakeVariants,
  validationIndicatorVariants,
  cardSelectVariants,
  cardEntranceVariants,
  dropdownVariants,
  menuItemVariants,
  pulseLoadingVariants,
  progressFillVariants,
  iconRotateVariants,
  iconBounceVariants,
  tooltipVariants,
};
