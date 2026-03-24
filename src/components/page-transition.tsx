'use client';

import { motion, AnimatePresence, Variants } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

import { DURATION, EASE } from '@/lib/animations/motion-presets';

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
