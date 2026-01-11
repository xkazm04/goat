"use client";

import { useRef, useCallback } from "react";
import { useMotionValue, useSpring, useTransform, MotionValue } from "framer-motion";

interface Use3DTiltOptions {
  /** Maximum rotation in degrees (default: 10) */
  maxRotation?: number;
  /** Spring stiffness (default: 300) */
  stiffness?: number;
  /** Spring damping (default: 30) */
  damping?: number;
  /** Perspective distance in pixels (default: 1000) */
  perspective?: number;
  /** Scale on hover (default: 1.02) */
  scale?: number;
  /** Disable the tilt effect entirely (default: false) */
  disabled?: boolean;
}

interface Use3DTiltReturn {
  /** Ref to attach to the tiltable element */
  ref: React.RefObject<HTMLDivElement | null>;
  /** Style object to apply to the motion element */
  style: {
    rotateX: MotionValue<number>;
    rotateY: MotionValue<number>;
    scale: MotionValue<number>;
    transformPerspective: number;
    transformStyle: "preserve-3d";
  };
  /** Event handlers to attach to the element */
  handlers: {
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
  };
}

/**
 * Hook for creating a subtle 3D tilt and parallax effect on hover/focus.
 * Uses framer-motion spring animations for smooth, natural transitions.
 */
export function use3DTilt(options: Use3DTiltOptions = {}): Use3DTiltReturn {
  const {
    maxRotation = 10,
    stiffness = 300,
    damping = 30,
    perspective = 1000,
    scale: hoverScale = 1.02,
    disabled = false,
  } = options;

  const ref = useRef<HTMLDivElement>(null);

  // Raw motion values for mouse position (normalized -1 to 1)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const isHovered = useMotionValue(0);

  // When disabled, use 0 rotation and scale of 1
  const effectiveMaxRotation = disabled ? 0 : maxRotation;
  const effectiveHoverScale = disabled ? 1 : hoverScale;

  // Spring configuration for smooth micro-ease transitions
  const springConfig = { stiffness, damping, mass: 0.5 };

  // Spring-animated rotation values (use effective values that respect disabled state)
  const rotateX = useSpring(
    useTransform(mouseY, [-1, 1], [effectiveMaxRotation, -effectiveMaxRotation]),
    springConfig
  );
  const rotateY = useSpring(
    useTransform(mouseX, [-1, 1], [-effectiveMaxRotation, effectiveMaxRotation]),
    springConfig
  );

  // Scale animation with spring (use effective scale that respects disabled state)
  const scale = useSpring(
    useTransform(isHovered, [0, 1], [1, effectiveHoverScale]),
    springConfig
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Normalize mouse position to -1 to 1 range
      const normalizedX = (e.clientX - centerX) / (rect.width / 2);
      const normalizedY = (e.clientY - centerY) / (rect.height / 2);

      // Clamp values to prevent extreme rotations
      mouseX.set(Math.max(-1, Math.min(1, normalizedX)));
      mouseY.set(Math.max(-1, Math.min(1, normalizedY)));
      isHovered.set(1);
    },
    [mouseX, mouseY, isHovered]
  );

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
    isHovered.set(0);
  }, [mouseX, mouseY, isHovered]);

  const handleFocus = useCallback(() => {
    // Subtle tilt on focus for keyboard accessibility
    mouseX.set(0.3);
    mouseY.set(-0.2);
    isHovered.set(1);
  }, [mouseX, mouseY, isHovered]);

  const handleBlur = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
    isHovered.set(0);
  }, [mouseX, mouseY, isHovered]);

  return {
    ref,
    style: {
      rotateX,
      rotateY,
      scale,
      transformPerspective: perspective,
      transformStyle: "preserve-3d" as const,
    },
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
  };
}
