"use client";

/**
 * SwipeableCard Component
 * Mobile-optimized swipeable card with spring physics animations and particle effects
 */

import { useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence, animate } from 'framer-motion';
import { useSwipeGesture } from '@/hooks';
import type { SwipeEvent, SwipeDirection } from '@/hooks';

interface SwipeableCardProps {
  id: string | number;
  children: React.ReactNode;
  onSwipe?: (direction: SwipeDirection, data: SwipeEvent) => void;
  onSwipeLeft?: (data: SwipeEvent) => void;
  onSwipeRight?: (data: SwipeEvent) => void;
  className?: string;
  disabled?: boolean;
  showIndicators?: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  color: string;
}

export function SwipeableCard({
  id,
  children,
  onSwipe,
  onSwipeLeft,
  onSwipeRight,
  className = '',
  disabled = false,
  showIndicators = true,
}: SwipeableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Motion values for smooth animations
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-25, 0, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);

  // Create particle burst effect
  const createParticleBurst = useCallback((swipeDir: 'left' | 'right') => {
    const particleCount = 12;
    const newParticles: Particle[] = [];
    const colors = swipeDir === 'right'
      ? ['#10b981', '#34d399', '#6ee7b7'] // Green for right
      : ['#ef4444', '#f87171', '#fca5a5']; // Red for left

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      newParticles.push({
        id: Date.now() + i,
        x: 0,
        y: 0,
        angle,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    setParticles(newParticles);

    // Clear particles after animation
    setTimeout(() => setParticles([]), 600);
  }, []);

  const handleSwipe = useCallback((swipeData: SwipeEvent) => {
    if (disabled) return;

    const { direction } = swipeData;

    // Only handle horizontal swipes
    if (direction === 'left' || direction === 'right') {
      // Create particle effect
      createParticleBurst(direction);

      // Call appropriate callbacks
      onSwipe?.(direction, swipeData);
      if (direction === 'left') {
        onSwipeLeft?.(swipeData);
      } else if (direction === 'right') {
        onSwipeRight?.(swipeData);
      }

      // Animate card off screen with spring physics
      const targetX = direction === 'right' ? 400 : -400;
      animate(x, targetX, { duration: 0.3, ease: [0.32, 0.72, 0, 1] });

      // Reset after animation
      setTimeout(() => {
        x.set(0);
        y.set(0);
        setIsSwiping(false);
        setSwipeDirection(null);
      }, 350);
    }
  }, [disabled, onSwipe, onSwipeLeft, onSwipeRight, createParticleBurst, x, y]);

  const handleSwipeMove = useCallback((e: TouchEvent, progress: number) => {
    if (disabled) return;

    const touch = e.touches[0];
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const deltaX = touch.clientX - (rect.left + rect.width / 2);
    const deltaY = touch.clientY - (rect.top + rect.height / 2);

    // Update motion values for smooth tracking
    x.set(deltaX);
    y.set(deltaY * 0.3); // Less vertical movement

    // Determine current swipe direction for indicators
    if (Math.abs(deltaX) > 30) {
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    } else {
      setSwipeDirection(null);
    }
  }, [disabled, x, y]);

  const handleSwipeStart = useCallback(() => {
    if (disabled) return;
    setIsSwiping(true);
  }, [disabled]);

  const handleSwipeEnd = useCallback(() => {
    if (disabled) return;

    // Spring back to center if not swiped far enough
    animate(x, 0, { duration: 0.3, ease: [0.32, 0.72, 0, 1] });
    animate(y, 0, { duration: 0.3, ease: [0.32, 0.72, 0, 1] });
    setIsSwiping(false);
    setSwipeDirection(null);
  }, [disabled, x, y]);

  // Initialize swipe gesture hook
  useSwipeGesture(
    cardRef as React.RefObject<HTMLElement>,
    {
      onSwipe: handleSwipe,
      onSwipeMove: handleSwipeMove,
      onSwipeStart: handleSwipeStart,
      onSwipeEnd: handleSwipeEnd,
    },
    {
      minDistance: 50,
      maxDuration: 500,
      minVelocity: 0.3,
      debounceMs: 300,
      preventScroll: true,
    }
  );

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Swipe Indicators */}
      {showIndicators && (
        <>
          {/* Left indicator (reject) */}
          <motion.div
            className="absolute left-8 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: swipeDirection === 'left' ? 1 : 0,
              scale: swipeDirection === 'left' ? 1 : 0.8,
            }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="px-6 py-3 rounded-xl font-bold text-lg border-2"
              style={{
                borderColor: '#ef4444',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
              }}
            >
              NOPE
            </div>
          </motion.div>

          {/* Right indicator (like) */}
          <motion.div
            className="absolute right-8 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: swipeDirection === 'right' ? 1 : 0,
              scale: swipeDirection === 'right' ? 1 : 0.8,
            }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="px-6 py-3 rounded-xl font-bold text-lg border-2"
              style={{
                borderColor: '#10b981',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
              }}
            >
              LIKE
            </div>
          </motion.div>
        </>
      )}

      {/* Swipeable Card */}
      <motion.div
        ref={cardRef}
        className={`relative touch-none ${className}`}
        style={{
          x,
          y,
          rotate,
          opacity,
          cursor: disabled ? 'default' : 'grab',
        }}
        whileTap={!disabled ? { cursor: 'grabbing' } : {}}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
      >
        {children}

        {/* Active swipe overlay */}
        {isSwiping && (
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl transition-all duration-200"
            style={{
              background: swipeDirection === 'right'
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05))'
                : swipeDirection === 'left'
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(248, 113, 113, 0.05))'
                : 'transparent',
              border: swipeDirection
                ? `2px solid ${swipeDirection === 'right' ? '#10b981' : '#ef4444'}40`
                : 'none',
            }}
          />
        )}
      </motion.div>

      {/* Particle effects */}
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-3 h-3 rounded-full pointer-events-none"
            style={{
              background: particle.color,
              left: '50%',
              top: '50%',
              boxShadow: `0 0 10px ${particle.color}`,
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(particle.angle) * 100,
              y: Math.sin(particle.angle) * 100,
              opacity: 0,
              scale: 0.5,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
