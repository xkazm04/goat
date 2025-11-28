'use client';

import { motion, AnimatePresence, Variants } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

// Shared animation constants
const SMOOTH_EASING = [0.25, 0.1, 0.25, 1] as const;
const SLIDE_OFFSET = 8;
const BLUR_AMOUNT = '4px';
const ENTER_DURATION = 0.4;
const EXIT_DURATION = 0.3;

/**
 * Shared transition configuration for page animations
 * Creates a subtle fade + slide effect that masks load times
 */
const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: SLIDE_OFFSET,
    filter: `blur(${BLUR_AMOUNT})`
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: ENTER_DURATION,
      ease: SMOOTH_EASING,
    }
  },
  exit: {
    opacity: 0,
    y: -SLIDE_OFFSET,
    filter: `blur(${BLUR_AMOUNT})`,
    transition: {
      duration: EXIT_DURATION,
      ease: SMOOTH_EASING,
    }
  }
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
 * - Blur effect during transitions for polish
 * - Optimized timing to mask perceived load times
 * - Uses pathname as key to trigger transitions on route changes
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageTransition}
        style={{ width: '100%', height: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
