'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Circle, Loader2, CheckCircle2 } from 'lucide-react';
import { memo, useRef, useEffect, useState } from 'react';

import { useMotionCapabilities } from '@/hooks/use-motion-preference';
import { DURATION } from '@/lib/animations/motion-presets';
import { cn } from '@/lib/utils';

import type { BadgeSize } from './types';

// =============================================================================
// Types
// =============================================================================

export type GoalStatus = 'open' | 'in_progress' | 'done';

export interface GoalStatusBadgeProps {
  /** Current goal status */
  status: GoalStatus;
  /** Unique ID for cross-component layoutId animations */
  goalId: string;
  /** Badge size */
  size?: BadgeSize;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// Status configuration
// =============================================================================

const STATUS_CONFIG: Record<GoalStatus, {
  label: string;
  icon: typeof Circle;
  bg: string;
  text: string;
  border: string;
  glow: string;
}> = {
  open: {
    label: 'Open',
    icon: Circle,
    bg: 'bg-zinc-500/15',
    text: 'text-zinc-400',
    border: 'border-zinc-500/30',
    glow: 'rgba(161, 161, 170, 0.4)',
  },
  in_progress: {
    label: 'In Progress',
    icon: Loader2,
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    glow: 'rgba(96, 165, 250, 0.4)',
  },
  done: {
    label: 'Done',
    icon: CheckCircle2,
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    glow: 'rgba(52, 211, 153, 0.5)',
  },
};

const SIZE_MAP: Record<BadgeSize, { height: string; text: string; icon: number; px: string }> = {
  xs: { height: 'h-5', text: 'text-3xs', icon: 10, px: 'px-1.5' },
  sm: { height: 'h-6', text: 'text-2xs', icon: 12, px: 'px-2' },
  md: { height: 'h-7', text: 'text-xs', icon: 14, px: 'px-2.5' },
  lg: { height: 'h-8', text: 'text-sm', icon: 16, px: 'px-3' },
};

// Spring physics from requirement
const STATUS_SPRING = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 25,
};

// =============================================================================
// GoalStatusBadge
// =============================================================================

export const GoalStatusBadge = memo(function GoalStatusBadge({
  status,
  goalId,
  size = 'sm',
  className,
}: GoalStatusBadgeProps) {
  const { allowTransitions, allowFeedback } = useMotionCapabilities();
  const prevStatusRef = useRef<GoalStatus>(status);
  const [justChanged, setJustChanged] = useState(false);
  const config = STATUS_CONFIG[status];
  const sizeConfig = SIZE_MAP[size];
  const Icon = config.icon;

  // Detect status changes for pulse animation
  useEffect(() => {
    if (prevStatusRef.current !== status && allowFeedback) {
      setJustChanged(true);
      const timer = setTimeout(() => setJustChanged(false), 600);
      prevStatusRef.current = status;
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = status;
  }, [status, allowFeedback]);

  // Minimal tier: no motion at all
  if (!allowTransitions) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border font-medium',
          sizeConfig.height, sizeConfig.text, sizeConfig.px,
          config.bg, config.text, config.border,
          className,
        )}
      >
        <Icon size={sizeConfig.icon} className={status === 'in_progress' ? 'animate-spin' : undefined} />
        <span>{config.label}</span>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        layoutId={`goal-status-${goalId}`}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border font-medium',
          sizeConfig.height, sizeConfig.text, sizeConfig.px,
          config.bg, config.text, config.border,
          className,
        )}
        // Scale pulse: 1.0 → 1.1 → 1.0 on status change
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: 1,
          scale: justChanged ? [1.0, 1.1, 1.0] : 1.0,
        }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={STATUS_SPRING}
        style={{
          boxShadow: justChanged ? `0 0 12px ${config.glow}` : 'none',
        }}
      >
        {/* Icon with independent animation */}
        <motion.span
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ ...STATUS_SPRING, delay: 0.05 }}
          className="inline-flex shrink-0"
        >
          <Icon
            size={sizeConfig.icon}
            className={status === 'in_progress' ? 'animate-spin' : undefined}
          />
        </motion.span>

        {/* Label with cross-fade */}
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: DURATION.normal, delay: 0.05 }}
        >
          {config.label}
        </motion.span>
      </motion.div>
    </AnimatePresence>
  );
});

export default GoalStatusBadge;
