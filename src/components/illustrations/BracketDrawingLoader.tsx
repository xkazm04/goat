'use client';

import { motion } from 'framer-motion';

interface BracketDrawingLoaderProps {
  className?: string;
}

/**
 * Branded bracket-drawing loading animation.
 * SVG that progressively reveals a mini bracket tree:
 * 4 matchup slots → 2 → 1 champion slot.
 * Uses stroke-dasharray/stroke-dashoffset for draw-on effect.
 * Cyan-400 stroke on slate-900, champion slot pulses yellow-400.
 * Size: 80x60px.
 */
export function BracketDrawingLoader({ className }: BracketDrawingLoaderProps) {
  const drawTransition = {
    duration: 1.5,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  };

  return (
    <div className={className}>
      <svg
        width="80"
        height="60"
        viewBox="0 0 80 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Round 1: 4 matchup slots (left side) */}
        {/* Slot 1 */}
        <motion.line
          x1="4" y1="8" x2="18" y2="8"
          stroke="#22d3ee"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="14"
          strokeDashoffset="14"
          animate={{ strokeDashoffset: [14, 0] }}
          transition={{ ...drawTransition, delay: 0 }}
        />
        {/* Slot 2 */}
        <motion.line
          x1="4" y1="22" x2="18" y2="22"
          stroke="#22d3ee"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="14"
          strokeDashoffset="14"
          animate={{ strokeDashoffset: [14, 0] }}
          transition={{ ...drawTransition, delay: 0.1 }}
        />
        {/* Slot 3 */}
        <motion.line
          x1="4" y1="38" x2="18" y2="38"
          stroke="#22d3ee"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="14"
          strokeDashoffset="14"
          animate={{ strokeDashoffset: [14, 0] }}
          transition={{ ...drawTransition, delay: 0.2 }}
        />
        {/* Slot 4 */}
        <motion.line
          x1="4" y1="52" x2="18" y2="52"
          stroke="#22d3ee"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="14"
          strokeDashoffset="14"
          animate={{ strokeDashoffset: [14, 0] }}
          transition={{ ...drawTransition, delay: 0.3 }}
        />

        {/* Connectors: Round 1 → Round 2 */}
        {/* Top pair connector */}
        <motion.path
          d="M18 8 L26 8 L26 22 L18 22"
          stroke="#22d3ee"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="42"
          strokeDashoffset="42"
          animate={{ strokeDashoffset: [42, 0] }}
          transition={{ ...drawTransition, delay: 0.4 }}
        />
        {/* Bottom pair connector */}
        <motion.path
          d="M18 38 L26 38 L26 52 L18 52"
          stroke="#22d3ee"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="42"
          strokeDashoffset="42"
          animate={{ strokeDashoffset: [42, 0] }}
          transition={{ ...drawTransition, delay: 0.5 }}
        />

        {/* Round 2: 2 slots (middle) */}
        {/* Slot A */}
        <motion.line
          x1="26" y1="15" x2="44" y2="15"
          stroke="#22d3ee"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="18"
          strokeDashoffset="18"
          animate={{ strokeDashoffset: [18, 0] }}
          transition={{ ...drawTransition, delay: 0.6 }}
        />
        {/* Slot B */}
        <motion.line
          x1="26" y1="45" x2="44" y2="45"
          stroke="#22d3ee"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="18"
          strokeDashoffset="18"
          animate={{ strokeDashoffset: [18, 0] }}
          transition={{ ...drawTransition, delay: 0.7 }}
        />

        {/* Connector: Round 2 → Final */}
        <motion.path
          d="M44 15 L52 15 L52 45 L44 45"
          stroke="#22d3ee"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="68"
          strokeDashoffset="68"
          animate={{ strokeDashoffset: [68, 0] }}
          transition={{ ...drawTransition, delay: 0.8 }}
        />

        {/* Champion slot (right side) - pulses yellow on completion */}
        <motion.line
          x1="52" y1="30" x2="74" y2="30"
          stroke="#fbbf24"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="22"
          strokeDashoffset="22"
          animate={{
            strokeDashoffset: [22, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{ ...drawTransition, delay: 1.0 }}
        />

        {/* Champion crown dot */}
        <motion.circle
          cx="63"
          cy="25"
          r="2"
          fill="#fbbf24"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
          transition={{ ...drawTransition, delay: 1.2 }}
          style={{ transformOrigin: '63px 25px' }}
        />
      </svg>

      <p className="text-sm text-slate-400 italic mt-3" style={{ fontFamily: 'var(--font-space-grotesk, inherit)' }}>
        Preparing your bracket...
      </p>
    </div>
  );
}
