'use client';

import { motion } from 'framer-motion';

import { useMotionCapabilities } from '@/hooks/use-motion-preference';

interface BracketDrawingLoaderProps {
  className?: string;
}

const DRAW = {
  duration: 1.5,
  repeat: Infinity,
  ease: 'easeInOut' as const,
};

/**
 * One dashed stroke that draws itself on (offset `len` -> 0) when loops are
 * allowed, and sits fully drawn when they are not. The still frame is the frame
 * the animation ends on, so a reduced-motion user sees the same bracket the
 * loop was drawing rather than an empty box (registry:
 * motion/content-bearing-degradation).
 */
function drawProps(loop: boolean, len: number, delay: number) {
  return loop
    ? {
        strokeDasharray: len,
        strokeDashoffset: len,
        animate: { strokeDashoffset: [len, 0] },
        transition: { ...DRAW, delay },
      }
    : { strokeDasharray: len, strokeDashoffset: 0 };
}

/**
 * Branded bracket-drawing loading animation.
 * SVG that progressively reveals a mini bracket tree:
 * 4 matchup slots → 2 → 1 champion slot.
 * Uses stroke-dasharray/stroke-dashoffset for draw-on effect.
 * Cyan-400 stroke on slate-900, champion slot pulses yellow-400.
 * Size: 80x60px. The draw-on loops are gated on the motion tier
 * (`data-motion` on the root says which branch rendered).
 */
export function BracketDrawingLoader({ className }: BracketDrawingLoaderProps) {
  const { allowAmbient: loop } = useMotionCapabilities();

  return (
    <div className={className}>
      <svg
        width="80"
        height="60"
        viewBox="0 0 80 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        data-motion={loop ? 'loop' : 'still'}
        aria-hidden="true"
        focusable="false"
      >
        {/* Round 1: 4 matchup slots (left side) */}
        <motion.line x1="4" y1="8" x2="18" y2="8" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" {...drawProps(loop, 14, 0)} />
        <motion.line x1="4" y1="22" x2="18" y2="22" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" {...drawProps(loop, 14, 0.1)} />
        <motion.line x1="4" y1="38" x2="18" y2="38" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" {...drawProps(loop, 14, 0.2)} />
        <motion.line x1="4" y1="52" x2="18" y2="52" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" {...drawProps(loop, 14, 0.3)} />

        {/* Connectors: Round 1 → Round 2 */}
        <motion.path
          d="M18 8 L26 8 L26 22 L18 22"
          stroke="#22d3ee"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          {...drawProps(loop, 42, 0.4)}
        />
        <motion.path
          d="M18 38 L26 38 L26 52 L18 52"
          stroke="#22d3ee"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          {...drawProps(loop, 42, 0.5)}
        />

        {/* Round 2: 2 slots (middle) */}
        <motion.line x1="26" y1="15" x2="44" y2="15" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" {...drawProps(loop, 18, 0.6)} />
        <motion.line x1="26" y1="45" x2="44" y2="45" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" {...drawProps(loop, 18, 0.7)} />

        {/* Connector: Round 2 → Final */}
        <motion.path
          d="M44 15 L52 15 L52 45 L44 45"
          stroke="#22d3ee"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          {...drawProps(loop, 68, 0.8)}
        />

        {/* Champion slot (right side) - pulses yellow while looping */}
        <motion.line
          x1="52"
          y1="30"
          x2="74"
          y2="30"
          stroke="#fbbf24"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={22}
          strokeDashoffset={loop ? 22 : 0}
          {...(loop
            ? {
                animate: { strokeDashoffset: [22, 0], opacity: [0.5, 1, 0.5] },
                transition: { ...DRAW, delay: 1.0 },
              }
            : {})}
        />

        {/* Champion crown dot */}
        <motion.circle
          cx="63"
          cy="25"
          r="2"
          fill="#fbbf24"
          {...(loop
            ? {
                animate: { opacity: [0, 1, 0], scale: [0.5, 1, 0.5] },
                transition: { ...DRAW, delay: 1.2 },
              }
            : {})}
          style={{ transformOrigin: '63px 25px' }}
        />
      </svg>

      <p className="text-sm text-slate-400 italic mt-3" style={{ fontFamily: 'var(--font-space-grotesk, inherit)' }}>
        Preparing your bracket...
      </p>
    </div>
  );
}
