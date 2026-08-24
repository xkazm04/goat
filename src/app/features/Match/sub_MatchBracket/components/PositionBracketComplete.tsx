"use client";

import { motion } from 'framer-motion';
import { Trophy, RotateCcw, X } from 'lucide-react';

import { DURATION } from '@/lib/animations/motion-presets';

import type { BracketState } from '../lib/bracketGenerator';

interface PositionBracketCompleteProps {
  bracket: BracketState;
  targetPosition: number;
  onApply: () => void;
  onRestart: () => void;
  onCancel: () => void;
}

/**
 * Simplified bracket completion screen for position-scoped brackets.
 * Shows champion + "Set as #N" CTA. No standings/stats tabs.
 */
export function PositionBracketComplete({
  bracket,
  targetPosition,
  onApply,
  onRestart,
  onCancel,
}: PositionBracketCompleteProps) {
  const champion = bracket.champion;
  const title = champion?.item
    ? (champion.item as Record<string, unknown>).name as string ||
      (champion.item as Record<string, unknown>).title as string ||
      'Champion'
    : 'Champion';
  const imageUrl = champion?.item
    ? (champion.item as Record<string, unknown>).image_url as string | null
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: DURATION.normal }}
      className="flex flex-col items-center gap-6 py-8"
    >
      {/* Trophy icon */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', bounce: 0.4, delay: 0.1 }}
      >
        <Trophy className="w-16 h-16 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
      </motion.div>

      {/* Champion card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: DURATION.normal }}
        className="flex flex-col items-center gap-3"
      >
        {imageUrl && (
          <div className="w-32 h-40 rounded-card overflow-hidden border-2 border-yellow-500/40 shadow-lg">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <h3 className="text-xl font-bold text-white text-center max-w-xs">
          {title}
        </h3>
        <p className="text-sm text-yellow-400/70 font-mono uppercase tracking-wider">
          Tournament Champion
        </p>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: DURATION.normal }}
        className="flex flex-col items-center gap-3 w-full max-w-xs"
      >
        <button
          onClick={onApply}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-control transition-colors text-sm"
        >
          <Trophy className="w-4 h-4" />
          Set as #{targetPosition + 1}
        </button>
        <div className="flex gap-2 w-full">
          <button
            onClick={onRestart}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-control transition-colors text-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Redo
          </button>
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-control transition-colors text-sm"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
