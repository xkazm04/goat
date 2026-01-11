"use client";

import { memo } from "react";
import { gradients } from "./gradients";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export interface FloatingOrbConfig {
  /** Position as percentage (0-100) */
  position: { x: number; y: number };
  /** Size in pixels */
  size: number;
  /** Opacity multiplier (0-1) */
  opacity?: number;
  /** Blur amount in pixels */
  blur?: number;
  /** Animation duration in seconds */
  duration?: number;
  /** Animation delay in seconds */
  delay?: number;
  /** Movement range */
  movement?: { x: number; y: number };
  /** Scale animation range */
  scale?: [number, number];
  /** Use secondary cyan color (rgba(34, 211, 238)) instead of primary (rgba(6, 182, 212)) */
  secondary?: boolean;
}

export interface NeonArenaBackgroundProps {
  /** Whether to use negative z-index (-z-10) for section backgrounds vs inset-0 for full-page */
  asSection?: boolean;
  /** Show center radial glow */
  showCenterGlow?: boolean;
  /** Center glow intensity (0-1), default 0.1 */
  glowIntensity?: number;
  /** Show neon grid pattern */
  showGrid?: boolean;
  /** Grid opacity (0-1), default 0.03 */
  gridOpacity?: number;
  /** Grid size in pixels, default 60 */
  gridSize?: number;
  /** Show animated mesh/aurora overlay */
  showMesh?: boolean;
  /** Show horizontal gradient line accents at top/bottom */
  showLineAccents?: boolean;
  /** Floating orbs configuration */
  orbs?: FloatingOrbConfig[];
  /** Additional className for the container */
  className?: string;
  /** data-testid for testing */
  "data-testid"?: string;
}

// Default orb configurations for common use cases
export const DEFAULT_ORBS: FloatingOrbConfig[] = [
  {
    position: { x: 25, y: 25 },
    size: 600,
    opacity: 0.08,
    blur: 60,
    duration: 15,
    movement: { x: 100, y: -50 },
    scale: [1, 1.2],
  },
  {
    position: { x: 75, y: 75 },
    size: 500,
    opacity: 0.06,
    blur: 50,
    duration: 12,
    delay: 2,
    movement: { x: -80, y: 80 },
    scale: [1.1, 0.9],
    secondary: true,
  },
  {
    position: { x: 67, y: 50 },
    size: 400,
    opacity: 0.05,
    blur: 40,
    duration: 10,
    delay: 4,
    movement: { x: 60, y: -40 },
  },
];

export const SECTION_ORBS: FloatingOrbConfig[] = [
  {
    position: { x: 25, y: 10 },
    size: 384, // w-96
    opacity: 0.08,
    blur: 60,
    duration: 12,
    movement: { x: 30, y: -20 },
  },
  {
    position: { x: 75, y: 90 },
    size: 320, // w-80
    opacity: 0.06,
    blur: 50,
    duration: 10,
    delay: 3,
    movement: { x: -20, y: 30 },
    secondary: true,
  },
];

export const MINIMAL_ORBS: FloatingOrbConfig[] = [
  {
    position: { x: 33, y: 33 },
    size: 288, // w-72
    opacity: 0.06,
    blur: 50,
    duration: 15,
    movement: { x: -30, y: 20 },
  },
];

/**
 * CSS-animated floating orb - uses GPU-accelerated CSS animations
 * instead of JS-driven Framer Motion for better performance
 */
const FloatingOrb = memo(function FloatingOrb({ config, prefersReducedMotion }: { config: FloatingOrbConfig; prefersReducedMotion: boolean }) {
  const {
    position,
    size,
    opacity = 0.08,
    blur = 60,
    duration = 15,
    delay = 0,
    movement = { x: 0, y: 0 },
    scale,
    secondary = false,
  } = config;

  const color = secondary ? "34, 211, 238" : "6, 182, 212";
  const scaleValue = scale ? scale[1] : 1.05;

  // Use CSS custom properties for animation parameters
  const cssVars = {
    "--float-x": `${movement.x}px`,
    "--float-y": `${movement.y}px`,
    "--float-scale": scaleValue,
    "--float-duration": `${duration}s`,
    "--float-delay": `${delay}s`,
  } as React.CSSProperties;

  return (
    <div
      className={prefersReducedMotion ? "" : "animate-ambient-float"}
      style={{
        ...cssVars,
        position: "absolute",
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: size,
        height: size,
        transform: "translate(-50%, -50%)",
        background: `radial-gradient(circle, rgba(${color}, ${opacity}) 0%, transparent 60%)`,
        filter: `blur(${blur}px)`,
        borderRadius: "9999px",
        pointerEvents: "none",
      }}
      data-framer-motion-reducible="true"
    />
  );
});

export const NeonArenaBackground = memo(function NeonArenaBackground({
  asSection = false,
  showCenterGlow = true,
  glowIntensity = 0.1,
  showGrid = true,
  gridOpacity = 0.03,
  gridSize = 60,
  showMesh = false,
  showLineAccents = false,
  orbs = [],
  className = "",
  "data-testid": testId,
}: NeonArenaBackgroundProps) {
  const prefersReducedMotion = useReducedMotion();
  const baseClass = asSection ? "absolute inset-0 -z-10" : "absolute inset-0";
  const pointerClass = "pointer-events-none";

  return (
    <div className={className} data-testid={testId}>
      {/* Base dark background - #050505 */}
      <div className={`${baseClass} bg-[#050505]`} />

      {/* Center radial glow - cyan accent */}
      {showCenterGlow && (
        <div
          className={`${baseClass} ${pointerClass}`}
          style={{
            background: `radial-gradient(circle at center, rgba(6, 182, 212, ${glowIntensity}) 0%, transparent 50%)`,
          }}
        />
      )}

      {/* Neon grid pattern */}
      {showGrid && (
        <div
          className={`${baseClass} ${pointerClass}`}
          style={{
            opacity: gridOpacity,
            backgroundImage: gradients.neonGrid,
            backgroundSize: `${gridSize}px ${gridSize}px`,
          }}
        />
      )}

      {/* Aurora/mesh gradient overlay for depth - now uses CSS animation */}
      {showMesh && (
        <div
          className={`${baseClass} ${pointerClass} ${prefersReducedMotion ? "" : "animate-ambient-mesh"}`}
          style={{ background: gradients.mesh }}
          data-framer-motion-reducible="true"
        />
      )}

      {/* Gradient line accents */}
      {showLineAccents && (
        <>
          <div
            className={`absolute top-0 left-0 right-0 h-px ${pointerClass}`}
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.3), rgba(34, 211, 238, 0.2), transparent)",
            }}
          />
          <div
            className={`absolute bottom-0 left-0 right-0 h-px ${pointerClass}`}
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.2), rgba(6, 182, 212, 0.15), transparent)",
            }}
          />
        </>
      )}

      {/* CSS-animated floating orbs - GPU accelerated */}
      {orbs.map((orbConfig, index) => (
        <FloatingOrb key={index} config={orbConfig} prefersReducedMotion={prefersReducedMotion} />
      ))}
    </div>
  );
});
