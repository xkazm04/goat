"use client";

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Zap, MessageCircle } from 'lucide-react';
import { getControversyLevel, getControversyLabel } from '@/lib/debate/types';

interface ControversyBadgeProps {
  score: number;
  isHotTake: boolean;
  hasDebate: boolean;
  onClick?: () => void;
  compact?: boolean;
}

/**
 * Badge showing how controversial an item's placement is.
 * Appears on tier items when debate mode is enabled.
 */
export const ControversyBadge = memo(function ControversyBadge({
  score,
  isHotTake,
  hasDebate,
  onClick,
  compact = false,
}: ControversyBadgeProps) {
  const level = getControversyLevel(score);
  const label = getControversyLabel(level);

  if (level === 'none' && !hasDebate) return null;

  const colors = {
    volcanic: { bg: 'bg-red-500/90', text: 'text-white', glow: 'shadow-red-500/40' },
    hot: { bg: 'bg-orange-500/90', text: 'text-white', glow: 'shadow-orange-500/40' },
    moderate: { bg: 'bg-amber-500/90', text: 'text-black', glow: 'shadow-amber-500/30' },
    mild: { bg: 'bg-blue-500/80', text: 'text-white', glow: 'shadow-blue-500/30' },
    none: { bg: 'bg-green-500/80', text: 'text-white', glow: 'shadow-green-500/20' },
  };

  const style = colors[level];

  const Icon = isHotTake ? Flame : level === 'volcanic' || level === 'hot' ? Zap : MessageCircle;

  if (compact) {
    return (
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.2 }}
        className={`
          w-5 h-5 rounded-full flex items-center justify-center
          ${style.bg} ${style.text} shadow-lg ${style.glow}
          cursor-pointer transition-shadow
        `}
        title={`${label} (${score}/100)`}
        aria-label={`Controversy: ${label}. Click to debate.`}
      >
        <Icon className="w-3 h-3" />
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.05 }}
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-badge
        ${style.bg} ${style.text} shadow-md ${style.glow}
        text-2xs font-bold uppercase tracking-wide
        cursor-pointer transition-shadow
      `}
      aria-label={`Controversy: ${label}. Click to debate.`}
    >
      <Icon className="w-3 h-3" />
      <span>{label}</span>
      {hasDebate && (
        <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
      )}
    </motion.button>
  );
});

export default ControversyBadge;
