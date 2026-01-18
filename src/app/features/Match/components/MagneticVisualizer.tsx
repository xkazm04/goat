"use client";

/**
 * MagneticVisualizer
 * Renders magnetic pull lines and intensity indicators during drag
 */

import React, { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MagneticState, MagneticField } from "../lib/magneticPhysics";
import { Point } from "../lib/spatialHash";

/**
 * Props for MagneticVisualizer
 */
interface MagneticVisualizerProps {
  /** Current magnetic state */
  magneticState: MagneticState | null;
  /** Current cursor/drag position */
  cursorPosition: Point;
  /** Whether visualization is enabled */
  enabled?: boolean;
  /** Style variant */
  variant?: "neon" | "subtle" | "minimal";
  /** Whether to show field radius indicators */
  showFieldRadius?: boolean;
  /** Opacity override */
  opacity?: number;
}

/**
 * Props for the pull line component
 */
interface PullLineProps {
  from: Point;
  to: Point;
  strength: number;
  variant: "neon" | "subtle" | "minimal";
}

/**
 * Pull line connecting cursor to field center
 */
const PullLine = memo(function PullLine({
  from,
  to,
  strength,
  variant,
}: PullLineProps) {
  // Calculate line properties
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Style based on variant
  const styles = {
    neon: {
      background: `linear-gradient(90deg,
        rgba(6, 182, 212, ${0.1 + strength * 0.4}) 0%,
        rgba(34, 211, 238, ${0.3 + strength * 0.5}) 50%,
        rgba(6, 182, 212, ${0.1 + strength * 0.4}) 100%)`,
      boxShadow: `0 0 ${8 + strength * 15}px rgba(6, 182, 212, ${0.3 + strength * 0.4})`,
      height: 2 + strength * 2,
    },
    subtle: {
      background: `linear-gradient(90deg,
        rgba(148, 163, 184, ${0.1 + strength * 0.2}) 0%,
        rgba(148, 163, 184, ${0.2 + strength * 0.3}) 50%,
        rgba(148, 163, 184, ${0.1 + strength * 0.2}) 100%)`,
      boxShadow: "none",
      height: 1 + strength,
    },
    minimal: {
      background: `rgba(255, 255, 255, ${0.1 + strength * 0.15})`,
      boxShadow: "none",
      height: 1,
    },
  };

  const style = styles[variant];

  return (
    <motion.div
      className="fixed pointer-events-none z-[100]"
      style={{
        left: from.x,
        top: from.y,
        width: length,
        height: style.height,
        background: style.background,
        boxShadow: style.boxShadow,
        transformOrigin: "0 50%",
        transform: `rotate(${angle}deg)`,
        borderRadius: style.height,
      }}
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{
        opacity: strength * 0.8,
        scaleX: 1,
      }}
      exit={{ opacity: 0, scaleX: 0 }}
      transition={{
        opacity: { duration: 0.15 },
        scaleX: { duration: 0.2, ease: "easeOut" },
      }}
    />
  );
});

/**
 * Intensity indicator at cursor position
 */
const IntensityIndicator = memo(function IntensityIndicator({
  position,
  strength,
  variant,
}: {
  position: Point;
  strength: number;
  variant: "neon" | "subtle" | "minimal";
}) {
  const size = 20 + strength * 30;

  const colors = {
    neon: {
      ring: `rgba(6, 182, 212, ${0.3 + strength * 0.5})`,
      glow: `rgba(34, 211, 238, ${0.2 + strength * 0.4})`,
    },
    subtle: {
      ring: `rgba(148, 163, 184, ${0.2 + strength * 0.3})`,
      glow: `rgba(148, 163, 184, ${0.1 + strength * 0.2})`,
    },
    minimal: {
      ring: `rgba(255, 255, 255, ${0.1 + strength * 0.2})`,
      glow: "transparent",
    },
  };

  const color = colors[variant];

  return (
    <motion.div
      className="fixed pointer-events-none z-[99]"
      style={{
        left: position.x - size / 2,
        top: position.y - size / 2,
        width: size,
        height: size,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: [1, 1.2, 1],
        opacity: strength * 0.7,
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        scale: {
          duration: 0.8,
          repeat: Infinity,
          ease: "easeInOut",
        },
        opacity: { duration: 0.2 },
      }}
    >
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${color.glow} 0%, transparent 70%)`,
        }}
      />
      {/* Ring */}
      <div
        className="absolute inset-2 rounded-full"
        style={{
          border: `2px solid ${color.ring}`,
        }}
      />
    </motion.div>
  );
});

/**
 * Target indicator at field center
 */
const TargetIndicator = memo(function TargetIndicator({
  field,
  isActive,
  variant,
}: {
  field: MagneticField;
  isActive: boolean;
  variant: "neon" | "subtle" | "minimal";
}) {
  const colors = {
    neon: {
      fill: "rgba(34, 211, 238, 0.15)",
      stroke: "rgba(6, 182, 212, 0.6)",
      glow: "0 0 20px rgba(6, 182, 212, 0.4)",
    },
    subtle: {
      fill: "rgba(148, 163, 184, 0.1)",
      stroke: "rgba(148, 163, 184, 0.4)",
      glow: "none",
    },
    minimal: {
      fill: "transparent",
      stroke: "rgba(255, 255, 255, 0.2)",
      glow: "none",
    },
  };

  const color = colors[variant];
  const size = 30;

  return (
    <motion.div
      className="fixed pointer-events-none z-[98]"
      style={{
        left: field.center.x - size / 2,
        top: field.center.y - size / 2,
        width: size,
        height: size,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: isActive ? 1.2 : 1,
        opacity: isActive ? 1 : 0.5,
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {/* Target circle */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: color.fill,
          border: `2px solid ${color.stroke}`,
          boxShadow: color.glow,
        }}
      />
      {/* Crosshair */}
      <div
        className="absolute left-1/2 top-2 bottom-2 w-0.5 -translate-x-1/2"
        style={{ background: color.stroke }}
      />
      <div
        className="absolute top-1/2 left-2 right-2 h-0.5 -translate-y-1/2"
        style={{ background: color.stroke }}
      />
    </motion.div>
  );
});

/**
 * Field radius visualization
 */
const FieldRadius = memo(function FieldRadius({
  field,
  isActive,
}: {
  field: MagneticField;
  isActive: boolean;
}) {
  return (
    <motion.div
      className="fixed pointer-events-none z-[97] rounded-full"
      style={{
        left: field.center.x - field.radius,
        top: field.center.y - field.radius,
        width: field.radius * 2,
        height: field.radius * 2,
        border: `1px dashed rgba(6, 182, 212, ${isActive ? 0.3 : 0.1})`,
      }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: isActive ? 0.6 : 0.3,
      }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.2 }}
    />
  );
});

/**
 * MagneticVisualizer Component
 */
export const MagneticVisualizer = memo(function MagneticVisualizer({
  magneticState,
  cursorPosition,
  enabled = true,
  variant = "neon",
  showFieldRadius = false,
  opacity = 1,
}: MagneticVisualizerProps) {
  // Don't render if disabled or no magnetic state
  if (!enabled || !magneticState?.inField) {
    return null;
  }

  const { activeField, pullStrength, affectedFields } = magneticState;

  return (
    <AnimatePresence>
      {/* Field radius indicators */}
      {showFieldRadius &&
        affectedFields.map((field) => (
          <FieldRadius
            key={`radius-${field.id}`}
            field={field}
            isActive={field.id === activeField?.id}
          />
        ))}

      {/* Target indicators for all affected fields */}
      {affectedFields.map((field) => (
        <TargetIndicator
          key={`target-${field.id}`}
          field={field}
          isActive={field.id === activeField?.id}
          variant={variant}
        />
      ))}

      {/* Pull line to active field */}
      {activeField && pullStrength > 0.1 && (
        <PullLine
          from={cursorPosition}
          to={activeField.center}
          strength={pullStrength}
          variant={variant}
        />
      )}

      {/* Intensity indicator at cursor */}
      {pullStrength > 0.1 && (
        <IntensityIndicator
          position={cursorPosition}
          strength={pullStrength}
          variant={variant}
        />
      )}
    </AnimatePresence>
  );
});

/**
 * Snap preview indicator
 * Shows where item will land if released
 */
export const SnapPreviewIndicator = memo(function SnapPreviewIndicator({
  targetPosition,
  isVisible,
  variant = "neon",
}: {
  targetPosition: Point;
  isVisible: boolean;
  variant?: "neon" | "subtle" | "minimal";
}) {
  if (!isVisible) return null;

  const colors = {
    neon: {
      bg: "rgba(34, 211, 238, 0.2)",
      border: "rgba(6, 182, 212, 0.8)",
      glow: "0 0 30px rgba(6, 182, 212, 0.5)",
    },
    subtle: {
      bg: "rgba(148, 163, 184, 0.15)",
      border: "rgba(148, 163, 184, 0.5)",
      glow: "none",
    },
    minimal: {
      bg: "rgba(255, 255, 255, 0.1)",
      border: "rgba(255, 255, 255, 0.3)",
      glow: "none",
    },
  };

  const color = colors[variant];
  const size = 80;

  return (
    <motion.div
      className="fixed pointer-events-none z-[95]"
      style={{
        left: targetPosition.x - size / 2,
        top: targetPosition.y - size / 2,
        width: size,
        height: size,
      }}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{
        scale: [1, 1.1, 1],
        opacity: 0.8,
      }}
      exit={{ scale: 0.5, opacity: 0 }}
      transition={{
        scale: {
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }}
    >
      <div
        className="absolute inset-0 rounded-xl"
        style={{
          background: color.bg,
          border: `2px solid ${color.border}`,
          boxShadow: color.glow,
        }}
      />
    </motion.div>
  );
});

export default MagneticVisualizer;
