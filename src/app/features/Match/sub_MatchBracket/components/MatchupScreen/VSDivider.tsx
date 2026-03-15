"use client";

import { motion } from 'framer-motion';

/**
 * Custom geometric lightning bolt SVG
 */
function LightningBolt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" width={24} height={24} className={className}>
      <path
        d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"
        fill="url(#bolt-gradient)"
        stroke="#facc15"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="bolt-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#facc15" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Branded VS shield emblem with geometric burst pattern
 * 64x64 center emblem with 24x24 lightning bolt sparks
 */
export function VSDivider({ size }: { size: number }) {
  const emblemSize = Math.max(48, Math.min(size, 64));
  const sparkSize = Math.max(16, emblemSize * 0.375);

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      className="relative shrink-0 flex items-center justify-center z-10 mx-2 sm:mx-4"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-linear-to-r from-brand/0 via-brand/20 to-brand/0 blur-xl scale-150" />

      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="relative"
      >
        {/* Shield-shaped VS emblem */}
        <svg
          viewBox="0 0 64 64"
          fill="none"
          style={{ width: emblemSize, height: emblemSize }}
          className="drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]"
        >
          <defs>
            <linearGradient id="vs-shield-fill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="vs-burst" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#facc15" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Geometric burst rays behind shield */}
          <g opacity="0.3">
            <line x1="32" y1="4" x2="32" y2="14" stroke="#facc15" strokeWidth="2" />
            <line x1="32" y1="50" x2="32" y2="60" stroke="#facc15" strokeWidth="2" />
            <line x1="8" y1="32" x2="16" y2="32" stroke="#facc15" strokeWidth="2" />
            <line x1="48" y1="32" x2="56" y2="32" stroke="#facc15" strokeWidth="2" />
            <line x1="14" y1="14" x2="20" y2="20" stroke="#facc15" strokeWidth="1.5" />
            <line x1="44" y1="14" x2="50" y2="20" stroke="#facc15" strokeWidth="1.5" />
            <line x1="14" y1="50" x2="20" y2="44" stroke="#facc15" strokeWidth="1.5" />
            <line x1="44" y1="50" x2="50" y2="44" stroke="#facc15" strokeWidth="1.5" />
          </g>

          {/* Shield shape */}
          <path
            d="M32 8L50 16V36C50 46 42 54 32 58C22 54 14 46 14 36V16L32 8Z"
            fill="url(#vs-shield-fill)"
            stroke="#facc15"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Inner shield highlight */}
          <path
            d="M32 12L46 18V36C46 44 40 50 32 54C24 50 18 44 18 36V18L32 12Z"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
          />

          {/* VS text */}
          <text
            x="32"
            y="40"
            textAnchor="middle"
            fill="white"
            fontSize="18"
            fontWeight="900"
            fontFamily="'Space Grotesk', sans-serif"
            letterSpacing="2"
          >
            VS
          </text>
        </svg>

        {/* Left lightning spark */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2"
          style={{ left: -sparkSize * 0.8 }}
          animate={{ x: [-3, 3, -3], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        >
          <LightningBolt className={`text-yellow-400`} />
        </motion.div>

        {/* Right lightning spark */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 -scale-x-100"
          style={{ right: -sparkSize * 0.8 }}
          animate={{ x: [3, -3, 3], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
        >
          <LightningBolt className={`text-yellow-400`} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
