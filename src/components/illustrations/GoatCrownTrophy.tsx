'use client';

import { motion } from 'framer-motion';

interface GoatCrownTrophyProps {
  className?: string;
  size?: number;
}

/**
 * Custom G.O.A.T. crown/trophy hybrid SVG illustration.
 * Geometric, flat-style trophy with goat horns incorporated into handles.
 * 120x120px default, yellow-400/yellow-300 with brand-hover accent sparkles.
 */
export function GoatCrownTrophy({ className, size = 120 }: GoatCrownTrophyProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Glow backdrop */}
      <circle cx="60" cy="60" r="50" fill="url(#glow)" opacity="0.3" />

      {/* Trophy base */}
      <rect x="42" y="92" width="36" height="6" rx="3" fill="#fbbf24" />
      <rect x="48" y="86" width="24" height="8" rx="2" fill="#f59e0b" />

      {/* Trophy stem */}
      <rect x="55" y="72" width="10" height="16" rx="2" fill="#fbbf24" />

      {/* Trophy cup body */}
      <path
        d="M32 38 C32 38 34 72 60 72 C86 72 88 38 88 38 L32 38Z"
        fill="url(#cupGradient)"
        stroke="#fcd34d"
        strokeWidth="1.5"
      />

      {/* Trophy cup rim */}
      <rect x="30" y="35" width="60" height="5" rx="2.5" fill="#fcd34d" />

      {/* Left goat horn handle */}
      <path
        d="M32 42 C24 40 16 30 14 18 C14 16 16 15 17 17 C22 28 26 34 30 38"
        stroke="#f59e0b"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M14 18 C12 12 14 6 18 4"
        stroke="#fcd34d"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Right goat horn handle */}
      <path
        d="M88 42 C96 40 104 30 106 18 C106 16 104 15 103 17 C98 28 94 34 90 38"
        stroke="#f59e0b"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M106 18 C108 12 106 6 102 4"
        stroke="#fcd34d"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Crown points on cup */}
      <path
        d="M40 35 L44 24 L50 32 L56 20 L60 28 L64 20 L70 32 L76 24 L80 35"
        fill="#fcd34d"
        stroke="#f59e0b"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Crown jewel dots */}
      <circle cx="44" cy="27" r="2" fill="#22d3ee" />
      <circle cx="60" cy="23" r="2.5" fill="#22d3ee" />
      <circle cx="76" cy="27" r="2" fill="#22d3ee" />

      {/* Sparkle accents - animated via CSS */}
      <motion.g
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Top-left sparkle */}
        <path d="M20 50 L22 46 L24 50 L22 54Z" fill="#22d3ee" opacity="0.8" />
        {/* Top-right sparkle */}
        <path d="M96 50 L98 46 L100 50 L98 54Z" fill="#22d3ee" opacity="0.8" />
      </motion.g>

      <motion.g
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        {/* Small sparkle left */}
        <path d="M26 66 L27.5 63 L29 66 L27.5 69Z" fill="#22d3ee" opacity="0.6" />
        {/* Small sparkle right */}
        <path d="M91 66 L92.5 63 L94 66 L92.5 69Z" fill="#22d3ee" opacity="0.6" />
      </motion.g>

      {/* Star highlight on cup */}
      <motion.path
        d="M60 48 L62 52 L66 52 L63 55 L64 59 L60 57 L56 59 L57 55 L54 52 L58 52Z"
        fill="#fef3c7"
        animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ transformOrigin: '60px 53px' }}
      />

      <defs>
        <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cupGradient" x1="60" y1="38" x2="60" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}
