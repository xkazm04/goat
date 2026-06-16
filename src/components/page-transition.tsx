'use client';

import { motion, AnimatePresence, Variants } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

import { DURATION, EASE } from '@/lib/animations/motion-presets';
import { useMotionPreference } from '@/hooks/use-motion-preference';

const SLIDE_OFFSET = 8;

/**
 * Shared transition configuration for page animations
 * Creates a subtle fade + slide effect that masks load times
 */
const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: SLIDE_OFFSET,
    scale: 0.99,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: DURATION.normal,
      ease: EASE.inOut,
    }
  },
  exit: {
    opacity: 0,
    y: -SLIDE_OFFSET,
    scale: 0.99,
    transition: {
      duration: DURATION.normal,
      ease: EASE.inOut,
    }
  }
};

// Reduced tier: opacity only — drop the translate/scale motion that
// prefers-reduced-motion exists to suppress (WCAG 2.3.3).
const FADE_VARIANTS: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DURATION.normal, ease: EASE.inOut } },
  exit: { opacity: 0, transition: { duration: DURATION.normal, ease: EASE.inOut } },
};

// Minimal tier: no motion at all (instant).
const NO_MOTION_VARIANTS: Variants = {
  initial: { opacity: 1 },
  animate: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 1, transition: { duration: 0 } },
};

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * PageTransition Component
 *
 * Wraps page content with AnimatePresence and motion.div to provide
 * smooth transitions when navigating between routes.
 *
 * Features:
 * - Fade in/out with subtle vertical slide
 * - Subtle scale effect during transitions for polish
 * - Optimized timing to mask perceived load times
 * - Uses pathname as key to trigger transitions on route changes
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  // The app-wide route wrapper must respect the motion tier — it previously ran
  // slide+scale on EVERY navigation regardless of prefers-reduced-motion / the
  // in-app tier (WCAG 2.3.3). SSR-safe (useSyncExternalStore defaults to 'full').
  const { tier } = useMotionPreference();
  const variants =
    tier === 'full' ? pageTransition : tier === 'reduced' ? FADE_VARIANTS : NO_MOTION_VARIANTS;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variants}
        style={{ width: '100%', height: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
