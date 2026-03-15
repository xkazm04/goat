"use client";

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GoatCrownTrophy } from '@/components/illustrations/GoatCrownTrophy';
import { BracketState } from '../../lib/bracketGenerator';

/** Confetti particle colors from brand palette */
const CONFETTI_COLORS = [
  '#22d3ee', // brand-hover
  '#fbbf24', // yellow-400
  '#34d399', // green-400
  '#a78bfa', // violet-400
  '#fcd34d', // yellow-300
  '#67e8f9', // brand-hover
];

const CONFETTI_COUNT = 24;

/** Generate deterministic confetti particles */
export function useConfettiParticles() {
  return useMemo(() => {
    return Array.from({ length: CONFETTI_COUNT }, (_, i) => {
      const angle = (i / CONFETTI_COUNT) * 360;
      const distance = 80 + (i % 3) * 40;
      const rad = (angle * Math.PI) / 180;
      return {
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        x: Math.cos(rad) * distance,
        y: Math.sin(rad) * distance,
        rotation: angle + (i % 2 === 0 ? 90 : 0),
        delay: (i % 6) * 0.05,
        size: i % 3 === 0 ? 6 : 4,
        shape: i % 3, // 0=rect, 1=circle, 2=triangle
      };
    });
  }, []);
}

export function TrophyTab({
  bracket,
  particles,
}: {
  bracket: BracketState;
  particles: ReturnType<typeof useConfettiParticles>;
}) {
  const champion = bracket.champion;
  const championTitle =
    champion?.item?.title || champion?.item?.name || 'Champion';

  return (
    <div className="text-center">
      {/* Trophy with confetti */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="mb-5"
      >
        <div className="relative inline-block">
          {/* Confetti burst */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                animate={{
                  x: p.x,
                  y: p.y,
                  opacity: [1, 1, 0],
                  scale: [0, 1, 0.5],
                  rotate: p.rotation,
                }}
                transition={{
                  duration: 1,
                  delay: 0.3 + p.delay,
                  ease: 'easeOut',
                }}
                className="absolute"
                style={{ width: p.size, height: p.size }}
              >
                {p.shape === 0 && (
                  <div
                    className="w-full h-full rounded-[1px]"
                    style={{ backgroundColor: p.color }}
                  />
                )}
                {p.shape === 1 && (
                  <div
                    className="w-full h-full rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                )}
                {p.shape === 2 && (
                  <div
                    className="w-0 h-0"
                    style={{
                      borderLeft: `${p.size / 2}px solid transparent`,
                      borderRight: `${p.size / 2}px solid transparent`,
                      borderBottom: `${p.size}px solid ${p.color}`,
                    }}
                  />
                )}
              </motion.div>
            ))}
          </div>

          {/* Floating trophy animation */}
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <GoatCrownTrophy size={120} />
          </motion.div>

          {/* Glow behind trophy */}
          <motion.div
            className="absolute -inset-6 rounded-full -z-10"
            animate={{ opacity: [0.2, 0.4, 0.2], scale: [0.9, 1.05, 0.9] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              background:
                'radial-gradient(circle, rgba(250,204,21,0.25) 0%, transparent 70%)',
            }}
          />
        </div>
      </motion.div>

      {/* Title */}
      <h2 className="text-[24px] font-black font-grotesk text-white mb-1">
        Tournament Complete!
      </h2>
      <p className="text-[13px] text-slate-400 mb-3">Your champion:</p>

      {/* Champion image */}
      {champion?.item?.image_url && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-20 h-20 rounded-lg overflow-hidden border-2 border-yellow-400/50 mx-auto mb-3 shadow-lg shadow-yellow-400/20"
        >
          <img
            src={champion.item.image_url}
            alt={championTitle}
            className="w-full h-full object-cover"
          />
        </motion.div>
      )}

      {/* Champion name */}
      <p className="text-[18px] font-bold font-grotesk text-yellow-400">
        {championTitle}
      </p>
    </div>
  );
}
