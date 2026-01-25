'use client';

/**
 * Scroll Trigger Utilities
 *
 * Performance-optimized scroll-triggered animations using IntersectionObserver
 * and requestAnimationFrame. Provides hooks and utilities for revealing
 * content on scroll with configurable thresholds and animation variants.
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import type { Variants, Transition } from 'framer-motion';
import { useMotionCapabilities } from '@/hooks/use-motion-preference';

// =============================================================================
// Types
// =============================================================================

export interface ScrollTriggerOptions {
  /** Threshold for triggering (0-1, default: 0.1) */
  threshold?: number;
  /** Root margin for early/late triggering (default: '0px') */
  rootMargin?: string;
  /** Only trigger once (default: true) */
  triggerOnce?: boolean;
  /** Delay before animation starts (ms, default: 0) */
  delay?: number;
  /** Skip animation and show immediately (default: false) */
  skip?: boolean;
}

export interface ScrollTriggerResult {
  /** Ref to attach to the element */
  ref: React.RefObject<HTMLElement>;
  /** Whether element is in view */
  isInView: boolean;
  /** Whether animation has been triggered */
  hasTriggered: boolean;
  /** Manually trigger the animation */
  trigger: () => void;
  /** Reset the trigger state */
  reset: () => void;
}

export type ScrollAnimationType =
  | 'fade'
  | 'fadeUp'
  | 'fadeDown'
  | 'fadeLeft'
  | 'fadeRight'
  | 'scale'
  | 'scaleUp'
  | 'blur'
  | 'slideUp'
  | 'slideDown'
  | 'flip'
  | 'rotate';

// =============================================================================
// Animation Presets
// =============================================================================

const BASE_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 100,
  damping: 20,
  mass: 0.5,
};

/**
 * Pre-defined animation variants for common scroll reveal patterns
 */
export const scrollAnimationVariants: Record<ScrollAnimationType, Variants> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { ...BASE_TRANSITION, duration: 0.5 } },
  },
  fadeUp: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: BASE_TRANSITION },
  },
  fadeDown: {
    hidden: { opacity: 0, y: -40 },
    visible: { opacity: 1, y: 0, transition: BASE_TRANSITION },
  },
  fadeLeft: {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0, transition: BASE_TRANSITION },
  },
  fadeRight: {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0, transition: BASE_TRANSITION },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: BASE_TRANSITION },
  },
  scaleUp: {
    hidden: { opacity: 0, scale: 0.5, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: BASE_TRANSITION },
  },
  blur: {
    hidden: { opacity: 0, filter: 'blur(10px)' },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      transition: { ...BASE_TRANSITION, duration: 0.6 },
    },
  },
  slideUp: {
    hidden: { y: 100 },
    visible: { y: 0, transition: BASE_TRANSITION },
  },
  slideDown: {
    hidden: { y: -100 },
    visible: { y: 0, transition: BASE_TRANSITION },
  },
  flip: {
    hidden: { opacity: 0, rotateX: -90, transformPerspective: 1000 },
    visible: {
      opacity: 1,
      rotateX: 0,
      transformPerspective: 1000,
      transition: { ...BASE_TRANSITION, stiffness: 80 },
    },
  },
  rotate: {
    hidden: { opacity: 0, rotate: -10, scale: 0.95 },
    visible: { opacity: 1, rotate: 0, scale: 1, transition: BASE_TRANSITION },
  },
};

/**
 * Stagger container variants for animating lists of items
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

/**
 * Create custom stagger container with configurable timing
 */
export function createStaggerContainer(
  staggerChildren: number = 0.1,
  delayChildren: number = 0
): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren,
        delayChildren,
      },
    },
  };
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook for triggering animations when element enters viewport
 *
 * @example
 * ```tsx
 * function AnimatedSection() {
 *   const { ref, isInView } = useScrollTrigger({ threshold: 0.2 });
 *
 *   return (
 *     <motion.div
 *       ref={ref}
 *       initial="hidden"
 *       animate={isInView ? 'visible' : 'hidden'}
 *       variants={scrollAnimationVariants.fadeUp}
 *     >
 *       Content
 *     </motion.div>
 *   );
 * }
 * ```
 */
export function useScrollTrigger(
  options: ScrollTriggerOptions = {}
): ScrollTriggerResult {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = true,
    delay = 0,
    skip = false,
  } = options;

  const ref = useRef<HTMLElement | null>(null);
  const [isInView, setIsInView] = useState(skip);
  const [hasTriggered, setHasTriggered] = useState(skip);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { allowTransitions } = useMotionCapabilities();

  // Skip animations if motion is reduced
  const effectiveSkip = skip || !allowTransitions;

  const trigger = useCallback(() => {
    setHasTriggered(true);
    setIsInView(true);
  }, []);

  const reset = useCallback(() => {
    setHasTriggered(false);
    setIsInView(false);
  }, []);

  useEffect(() => {
    if (effectiveSkip) {
      setIsInView(true);
      setHasTriggered(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (delay > 0) {
              timeoutRef.current = setTimeout(() => {
                setIsInView(true);
                setHasTriggered(true);
              }, delay);
            } else {
              setIsInView(true);
              setHasTriggered(true);
            }

            if (triggerOnce) {
              observer.unobserve(element);
            }
          } else if (!triggerOnce) {
            setIsInView(false);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [threshold, rootMargin, triggerOnce, delay, effectiveSkip]);

  return {
    ref: ref as React.RefObject<HTMLElement>,
    isInView,
    hasTriggered,
    trigger,
    reset,
  };
}

/**
 * Hook for staggered animations on scroll
 * Returns animation controls for a container with multiple children
 *
 * @example
 * ```tsx
 * function StaggeredList() {
 *   const { containerRef, isInView, itemVariants } = useStaggeredScroll({
 *     itemAnimation: 'fadeUp',
 *     staggerDelay: 0.15,
 *   });
 *
 *   return (
 *     <motion.ul
 *       ref={containerRef}
 *       initial="hidden"
 *       animate={isInView ? 'visible' : 'hidden'}
 *       variants={staggerContainerVariants}
 *     >
 *       {items.map((item) => (
 *         <motion.li key={item.id} variants={itemVariants}>
 *           {item.content}
 *         </motion.li>
 *       ))}
 *     </motion.ul>
 *   );
 * }
 * ```
 */
export function useStaggeredScroll(options: {
  itemAnimation?: ScrollAnimationType;
  staggerDelay?: number;
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}) {
  const {
    itemAnimation = 'fadeUp',
    staggerDelay = 0.1,
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = true,
  } = options;

  const { ref, isInView, hasTriggered } = useScrollTrigger({
    threshold,
    rootMargin,
    triggerOnce,
  });

  const containerVariants = useMemo(
    () => createStaggerContainer(staggerDelay, 0),
    [staggerDelay]
  );

  const itemVariants = useMemo(
    () => scrollAnimationVariants[itemAnimation],
    [itemAnimation]
  );

  return {
    containerRef: ref,
    isInView,
    hasTriggered,
    containerVariants,
    itemVariants,
  };
}

/**
 * Hook for scroll-linked progress value (0 to 1)
 * Useful for progress bars, scroll indicators, or custom scroll-based animations
 */
export function useScrollProgress(options: {
  /** Target element ref (uses viewport if not provided) */
  target?: React.RefObject<HTMLElement>;
  /** Start measuring from this offset (default: 'start end') */
  offsetStart?: string;
  /** End measuring at this offset (default: 'end start') */
  offsetEnd?: string;
} = {}) {
  const { target, offsetStart = 'start end', offsetEnd = 'end start' } = options;
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        if (target?.current) {
          const rect = target.current.getBoundingClientRect();
          const windowHeight = window.innerHeight;

          // Calculate progress: 0 when element enters viewport, 1 when it exits
          const elementTop = rect.top;
          const elementHeight = rect.height;

          const start = windowHeight;
          const end = -elementHeight;
          const current = elementTop;

          const rawProgress = (start - current) / (start - end);
          setProgress(Math.max(0, Math.min(1, rawProgress)));
        } else {
          // Use document scroll progress
          const scrollTop = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          setProgress(docHeight > 0 ? scrollTop / docHeight : 0);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target]);

  return progress;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create animation variants with custom parameters
 */
export function createScrollVariants(
  type: ScrollAnimationType,
  customTransition?: Partial<Transition>
): Variants {
  const base = scrollAnimationVariants[type];
  return {
    hidden: base.hidden,
    visible: {
      ...base.visible,
      transition: {
        ...BASE_TRANSITION,
        ...(base.visible as { transition?: Transition }).transition,
        ...customTransition,
      },
    },
  };
}

/**
 * Combine multiple animation types
 */
export function combineScrollVariants(
  ...types: ScrollAnimationType[]
): Variants {
  const hidden: Record<string, unknown> = { opacity: 0 };
  const visible: Record<string, unknown> = { opacity: 1 };

  types.forEach((type) => {
    const variant = scrollAnimationVariants[type];
    Object.assign(hidden, variant.hidden);
    Object.assign(visible, variant.visible);
  });

  return {
    hidden: hidden as Variants['hidden'],
    visible: {
      ...visible,
      transition: BASE_TRANSITION,
    } as Variants['visible'],
  };
}
