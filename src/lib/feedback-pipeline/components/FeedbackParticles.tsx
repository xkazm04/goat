'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { ParticleConfig } from '../types';
import { cn } from '@/lib/utils';
import { useMotionCapabilities } from '@/hooks/use-motion-preference';

interface FeedbackParticlesProps {
  /** Array of particles to render */
  particles: ParticleConfig[];
  /** Particle style variant */
  variant?: 'sparkle' | 'dot' | 'confetti';
  /** Whether particles converge to center */
  converge?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** If true, particles show in reduced tier as essential feedback */
  isEssentialFeedback?: boolean;
}

/**
 * Renders animated particles for visual feedback effects.
 * Used for drag sparkles, success celebrations, and processing animations.
 *
 * Respects 3-tier motion preference:
 * - Full: All particles
 * - Reduced: Only essential feedback particles (when isEssentialFeedback=true)
 * - Minimal: No particles
 */
export function FeedbackParticles({
  particles,
  variant = 'sparkle',
  converge = false,
  className,
  isEssentialFeedback = false,
}: FeedbackParticlesProps) {
  const { allowCelebrations, allowFeedback } = useMotionCapabilities();

  // Minimal tier: no particles
  if (!allowFeedback) return null;

  // Reduced tier: only show if marked as essential feedback
  if (!allowCelebrations && !isEssentialFeedback) return null;

  if (particles.length === 0) return null;

  return (
    <div
      className={cn('fixed inset-0 z-[99] pointer-events-none', className)}
      data-testid="feedback-particles"
    >
      <AnimatePresence>
        {particles.map((particle) => {
          const duration = particle.duration || 0.3;
          const size = particle.size || 12;

          return (
            <motion.div
              key={particle.id}
              initial={{
                opacity: 1,
                scale: 1,
                x: particle.x,
                y: particle.y,
              }}
              animate={
                converge
                  ? {
                      x: '50%',
                      y: '50%',
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0],
                    }
                  : {
                      opacity: 0,
                      scale: 0,
                      x: particle.x + (Math.random() - 0.5) * 20,
                      y: particle.y + (Math.random() - 0.5) * 20,
                    }
              }
              exit={{ opacity: 0 }}
              transition={{ duration, ease: 'easeOut' }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: 0, top: 0 }}
            >
              {variant === 'sparkle' && (
                <svg
                  width={size}
                  height={size}
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5L6 0Z"
                    fill={particle.color || 'url(#sparkle-gradient)'}
                  />
                  <defs>
                    <linearGradient
                      id="sparkle-gradient"
                      x1="0"
                      y1="0"
                      x2="12"
                      y2="12"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
              )}

              {variant === 'dot' && (
                <div
                  className="rounded-full"
                  style={{
                    width: size,
                    height: size,
                    backgroundColor: particle.color || '#3b82f6',
                  }}
                />
              )}

              {variant === 'confetti' && (
                <div
                  className="rounded-sm"
                  style={{
                    width: size * 0.4,
                    height: size,
                    backgroundColor:
                      particle.color ||
                      ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'][
                        Math.floor(Math.random() * 5)
                      ],
                    transform: `rotate(${Math.random() * 360}deg)`,
                  }}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/**
 * Utility function to generate particles.
 */
export function generateParticles(
  count: number = 20,
  options?: {
    xRange?: [number, number];
    yRange?: [number, number];
    sizeRange?: [number, number];
    colors?: string[];
  }
): ParticleConfig[] {
  const {
    xRange = [0, 100],
    yRange = [0, 100],
    sizeRange = [8, 14],
    colors,
  } = options || {};

  return Array.from({ length: count }, (_, i) => ({
    id: Date.now() + i,
    x: xRange[0] + Math.random() * (xRange[1] - xRange[0]),
    y: yRange[0] + Math.random() * (yRange[1] - yRange[0]),
    timestamp: Date.now(),
    size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
    color: colors ? colors[Math.floor(Math.random() * colors.length)] : undefined,
    duration: 0.8 + Math.random() * 0.7,
  }));
}
