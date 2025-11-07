'use client';

import { motion, AnimatePresence, Variants } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

/**
 * Shared transition configuration for page animations
 * Creates a subtle fade + slide effect that masks load times
 */
const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 8,
    filter: 'blur(4px)'
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1], // Smooth cubic-bezier easing
    }
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: 'blur(4px)',
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1],
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
