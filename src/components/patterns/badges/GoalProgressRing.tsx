'use client';

import { motion } from 'framer-motion';
import { memo, useRef, useEffect, useState } from 'react';

import { useMotionCapabilities } from '@/hooks/use-motion-preference';
import { DURATION } from '@/lib/animations/motion-presets';
import { cn } from '@/lib/utils';

import { GoalCompletionBurst } from './GoalCompletionBurst';
import type { GoalStatus } from './GoalStatusBadge';

// =============================================================================
// Types
// =============================================================================

export interface GoalProgressRingProps {
  /** Goal completion percentage (0-100) */
  progress: number;
  /** Current goal status */
  status: GoalStatus;
  /** Ring size in px */
  size?: number;
  /** Ring stroke width */
  strokeWidth?: number;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// Color mapping
// =============================================================================

const STATUS_RING_COLORS: Record<GoalStatus, string> = {
  open: '#a1a1aa',       // zinc-400
  in_progress: '#60a5fa', // blue-400
  done: '#34d399',        // emerald-400
};

// Spring physics from requirement
const RING_SPRING = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 25,
};

// =============================================================================
// GoalProgressRing
// =============================================================================

export const GoalProgressRing = memo(function GoalProgressRing({
  progress,
  status,
  size = 44,
  strokeWidth = 3.5,
  className,
}: GoalProgressRingProps) {
  const { allowTransitions, allowCelebrations } = useMotionCapabilities();
  const prevStatusRef = useRef<GoalStatus>(status);
  const [burstActive, setBurstActive] = useState(false);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;
  const center = size / 2;
  const color = STATUS_RING_COLORS[status];

  // Fire completion burst when status transitions to done
  useEffect(() => {
    if (prevStatusRef.current !== 'done' && status === 'done') {
      setBurstActive(true);
      // Reset after animation
      const timer = setTimeout(() => setBurstActive(false), 1500);
      prevStatusRef.current = status;
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = status;
  }, [status]);

  const displayProgress = Math.round(progress);

  // Minimal tier: static ring
  if (!allowTransitions) {
    return (
      <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
          <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} />
          <circle
            cx={center} cy={center} r={radius} fill="none"
            stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <span className="absolute text-2xs font-bold text-white">{displayProgress}%</span>
      </div>
    );
  }

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth}
        />

        {/* Animated progress ring */}
        <motion.circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={RING_SPRING}
          style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
        />
      </svg>

      {/* Center percentage */}
      <motion.span
        className="absolute text-2xs font-bold text-white"
        key={status}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: DURATION.normal }}
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
      >
        {displayProgress}%
      </motion.span>

      {/* Completion burst — fires only on transition to done */}
      {allowCelebrations && (
        <GoalCompletionBurst active={burstActive} containerSize={size} />
      )}
    </div>
  );
});

export default GoalProgressRing;
