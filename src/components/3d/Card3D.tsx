'use client';

/**
 * Card3D - Reusable 3D tilt-reactive card component
 *
 * Provides immersive 3D tilt effects with configurable intensity,
 * depth layers, glare effects, and smooth spring animations.
 * Respects reduced motion preferences.
 */

import {
  memo,
  useRef,
  useCallback,
  forwardRef,
  type ReactNode,
  type HTMLAttributes,
} from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionStyle,
} from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMotionCapabilities } from '@/hooks/use-motion-preference';

// =============================================================================
// Types
// =============================================================================

export interface Card3DProps {
  children: ReactNode;
  /** Maximum tilt rotation in degrees (default: 15) */
  maxTilt?: number;
  /** Perspective distance in pixels (default: 1000) */
  perspective?: number;
  /** Scale factor on hover (default: 1.05) */
  hoverScale?: number;
  /** Enable glare effect (default: true) */
  enableGlare?: boolean;
  /** Glare opacity (0-1, default: 0.2) */
  glareOpacity?: number;
  /** Spring stiffness (default: 400) */
  stiffness?: number;
  /** Spring damping (default: 30) */
  damping?: number;
  /** Z-axis translation on hover in pixels (default: 50) */
  hoverZ?: number;
  /** Glare color (default: white) */
  glareColor?: string;
  /** Additional motion style overrides */
  motionStyle?: MotionStyle;
  /** Disable all effects */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

export interface Card3DLayerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Z-axis depth in pixels (positive = towards viewer) */
  depth?: number;
}

// =============================================================================
// Card3DLayer - Child component for depth layers
// =============================================================================

export const Card3DLayer = memo(function Card3DLayer({
  children,
  depth = 0,
  className,
  style,
  ...props
}: Card3DLayerProps) {
  return (
    <div
      className={cn('relative', className)}
      style={{
        transform: `translateZ(${depth}px)`,
        transformStyle: 'preserve-3d',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
});

// =============================================================================
// Main Card3D Component
// =============================================================================

export const Card3D = memo(
  forwardRef<HTMLDivElement, Card3DProps>(function Card3D(
    {
      children,
      maxTilt = 15,
      perspective = 1000,
      hoverScale = 1.05,
      enableGlare = true,
      glareOpacity = 0.2,
      stiffness = 400,
      damping = 30,
      hoverZ = 50,
      glareColor = 'white',
      motionStyle,
      disabled = false,
      className,
    },
    forwardedRef
  ) {
    const cardRef = useRef<HTMLDivElement>(null);
    const { allowInteraction, allowTransitions } = useMotionCapabilities();

    // Disable effects if motion preference disallows or explicitly disabled
    const effectsDisabled = disabled || !allowInteraction;

    // Motion values for mouse position (normalized -1 to 1)
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const isHovering = useMotionValue(0);

    // Spring configuration
    const springConfig = { stiffness, damping, mass: 0.5 };

    // Derived spring values
    const effectiveMaxTilt = effectsDisabled ? 0 : maxTilt;
    const effectiveHoverScale = effectsDisabled ? 1 : hoverScale;
    const effectiveHoverZ = effectsDisabled ? 0 : hoverZ;

    // Tilt rotations with spring
    const rotateX = useSpring(
      useTransform(mouseY, [-1, 1], [effectiveMaxTilt, -effectiveMaxTilt]),
      springConfig
    );
    const rotateY = useSpring(
      useTransform(mouseX, [-1, 1], [-effectiveMaxTilt, effectiveMaxTilt]),
      springConfig
    );

    // Scale on hover with spring
    const scale = useSpring(
      useTransform(isHovering, [0, 1], [1, effectiveHoverScale]),
      springConfig
    );

    // Z translation on hover
    const z = useSpring(
      useTransform(isHovering, [0, 1], [0, effectiveHoverZ]),
      springConfig
    );

    // Glare position (follows mouse)
    const glareX = useTransform(mouseX, [-1, 1], ['0%', '100%']);
    const glareY = useTransform(mouseY, [-1, 1], ['0%', '100%']);
    const glareOpacityValue = useSpring(
      useTransform(isHovering, [0, 1], [0, glareOpacity]),
      springConfig
    );

    // Event handlers
    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (effectsDisabled || !cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const normalizedX = Math.max(
          -1,
          Math.min(1, (e.clientX - centerX) / (rect.width / 2))
        );
        const normalizedY = Math.max(
          -1,
          Math.min(1, (e.clientY - centerY) / (rect.height / 2))
        );

        mouseX.set(normalizedX);
        mouseY.set(normalizedY);
      },
      [effectsDisabled, mouseX, mouseY]
    );

    const handleMouseEnter = useCallback(() => {
      if (!effectsDisabled) {
        isHovering.set(1);
      }
    }, [effectsDisabled, isHovering]);

    const handleMouseLeave = useCallback(() => {
      mouseX.set(0);
      mouseY.set(0);
      isHovering.set(0);
    }, [mouseX, mouseY, isHovering]);

    // Touch handlers for mobile
    const handleTouchMove = useCallback(
      (e: React.TouchEvent<HTMLDivElement>) => {
        if (effectsDisabled || !cardRef.current || e.touches.length === 0) return;

        const touch = e.touches[0];
        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const normalizedX = Math.max(
          -1,
          Math.min(1, (touch.clientX - centerX) / (rect.width / 2))
        );
        const normalizedY = Math.max(
          -1,
          Math.min(1, (touch.clientY - centerY) / (rect.height / 2))
        );

        mouseX.set(normalizedX * 0.5); // Reduce intensity on mobile
        mouseY.set(normalizedY * 0.5);
        isHovering.set(1);
      },
      [effectsDisabled, mouseX, mouseY, isHovering]
    );

    const handleTouchEnd = useCallback(() => {
      mouseX.set(0);
      mouseY.set(0);
      isHovering.set(0);
    }, [mouseX, mouseY, isHovering]);

    return (
      <div
        ref={forwardedRef}
        className={cn('relative', className)}
        style={{ perspective: `${perspective}px` }}
      >
        <motion.div
          ref={cardRef}
          className="relative w-full h-full"
          style={{
            rotateX,
            rotateY,
            scale,
            z,
            transformStyle: 'preserve-3d',
            ...(motionStyle || {}),
          }}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Main content */}
          {children}

          {/* Glare overlay */}
          {enableGlare && !effectsDisabled && (
            <motion.div
              className="absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden"
              style={{
                opacity: glareOpacityValue,
              }}
            >
              <motion.div
                className="absolute w-[200%] h-[200%] rounded-full"
                style={{
                  left: glareX,
                  top: glareY,
                  x: '-50%',
                  y: '-50%',
                  background: `radial-gradient(circle at center, ${glareColor} 0%, transparent 50%)`,
                }}
              />
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  })
);

export default Card3D;
