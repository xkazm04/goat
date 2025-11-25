"use client";

/**
 * SwipeableCard Component
 * Mobile-optimized swipeable card with themeable particle effects and sound
 */

import { useRef, useState, useCallback, useMemo } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence, animate } from 'framer-motion';
import { useSwipeGesture } from '@/hooks';
import { useParticleThemeStore } from '@/stores/particle-theme-store';
import type { SwipeEvent, SwipeDirection } from '@/hooks';
import type { ParticleShape } from '@/types/particle-theme.types';

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

  // Audio refs for sound effects
  const audioRightRef = useRef<HTMLAudioElement | null>(null);
  const audioLeftRef = useRef<HTMLAudioElement | null>(null);

  // Get theme configuration from store
  const { getActiveTheme, soundEnabled, hapticEnabled } = useParticleThemeStore();
  const theme = getActiveTheme();

  // Motion values for smooth animations
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-25, 0, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);

  // Play sound effect
  const playSound = useCallback((direction: 'left' | 'right') => {
    if (!soundEnabled) return;

    const soundUrl = direction === 'right' ? theme.soundRight : theme.soundLeft;
    if (!soundUrl) return;

    try {
      const audio = direction === 'right' ? audioRightRef.current : audioLeftRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch((err) => console.warn('Audio play failed:', err));
      }
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  }, [soundEnabled, theme.soundRight, theme.soundLeft]);

  // Trigger haptic feedback (mobile only)
  const triggerHaptic = useCallback(() => {
    if (!hapticEnabled) return;

    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, [hapticEnabled]);

  // Render particle shape based on theme
  const renderParticleShape = (shape: ParticleShape, color: string, size: number) => {
    const baseClasses = 'absolute pointer-events-none';

    switch (shape) {
      case 'circle':
        return (
          <div
            className={`${baseClasses} rounded-full`}
            style={{
              width: size,
              height: size,
              background: color,
              boxShadow: `0 0 10px ${color}`,
            }}
          />
        );
      case 'square':
        return (
          <div
            className={baseClasses}
            style={{
              width: size,
              height: size,
              background: color,
              boxShadow: `0 0 10px ${color}`,
            }}
          />
        );
      case 'triangle':
        return (
          <div
            className={baseClasses}
            style={{
              width: 0,
              height: 0,
              borderLeft: `${size / 2}px solid transparent`,
              borderRight: `${size / 2}px solid transparent`,
              borderBottom: `${size}px solid ${color}`,
              filter: `drop-shadow(0 0 5px ${color})`,
            }}
          />
        );
      case 'star':
        return (
          <div
            className={baseClasses}
            style={{
              width: size,
              height: size,
              background: color,
              clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
              filter: `drop-shadow(0 0 5px ${color})`,
            }}
          />
        );
      case 'heart':
        return (
          <div
            className={baseClasses}
            style={{
              width: size,
              height: size,
              background: color,
              clipPath: 'path("M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z")',
              filter: `drop-shadow(0 0 5px ${color})`,
            }}
          />
        );
      case 'sparkle':
        return (
          <div
            className={baseClasses}
            style={{
              width: size,
              height: size,
              background: `linear-gradient(45deg, ${color}, transparent)`,
              clipPath: 'polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%)',
              filter: `drop-shadow(0 0 8px ${color})`,
            }}
          />
        );
      default:
        return (
          <div
            className={`${baseClasses} rounded-full`}
            style={{
              width: size,
              height: size,
              background: color,
              boxShadow: `0 0 10px ${color}`,
            }}
          />
        );
    }
  };

  // Create particle burst effect with theme configuration
  const createParticleBurst = useCallback((swipeDir: 'left' | 'right') => {
    const colors = swipeDir === 'right' ? theme.colors.right : theme.colors.left;
    const newParticles: Particle[] = [];

    for (let i = 0; i < theme.particleCount; i++) {
      const angle = (Math.PI * 2 * i) / theme.particleCount;
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
    setTimeout(() => setParticles([]), theme.animationDuration + 100);
  }, [theme]);

  const handleSwipe = useCallback((swipeData: SwipeEvent) => {
    if (disabled) return;

    const { direction } = swipeData;

    // Only handle horizontal swipes
    if (direction === 'left' || direction === 'right') {
      // Create particle effect
      createParticleBurst(direction);

      // Play sound and haptic feedback
      playSound(direction);
      triggerHaptic();

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
  }, [disabled, onSwipe, onSwipeLeft, onSwipeRight, createParticleBurst, playSound, triggerHaptic, x, y]);

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

  // Indicator colors from theme
  const rightIndicatorColor = theme.colors.rightIndicator || theme.colors.right[0];
  const leftIndicatorColor = theme.colors.leftIndicator || theme.colors.left[0];

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Preload audio */}
      {theme.soundRight && (
        <audio
          ref={audioRightRef}
          src={theme.soundRight}
          preload="auto"
          style={{ display: 'none' }}
        />
      )}
      {theme.soundLeft && (
        <audio
          ref={audioLeftRef}
          src={theme.soundLeft}
          preload="auto"
          style={{ display: 'none' }}
        />
      )}

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
                borderColor: leftIndicatorColor,
                background: `${leftIndicatorColor}26`,
                color: leftIndicatorColor,
                boxShadow: `0 0 20px ${leftIndicatorColor}4D`,
              }}
              data-testid="swipe-left-indicator"
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
                borderColor: rightIndicatorColor,
                background: `${rightIndicatorColor}26`,
                color: rightIndicatorColor,
                boxShadow: `0 0 20px ${rightIndicatorColor}4D`,
              }}
              data-testid="swipe-right-indicator"
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
        data-testid="swipeable-card"
      >
        {children}

        {/* Active swipe overlay */}
        {isSwiping && (
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl transition-all duration-200"
            style={{
              background: swipeDirection === 'right'
                ? `linear-gradient(135deg, ${rightIndicatorColor}1A, ${rightIndicatorColor}0D)`
                : swipeDirection === 'left'
                ? `linear-gradient(135deg, ${leftIndicatorColor}1A, ${leftIndicatorColor}0D)`
                : 'transparent',
              border: swipeDirection
                ? `2px solid ${swipeDirection === 'right' ? rightIndicatorColor : leftIndicatorColor}40`
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
            className="absolute"
            style={{
              left: '50%',
              top: '50%',
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(particle.angle) * theme.burstRadius,
              y: Math.sin(particle.angle) * theme.burstRadius,
              opacity: 0,
              scale: 0.5,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: theme.animationDuration / 1000, ease: 'easeOut' }}
          >
            {renderParticleShape(theme.shape, particle.color, theme.particleSize)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
