"use client";

import { motion } from 'framer-motion';
import { Trophy, RotateCcw, Check } from 'lucide-react';
import { BracketState } from '../lib/bracketGenerator';

interface BracketCompleteProps {
  bracket: BracketState;
  onApplyRanking: () => void;
  onRestart: () => void;
}

/**
 * Completion screen when tournament bracket is finished
 * Shows champion and options to apply ranking or restart
 */
export function BracketComplete({
  bracket,
  onApplyRanking,
  onRestart,
}: BracketCompleteProps) {
  const champion = bracket.champion;
  const championTitle =
    champion?.item?.title || champion?.item?.name || 'Champion';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-sm mx-auto px-4 text-center"
    >
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm">
        {/* Trophy animation */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="mb-5"
        >
          <div className="relative inline-block">
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Trophy className="w-16 h-16 text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]" />
            </motion.div>
            <motion.div
              className="absolute -inset-6 rounded-full"
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
        <h2 className="text-xl font-black text-white mb-1">
          Tournament Complete!
        </h2>
        <p className="text-sm text-slate-400 mb-3">Your champion:</p>

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
        <p className="text-lg font-bold text-yellow-400 mb-5">
          {championTitle}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onRestart}
            className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            New Bracket
          </button>
          <button
            onClick={onApplyRanking}
            className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-green-500/30"
          >
            <Check className="w-4 h-4" />
            Apply
          </button>
        </div>
      </div>
    </motion.div>
  );
}
