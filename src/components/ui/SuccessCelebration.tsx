/**
 * SuccessCelebration Component
 *
 * Provides celebratory visual feedback for successful actions.
 * Features expanding rings, checkmark animation, and optional confetti.
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Download, Share2 } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

import {
  DURATION,
  EASING,
  celebrationPulseVariants,
  copyConfirmVariants,
} from '@/lib/animations/sharing';
import { useMotionPreference } from '@/hooks/use-motion-preference';

export type CelebrationVariant = 'check' | 'download' | 'share';

export interface SuccessCelebrationProps {
  /** Whether to show the celebration */
  show: boolean;
  /** Visual variant */
  variant?: CelebrationVariant;
  /** Primary color for the celebration */
  color?: string;
  /** Size of the celebration icon */
  size?: 'sm' | 'md' | 'lg';
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Additional CSS classes */
  className?: string;
}

const SIZE_CONFIG = {
  sm: { icon: 16, ring: 32 },
  md: { icon: 24, ring: 48 },
  lg: { icon: 32, ring: 64 },
};

const ICONS = {
  check: Check,
  download: Download,
  share: Share2,
};

/**
 * SuccessCelebration - Celebratory animation for completed actions
 *
 * @example
 * ```tsx
 * const [showSuccess, setShowSuccess] = useState(false);
 *
 * // Trigger after successful action
 * const handleDownload = async () => {
 *   await downloadFile();
 *   setShowSuccess(true);
 * };
 *
 * return (
 *   <div className="relative">
 *     <button onClick={handleDownload}>Download</button>
 *     <SuccessCelebration
 *       show={showSuccess}
 *       variant="download"
 *       onComplete={() => setShowSuccess(false)}
 *     />
 *   </div>
 * );
 * ```
 */
export const SuccessCelebration = memo(function SuccessCelebration({
  show,
  variant = 'check',
  color = '#22c55e',
  size = 'md',
  onComplete,
  className = '',
}: SuccessCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);
  // SSR-safe motion check (see AnimatedCounter): render-time prefersReducedMotion()
  // diverged server (false) vs client (true), causing a hydration mismatch.
  const { tier } = useMotionPreference();
  const reducedMotion = tier !== 'full';

  const { icon: iconSize, ring: ringSize } = SIZE_CONFIG[size];
  const Icon = ICONS[variant];

  useEffect(() => {
    if (show) {
      setIsVisible(true);

      // Auto-hide after animation completes
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, DURATION.dramatic * 1000 + 500);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (reducedMotion) {
    return (
      <AnimatePresence>
        {isVisible && (
          <div
            className={`absolute inset-0 flex items-center justify-center ${className}`}
          >
            <div
              className="rounded-full p-2"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon size={iconSize} style={{ color }} />
            </div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Expanding pulse rings */}
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="absolute rounded-full"
              style={{
                width: ringSize,
                height: ringSize,
                border: `2px solid ${color}`,
              }}
              variants={celebrationPulseVariants}
              initial="hidden"
              animate="visible"
              custom={index}
              transition={{
                delay: index * 0.1,
              }}
            />
          ))}

          {/* Center icon */}
          <motion.div
            className="relative z-10 rounded-full flex items-center justify-center"
            style={{
              width: ringSize * 0.75,
              height: ringSize * 0.75,
              backgroundColor: color,
            }}
            variants={copyConfirmVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Icon size={iconSize} className="text-white" strokeWidth={3} />
          </motion.div>

          {/* Sparkles */}
          <Sparkles color={color} count={6} radius={ringSize} />
        </motion.div>
      )}
    </AnimatePresence>
  );
});

/**
 * Sparkle particles for extra celebration effect
 */
interface SparklesProps {
  color: string;
  count: number;
  radius: number;
}

const Sparkles = memo(function Sparkles({ color, count, radius }: SparklesProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: color }}
            initial={{
              opacity: 0,
              scale: 0,
              x: 0,
              y: 0,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
              x: [0, x * 1.2],
              y: [0, y * 1.2],
            }}
            transition={{
              duration: DURATION.dramatic,
              ease: EASING.easeOut,
              delay: 0.15 + i * 0.03,
            }}
          />
        );
      })}
    </>
  );
});

/**
 * DownloadProgress - Progress indicator for download operations
 *
 * @example
 * ```tsx
 * <DownloadProgress progress={0.75} />
 * ```
 */
export interface DownloadProgressProps {
  /** Progress value from 0 to 1 */
  progress: number;
  /** Size of the progress indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Primary color */
  color?: string;
  /** Additional CSS classes */
  className?: string;
}

export const DownloadProgress = memo(function DownloadProgress({
  progress,
  size = 'md',
  color = '#06b6d4',
  className = '',
}: DownloadProgressProps) {
  const { ring: ringSize } = SIZE_CONFIG[size];
  const strokeWidth = size === 'sm' ? 2 : size === 'md' ? 3 : 4;
  const radius = (ringSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // SSR-safe motion check (avoids the render-time hydration mismatch).
  const { tier } = useMotionPreference();
  const reducedMotion = tier !== 'full';

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: ringSize, height: ringSize }}
    >
      {/* Background circle */}
      <svg
        className="absolute transform -rotate-90"
        width={ringSize}
        height={ringSize}
      >
        <circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          fill="none"
          stroke={`${color}20`}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: DURATION.quick, ease: EASING.easeOut }
          }
        />
      </svg>

      {/* Percentage text */}
      <span
        className="text-xs font-medium"
        style={{ color }}
      >
        {Math.round(progress * 100)}%
      </span>
    </div>
  );
});

export default SuccessCelebration;
