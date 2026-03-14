"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { useMotionCapabilities } from "@/hooks/use-motion-preference";
import {
  generateConfettiParticles,
  generateSparkles,
  ConfettiParticleComponent,
  SparkleParticleComponent,
  GlowPulseRing,
} from "./celebrationParticles";

interface DropCelebrationProps {
  isActive: boolean;
  isPodium: boolean;
  rankColor: string;
  position: number;
}

/**
 * DropCelebration - Celebratory microanimations for successful drops
 *
 * Respects 3-tier motion preference:
 * - Full: All effects (confetti, sparkles, rings, flash)
 * - Reduced: Essential feedback only (single glow ring)
 * - Minimal: No celebratory effects
 */
export function DropCelebration({ isActive, isPodium, rankColor, position }: DropCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const { allowCelebrations, allowFeedback } = useMotionCapabilities();

  const confettiParticles = useMemo(
    () => isPodium ? generateConfettiParticles(rankColor, position) : [],
    [isPodium, rankColor, position]
  );

  const sparkles = useMemo(() => generateSparkles(), []);

  useEffect(() => {
    if (isActive && isPodium && allowCelebrations) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [isActive, isPodium, allowCelebrations]);

  if (!allowFeedback) return null;

  // Reduced tier: single glow ring only
  if (!allowCelebrations) {
    return (
      <AnimatePresence>
        {isActive && (
          <div className="absolute inset-0 pointer-events-none z-50 overflow-visible" data-testid="drop-celebration-reduced">
            <GlowPulseRing color={rankColor} delay={0} />
          </div>
        )}
      </AnimatePresence>
    );
  }

  // Full tier: all effects
  return (
    <AnimatePresence>
      {isActive && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-visible" data-testid="drop-celebration">
          {/* Multiple Glow Pulse Rings */}
          <GlowPulseRing color={rankColor} delay={0} />
          <GlowPulseRing color={rankColor} delay={0.1} />
          <GlowPulseRing color={rankColor} delay={0.2} />

          {/* Sparkle Particles */}
          {sparkles.map((sparkle) => (
            <SparkleParticleComponent key={sparkle.id} sparkle={sparkle} color={rankColor} />
          ))}

          {/* Center flash */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 0], opacity: [0, 0.6, 0] }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{ background: `radial-gradient(circle, ${rankColor}40 0%, transparent 70%)` }}
            data-testid="center-flash"
          />

          {/* Confetti for Podium */}
          {isPodium && showConfetti && (
            <div className="absolute inset-0 overflow-visible" data-testid="confetti-container">
              {confettiParticles.map((particle) => (
                <ConfettiParticleComponent key={particle.id} particle={particle} />
              ))}
            </div>
          )}

          {/* Success checkmark flash */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            data-testid="success-flash"
          >
            <motion.svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <motion.circle
                cx="20" cy="20" r="18"
                stroke={rankColor} strokeWidth="2" fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: [0, 0.8, 0] }}
                transition={{ duration: 0.4, delay: 0.1 }}
              />
            </motion.svg>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default DropCelebration;
