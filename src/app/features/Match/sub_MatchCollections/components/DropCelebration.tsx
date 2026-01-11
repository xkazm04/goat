"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { useMotionCapabilities } from "@/hooks/use-motion-preference";

interface DropCelebrationProps {
  isActive: boolean;
  isPodium: boolean;
  rankColor: string;
  position: number;
}

/**
 * Confetti particle configuration
 */
interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  delay: number;
  duration: number;
  shape: 'circle' | 'square' | 'star';
}

/**
 * Sparkle particle configuration
 */
interface SparkleParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

/**
 * Generate confetti particles for podium positions
 */
function generateConfettiParticles(rankColor: string, position: number): ConfettiParticle[] {
  const colors = position === 0
    ? ['#FFD700', '#FFA500', '#FFE55C', '#FFEC8B', '#FFFFFF'] // Gold theme
    : position === 1
    ? ['#C0C0C0', '#E8E8E8', '#A0A0A0', '#FFFFFF', '#D4D4D4'] // Silver theme
    : ['#CD7F32', '#E8A060', '#D4A056', '#FFD700', '#FFFFFF']; // Bronze theme

  const shapes: Array<'circle' | 'square' | 'star'> = ['circle', 'square', 'star'];
  const particles: ConfettiParticle[] = [];

  for (let i = 0; i < 20; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100 - 50, // -50 to 50
      y: Math.random() * -100 - 20, // -120 to -20 (upward burst)
      rotation: Math.random() * 360,
      scale: 0.3 + Math.random() * 0.7,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.15,
      duration: 0.8 + Math.random() * 0.4,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    });
  }

  return particles;
}

/**
 * Generate sparkle particles
 */
function generateSparkles(): SparkleParticle[] {
  const sparkles: SparkleParticle[] = [];

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const distance = 40 + Math.random() * 30;
    sparkles.push({
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      size: 3 + Math.random() * 4,
      delay: i * 0.03,
      duration: 0.4 + Math.random() * 0.2,
    });
  }

  return sparkles;
}

/**
 * Confetti particle component
 */
function ConfettiParticle({ particle }: { particle: ConfettiParticle }) {
  const ShapeComponent = () => {
    switch (particle.shape) {
      case 'circle':
        return (
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: particle.color }}
          />
        );
      case 'square':
        return (
          <div
            className="w-2 h-2"
            style={{ backgroundColor: particle.color }}
          />
        );
      case 'star':
        return (
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill={particle.color}>
            <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
          </svg>
        );
    }
  };

  return (
    <motion.div
      initial={{
        x: 0,
        y: 0,
        scale: 0,
        rotate: 0,
        opacity: 1
      }}
      animate={{
        x: particle.x,
        y: particle.y,
        scale: [0, particle.scale, particle.scale * 0.5, 0],
        rotate: particle.rotation,
        opacity: [1, 1, 0.5, 0]
      }}
      transition={{
        duration: particle.duration,
        delay: particle.delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="absolute left-1/2 top-1/2 pointer-events-none"
      style={{
        transform: 'translate(-50%, -50%)'
      }}
    >
      <ShapeComponent />
    </motion.div>
  );
}

/**
 * Sparkle particle component
 */
function SparkleParticle({ sparkle, color }: { sparkle: SparkleParticle; color: string }) {
  return (
    <motion.div
      initial={{
        x: 0,
        y: 0,
        scale: 0,
        opacity: 0
      }}
      animate={{
        x: sparkle.x,
        y: sparkle.y,
        scale: [0, 1.5, 0],
        opacity: [0, 1, 0]
      }}
      transition={{
        duration: sparkle.duration,
        delay: sparkle.delay,
        ease: "easeOut",
      }}
      className="absolute left-1/2 top-1/2 pointer-events-none"
      style={{
        width: sparkle.size,
        height: sparkle.size,
        backgroundColor: color,
        borderRadius: '50%',
        boxShadow: `0 0 ${sparkle.size * 2}px ${color}`,
        transform: 'translate(-50%, -50%)'
      }}
    />
  );
}

/**
 * Glow pulse ring component
 */
function GlowPulseRing({ color, delay = 0 }: { color: string; delay?: number }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{
        scale: [0.8, 1.3, 1.5],
        opacity: [0, 0.8, 0]
      }}
      transition={{
        duration: 0.6,
        delay,
        ease: "easeOut",
      }}
      className="absolute -inset-2 rounded-xl pointer-events-none"
      style={{
        border: `2px solid ${color}`,
        boxShadow: `0 0 20px ${color}`,
      }}
      data-testid="glow-pulse-ring"
    />
  );
}

/**
 * DropCelebration - Celebratory microanimations for successful drops
 *
 * Features:
 * - Scale bounce animation (handled by parent)
 * - Multiple glow pulse rings that expand outward
 * - Sparkle particles radiating from center
 * - Confetti burst for podium positions (top 3)
 *
 * Respects 3-tier motion preference:
 * - Full: All effects (confetti, sparkles, rings, flash)
 * - Reduced: Essential feedback only (single glow ring, subtle flash)
 * - Minimal: No celebratory effects
 */
export function DropCelebration({ isActive, isPodium, rankColor, position }: DropCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const { allowCelebrations, allowFeedback } = useMotionCapabilities();

  // Memoize particles to prevent regeneration on each render
  const confettiParticles = useMemo(
    () => isPodium ? generateConfettiParticles(rankColor, position) : [],
    [isPodium, rankColor, position]
  );

  const sparkles = useMemo(
    () => generateSparkles(),
    []
  );

  useEffect(() => {
    if (isActive && isPodium && allowCelebrations) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [isActive, isPodium, allowCelebrations]);

  // Minimal tier: no celebration effects at all
  if (!allowFeedback) {
    return null;
  }

  // Reduced tier: show only essential feedback (single glow ring)
  if (!allowCelebrations) {
    return (
      <AnimatePresence>
        {isActive && (
          <div
            className="absolute inset-0 pointer-events-none z-50 overflow-visible"
            data-testid="drop-celebration-reduced"
          >
            {/* Single subtle glow pulse */}
            <GlowPulseRing color={rankColor} delay={0} />
          </div>
        )}
      </AnimatePresence>
    );
  }

  // Full tier: all celebration effects
  return (
    <AnimatePresence>
      {isActive && (
        <div
          className="absolute inset-0 pointer-events-none z-50 overflow-visible"
          data-testid="drop-celebration"
        >
          {/* Multiple Glow Pulse Rings */}
          <GlowPulseRing color={rankColor} delay={0} />
          <GlowPulseRing color={rankColor} delay={0.1} />
          <GlowPulseRing color={rankColor} delay={0.2} />

          {/* Sparkle Particles */}
          {sparkles.map((sparkle) => (
            <SparkleParticle
              key={sparkle.id}
              sparkle={sparkle}
              color={rankColor}
            />
          ))}

          {/* Center flash */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 1.5, 0],
              opacity: [0, 0.6, 0]
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${rankColor}40 0%, transparent 70%)`,
            }}
            data-testid="center-flash"
          />

          {/* Confetti for Podium Positions */}
          {isPodium && showConfetti && (
            <div
              className="absolute inset-0 overflow-visible"
              data-testid="confetti-container"
            >
              {confettiParticles.map((particle) => (
                <ConfettiParticle key={particle.id} particle={particle} />
              ))}
            </div>
          )}

          {/* Success checkmark flash (subtle) */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 1.2, 1],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 0.5,
              delay: 0.1,
              ease: [0.34, 1.56, 0.64, 1]
            }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            data-testid="success-flash"
          >
            <motion.svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <motion.circle
                cx="20"
                cy="20"
                r="18"
                stroke={rankColor}
                strokeWidth="2"
                fill="none"
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
