/**
 * AnimatedCounter Component
 *
 * Displays numbers with smooth counting animation on mount.
 * Perfect for stats, metrics, and any numeric displays that benefit
 * from visual interest when appearing.
 */

'use client';

import { motion, useSpring, useTransform, useInView } from 'framer-motion';
import { memo, useEffect, useState, useRef } from 'react';

import { DURATION, EASING, prefersReducedMotion } from '@/lib/animations/sharing';

export interface AnimatedCounterProps {
  /** The target value to count to */
  value: number;
  /** Duration of the count animation in seconds */
  duration?: number;
  /** Delay before starting animation in seconds */
  delay?: number;
  /** Format function for displaying the number */
  formatter?: (value: number) => string;
  /** Whether to animate only when in view */
  animateOnView?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Prefix text (e.g., "$", "#") */
  prefix?: string;
  /** Suffix text (e.g., "%", "k", "+") */
  suffix?: string;
}

/**
 * Default number formatter - adds thousand separators
 */
function defaultFormatter(value: number): string {
  return Math.round(value).toLocaleString();
}

/**
 * AnimatedCounter - Counts up to a number with smooth animation
 *
 * @example
 * ```tsx
 * // Basic usage
 * <AnimatedCounter value={1234} />
 *
 * // With formatting
 * <AnimatedCounter
 *   value={99.5}
 *   suffix="%"
 *   formatter={(v) => v.toFixed(1)}
 * />
 *
 * // Animate only when scrolled into view
 * <AnimatedCounter value={5000} animateOnView />
 * ```
 */
export const AnimatedCounter = memo(function AnimatedCounter({
  value,
  duration = DURATION.slow,
  delay = 0,
  formatter = defaultFormatter,
  animateOnView = true,
  className = '',
  prefix = '',
  suffix = '',
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [hasAnimated, setHasAnimated] = useState(false);

  // Check for reduced motion preference
  const reducedMotion = prefersReducedMotion();

  // Spring animation for smooth counting
  const spring = useSpring(0, {
    duration: duration * 1000,
    bounce: 0,
  });

  // Transform spring value for display
  const display = useTransform(spring, (current) => formatter(current));

  // Track displayed value for non-motion version
  const [displayValue, setDisplayValue] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }

    const shouldAnimate = animateOnView ? isInView : true;

    if (shouldAnimate && !hasAnimated) {
      const timeoutId = setTimeout(() => {
        spring.set(value);
        setHasAnimated(true);
      }, delay * 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [value, isInView, animateOnView, hasAnimated, delay, spring, reducedMotion]);

  // Subscribe to spring changes for display
  useEffect(() => {
    if (reducedMotion) return;

    const unsubscribe = display.on('change', (latest) => {
      setDisplayValue(parseFloat(latest.replace(/,/g, '')) || 0);
    });

    return unsubscribe;
  }, [display, reducedMotion]);

  if (reducedMotion) {
    return (
      <span ref={ref} className={className}>
        {prefix}{formatter(value)}{suffix}
      </span>
    );
  }

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={
        (animateOnView ? isInView : true)
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: 10 }
      }
      transition={{
        duration: DURATION.normal,
        ease: EASING.easeOut,
        delay,
      }}
    >
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </motion.span>
  );
});

export default AnimatedCounter;
