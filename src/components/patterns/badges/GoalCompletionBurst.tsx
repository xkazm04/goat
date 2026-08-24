'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { memo, useMemo, useEffect, useState } from 'react';

import { useMotionCapabilities } from '@/hooks/use-motion-preference';
import { DURATION, EASE } from '@/lib/animations/motion-presets';

// =============================================================================
// Types
// =============================================================================

interface Particle {
  id: number;
  /** Angle in radians */
  angle: number;
  /** Distance from center */
  distance: number;
  /** Particle size in px */
  size: number;
  /** Animation delay in seconds */
  delay: number;
  /** Color */
  color: string;
}

export interface GoalCompletionBurstProps {
  /** Whether the burst should fire */
  active: boolean;
  /** Size of the container (matches progress ring) */
  containerSize?: number;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// Particle generator
// =============================================================================

const PARTICLE_COLORS = [
  '#34d399', // emerald-400
  '#6ee7b7', // emerald-300
  '#a7f3d0', // emerald-200
  '#fbbf24', // amber-400
  '#ffffff',
];

function generateBurstParticles(count: number = 12): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    particles.push({
      id: i,
      angle,
      distance: 28 + Math.random() * 20,
      size: 2 + Math.random() * 3,
      delay: i * 0.025,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    });
  }
  return particles;
}

// =============================================================================
// Sub-components
// =============================================================================

function BurstParticle({ particle }: { particle: Particle }) {
  const x = Math.cos(particle.angle) * particle.distance;
  const y = Math.sin(particle.angle) * particle.distance;

  return (
    <motion.div
      initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
      animate={{
        x,
        y,
        scale: [0, 1.5, 0],
        opacity: [0, 1, 0],
      }}
      transition={{
        duration: DURATION.emphasis,
        delay: particle.delay,
        ease: 'easeOut',
      }}
      className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
      style={{
        width: particle.size,
        height: particle.size,
        backgroundColor: particle.color,
        boxShadow: `0 0 ${particle.size * 3}px ${particle.color}`,
        transform: 'translate(-50%, -50%)',
      }}
    />
  );
}

function BurstRing({ delay = 0, size }: { delay?: number; size: number }) {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: [0.6, 1.4, 1.6], opacity: [0, 0.7, 0] }}
      transition={{ duration: DURATION.emphasis, delay, ease: 'easeOut' }}
      className="absolute pointer-events-none rounded-full"
      style={{
        width: size,
        height: size,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        border: '2px solid rgba(52, 211, 153, 0.6)',
        boxShadow: '0 0 16px rgba(52, 211, 153, 0.3)',
      }}
    />
  );
}

// =============================================================================
// GoalCompletionBurst
// =============================================================================

export const GoalCompletionBurst = memo(function GoalCompletionBurst({
  active,
  containerSize = 44,
  className,
}: GoalCompletionBurstProps) {
  const { allowCelebrations, allowFeedback } = useMotionCapabilities();
  const [show, setShow] = useState(false);
  const particles = useMemo(() => generateBurstParticles(12), []);

  useEffect(() => {
    if (active) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [active]);

  // Minimal tier: nothing
  if (!allowFeedback) return null;

  // Reduced tier: single ring only
  if (!allowCelebrations) {
    return (
      <AnimatePresence>
        {show && (
          <div
            className={className}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
            data-testid="goal-completion-burst-reduced"
          >
            <BurstRing size={containerSize + 8} />
          </div>
        )}
      </AnimatePresence>
    );
  }

  // Full tier: particles + rings + center flash
  return (
    <AnimatePresence>
      {show && (
        <div
          className={className}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
          data-testid="goal-completion-burst"
        >
          {/* Expanding rings */}
          <BurstRing size={containerSize + 8} delay={0} />
          <BurstRing size={containerSize + 16} delay={0.1} />

          {/* Particle burst */}
          {particles.map((particle) => (
            <BurstParticle key={particle.id} particle={particle} />
          ))}

          {/* Center flash */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 0], opacity: [0, 0.5, 0] }}
            transition={{ duration: DURATION.slow, ease: EASE.out }}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: containerSize,
              height: containerSize,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(52,211,153,0.4) 0%, transparent 70%)',
            }}
            data-testid="goal-burst-flash"
          />
        </div>
      )}
    </AnimatePresence>
  );
});

export default GoalCompletionBurst;
