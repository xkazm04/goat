"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DURATION } from '@/lib/animations/motion-presets';

export interface MagneticGlowAuraProps {
  /** Whether the aura should be visible */
  isActive: boolean;
  /** Magnetic strength (0 to 1) - controls intensity */
  strength: number;
  /** Glow color in rgb format (default: cyan) */
  color?: string;
  /** Additional class names */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * MagneticGlowAura
 * A reusable proximity-based glow effect that intensifies as cursor gets closer.
 * Used for magnetic snap visual feedback on drop zones.
 */
export const MagneticGlowAura = memo(function MagneticGlowAura({
  isActive,
  strength,
  color = "22, 211, 238", // brand-hover RGB values
  className = "",
  testId,
}: MagneticGlowAuraProps) {
  return (
    <AnimatePresence>
      {isActive && strength > 0 && (
        <motion.div
          className={`absolute -inset-[4px] rounded-card pointer-events-none z-drag ${className}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{
            opacity: strength,
            scale: 1 + strength * 0.05,
          }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{
            duration: DURATION.quick,
            ease: "easeOut",
          }}
          style={{
            boxShadow: `
              0 0 ${15 + strength * 25}px rgba(${color}, ${0.3 + strength * 0.3}),
              0 0 ${30 + strength * 40}px rgba(${color}, ${0.2 + strength * 0.2}),
              inset 0 0 ${10 + strength * 15}px rgba(${color}, ${0.1 + strength * 0.15})
            `,
            border: `2px solid rgba(${color}, ${0.4 + strength * 0.4})`,
          }}
          data-testid={testId}
        />
      )}
    </AnimatePresence>
  );
});

export interface ValidDropIndicatorProps {
  /** Whether to show the indicator */
  isActive: boolean;
  /** Additional class names */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * ValidDropIndicator
 * Static cyan glow indicator for valid drop zones during drag operations.
 * Shows a more subtle, non-animated glow compared to MagneticGlowAura.
 */
export const ValidDropIndicator = memo(function ValidDropIndicator({
  isActive,
  className = "",
  testId,
}: ValidDropIndicatorProps) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className={`absolute -inset-[2px] rounded-card pointer-events-none z-sticky ${className}`}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 0.7, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: DURATION.fast, ease: "easeOut" }}
          style={{
            border: '2px solid rgb(34, 211, 238)', // brand-hover
            boxShadow: `
              0 0 15px rgba(6, 182, 212, 0.4),
              0 0 30px rgba(6, 182, 212, 0.2),
              inset 0 0 10px rgba(6, 182, 212, 0.1)
            `,
          }}
          data-testid={testId}
        />
      )}
    </AnimatePresence>
  );
});

export interface SnapConfirmationGlowProps {
  /** Whether the glow should be visible */
  isActive: boolean;
  /** Accent color for the glow */
  accentColor: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * SnapConfirmationGlow
 * A brief flash/glow effect shown when an item is dropped into position.
 * Provides satisfying visual feedback for successful drops.
 */
export const SnapConfirmationGlow = memo(function SnapConfirmationGlow({
  isActive,
  accentColor,
  testId,
}: SnapConfirmationGlowProps) {
  if (!isActive) return null;

  return (
    <motion.div
      className="absolute -inset-[4px] rounded-card pointer-events-none z-drag"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: [0, 1, 0.7, 0],
        scale: [0.9, 1.1, 1.05, 1],
      }}
      transition={{
        duration: DURATION.emphasis,
        ease: "easeOut",
      }}
      style={{
        boxShadow: `0 0 30px 8px ${accentColor}, inset 0 0 20px ${accentColor}`,
        border: `2px solid ${accentColor}`,
      }}
      data-testid={testId}
    />
  );
});

export default MagneticGlowAura;
