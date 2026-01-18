"use client";

import { memo, ReactNode } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { NavigationAnimatorProps } from "./types";

/**
 * Animation variants for navigation transitions
 */
const slideVariants: Record<string, Variants> = {
  forward: {
    initial: { x: "100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
  },
  backward: {
    initial: { x: "-100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
  },
  none: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
};

/**
 * Fade variants for subtler transitions
 */
const fadeVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

/**
 * Scale variants for zoom effect
 */
const scaleVariants: Record<string, Variants> = {
  forward: {
    initial: { scale: 0.9, opacity: 0, filter: "blur(4px)" },
    animate: { scale: 1, opacity: 1, filter: "blur(0px)" },
    exit: { scale: 1.1, opacity: 0, filter: "blur(4px)" },
  },
  backward: {
    initial: { scale: 1.1, opacity: 0, filter: "blur(4px)" },
    animate: { scale: 1, opacity: 1, filter: "blur(0px)" },
    exit: { scale: 0.9, opacity: 0, filter: "blur(4px)" },
  },
  none: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
};

/**
 * Navigation Animator Component
 * Handles smooth transitions between navigation levels
 */
export const NavigationAnimator = memo(function NavigationAnimator({
  children,
  direction,
  isAnimating,
}: NavigationAnimatorProps) {
  const variants = scaleVariants[direction] || scaleVariants.none;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={direction + Date.now()}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          mass: 0.8,
        }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
});

/**
 * Slide Navigator for horizontal slide animations
 */
export const SlideNavigator = memo(function SlideNavigator({
  children,
  direction,
  navigationKey,
}: {
  children: ReactNode;
  direction: "forward" | "backward" | "none";
  navigationKey: string;
}) {
  const variants = slideVariants[direction] || slideVariants.none;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={navigationKey}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 35,
        }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
});

/**
 * Fade Navigator for subtle fade transitions
 */
export const FadeNavigator = memo(function FadeNavigator({
  children,
  navigationKey,
}: {
  children: ReactNode;
  navigationKey: string;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={navigationKey}
        variants={fadeVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration: 0.2,
          ease: "easeOut",
        }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
});

/**
 * Stagger container for grid animations
 */
export const StaggerContainer = memo(function StaggerContainer({
  children,
  className = "",
  staggerDelay = 0.05,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
});

/**
 * Stagger item for use within StaggerContainer
 */
export const StaggerItem = memo(function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            type: "spring",
            stiffness: 300,
            damping: 24,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
});

/**
 * Hook for tracking navigation direction
 */
export function useNavigationDirection() {
  let previousDepth = 0;

  return (currentDepth: number): "forward" | "backward" | "none" => {
    const direction =
      currentDepth > previousDepth
        ? "forward"
        : currentDepth < previousDepth
        ? "backward"
        : "none";

    previousDepth = currentDepth;
    return direction;
  };
}

export default NavigationAnimator;
