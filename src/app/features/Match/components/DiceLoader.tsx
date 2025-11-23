"use client";

import { motion } from 'framer-motion';

/**
 * Bouncing Dice Loader
 *
 * Displays a row of animated dice that roll and bounce while data loads.
 * Uses Framer Motion for smooth 360° rotations and scale pulses.
 * Fits the ranking/gaming theme of the Match feature.
 */
export function DiceLoader() {
  // Create 3 dice for a balanced visual
  const diceCount = 3;

  return (
    <div
      className="flex items-center justify-center gap-4"
      data-testid="dice-loader"
    >
      {Array.from({ length: diceCount }).map((_, i) => (
        <motion.div
          key={i}
          className="relative"
          initial={{ opacity: 0, y: -20 }}
          animate={{
            opacity: 1,
            y: 0,
            rotate: 360,
            scale: [1, 1.2, 1]
          }}
          transition={{
            opacity: { duration: 0.3, delay: i * 0.1 },
            y: { duration: 0.3, delay: i * 0.1 },
            rotate: {
              duration: 2,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.15
            },
            scale: {
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15
            }
          }}
          data-testid={`dice-${i}`}
        >
          {/* Die face */}
          <div className="w-12 h-12 bg-gradient-to-br from-white via-slate-100 to-slate-200 rounded-lg shadow-lg flex items-center justify-center border border-slate-300">
            {/* Dice dots pattern - showing different faces */}
            <DiceFace number={((i + 1) % 6) + 1} />
          </div>

          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg opacity-20 blur-sm"
            animate={{
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * DiceFace - renders the dot pattern for each dice face
 */
function DiceFace({ number }: { number: number }) {
  const dotPositions = {
    1: ['center'],
    2: ['top-left', 'bottom-right'],
    3: ['top-left', 'center', 'bottom-right'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
  };

  const positions = dotPositions[number as keyof typeof dotPositions] || dotPositions[1];

  const positionClasses = {
    'top-left': 'top-1.5 left-1.5',
    'top-right': 'top-1.5 right-1.5',
    'middle-left': 'top-1/2 -translate-y-1/2 left-1.5',
    'middle-right': 'top-1/2 -translate-y-1/2 right-1.5',
    'bottom-left': 'bottom-1.5 left-1.5',
    'bottom-right': 'bottom-1.5 right-1.5',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
  };

  return (
    <div className="relative w-full h-full">
      {positions.map((pos, idx) => (
        <div
          key={`${pos}-${idx}`}
          className={`absolute w-1.5 h-1.5 bg-slate-800 rounded-full ${
            positionClasses[pos as keyof typeof positionClasses]
          }`}
        />
      ))}
    </div>
  );
}
