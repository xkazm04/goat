'use client';

/**
 * ParallaxSection - Scroll-based depth effects component
 *
 * Creates parallax scrolling effects with configurable speed multipliers
 * for different layers. Supports both vertical and horizontal parallax,
 * fade effects, and respects reduced motion preferences.
 */

import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  type MotionStyle,
  type MotionValue,
} from 'framer-motion';
import {
  createContext,
  forwardRef,
  memo,
  useContext,
  useRef,
  type ReactNode,
} from 'react';

import { useMotionCapabilities } from '@/hooks/use-motion-preference';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface ParallaxSectionProps {
  children: ReactNode;
  /** Scroll offset range (default: ['start end', 'end start']) */
  offset?: ['start end' | 'end start' | 'start start' | 'end end', 'start end' | 'end start' | 'start start' | 'end end'];
  /** Additional motion styles */
  motionStyle?: MotionStyle;
  /** Additional class name */
  className?: string;
}

interface ParallaxLayerProps {
  children: ReactNode;
  /** Vertical speed multiplier (-1 to 1, negative = opposite direction) */
  speedY?: number;
  /** Horizontal speed multiplier (-1 to 1) */
  speedX?: number;
  /** Enable fade in/out based on scroll position */
  enableFade?: boolean;
  /** Fade start opacity (0-1, default: 0) */
  fadeStart?: number;
  /** Fade end opacity (0-1, default: 1) */
  fadeEnd?: number;
  /** Scale multiplier based on scroll (1 = no change) */
  scaleStart?: number;
  /** Scale at end of scroll range */
  scaleEnd?: number;
  /** Rotation at start of scroll range (degrees) */
  rotateStart?: number;
  /** Rotation at end of scroll range (degrees) */
  rotateEnd?: number;
  /** Z-index for layering */
  zIndex?: number;
  /** Spring stiffness for smooth interpolation */
  stiffness?: number;
  /** Spring damping */
  damping?: number;
  /** Additional motion styles */
  motionStyle?: MotionStyle;
  /** Disable effects */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// ParallaxContext - Share scroll progress with layers
// =============================================================================

interface ParallaxContextValue {
  scrollYProgress: MotionValue<number>;
}

const ParallaxContext = createContext<ParallaxContextValue | null>(null);

function useParallaxContext() {
  const context = useContext(ParallaxContext);
  if (!context) {
    throw new Error('ParallaxLayer must be used within ParallaxSection');
  }
  return context;
}

// =============================================================================
// ParallaxLayer - Child component for parallax depth layers
// =============================================================================

export const ParallaxLayer = memo(function ParallaxLayer({
  children,
  speedY = 0,
  speedX = 0,
  enableFade = false,
  fadeStart = 0,
  fadeEnd = 1,
  scaleStart = 1,
  scaleEnd = 1,
  rotateStart = 0,
  rotateEnd = 0,
  zIndex = 0,
  stiffness = 100,
  damping = 30,
  motionStyle,
  disabled = false,
  className,
}: ParallaxLayerProps) {
  const { scrollYProgress } = useParallaxContext();
  const { allowAmbient } = useMotionCapabilities();

  // Disable if motion preferences disallow or explicitly disabled
  const effectsDisabled = disabled || !allowAmbient;

  // Spring configuration for smoother interpolation
  const springConfig = { stiffness, damping };

  // Calculate transform values based on scroll progress
  // speedY: positive = moves slower (stays behind), negative = moves faster
  const yRange = effectsDisabled ? 0 : speedY * 100;
  const xRange = effectsDisabled ? 0 : speedX * 100;

  const y = useSpring(
    useTransform(scrollYProgress, [0, 1], [yRange, -yRange]),
    springConfig
  );

  const x = useSpring(
    useTransform(scrollYProgress, [0, 1], [xRange, -xRange]),
    springConfig
  );

  const opacity = useSpring(
    useTransform(
      scrollYProgress,
      [0, 0.2, 0.8, 1],
      enableFade && !effectsDisabled
        ? [fadeStart, fadeEnd, fadeEnd, fadeStart]
        : [1, 1, 1, 1]
    ),
    springConfig
  );

  const scale = useSpring(
    useTransform(
      scrollYProgress,
      [0, 1],
      effectsDisabled ? [1, 1] : [scaleStart, scaleEnd]
    ),
    springConfig
  );

  const rotate = useSpring(
    useTransform(
      scrollYProgress,
      [0, 1],
      effectsDisabled ? [0, 0] : [rotateStart, rotateEnd]
    ),
    springConfig
  );

  return (
    <motion.div
      className={cn('relative', className)}
      style={{
        y,
        x,
        opacity,
        scale,
        rotate,
        zIndex,
        // Don't force permanent GPU layer promotion when effects are disabled /
        // reduced-motion — the transforms are neutralized, so a hardcoded
        // will-change would keep every layer on the compositor for nothing.
        willChange: effectsDisabled ? 'auto' : 'transform, opacity',
        ...(motionStyle || {}),
      }}
    >
      {children}
    </motion.div>
  );
});

// =============================================================================
// ParallaxSection - Container component
// =============================================================================

export const ParallaxSection = memo(
  forwardRef<HTMLDivElement, ParallaxSectionProps>(function ParallaxSection(
    {
      children,
      offset = ['start end', 'end start'],
      motionStyle,
      className,
    },
    forwardedRef
  ) {
    const containerRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
      target: containerRef,
      offset: offset,
    });

    return (
      <ParallaxContext.Provider value={{ scrollYProgress }}>
        <div
          ref={(node) => {
            // Handle both refs
            (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            if (typeof forwardedRef === 'function') {
              forwardedRef(node);
            } else if (forwardedRef) {
              forwardedRef.current = node;
            }
          }}
          className={cn('relative', className)}
        >
          <motion.div style={motionStyle}>{children}</motion.div>
        </div>
      </ParallaxContext.Provider>
    );
  })
);
