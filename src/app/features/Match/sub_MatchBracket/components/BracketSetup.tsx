"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Play, Settings2, ChevronDown, Zap } from 'lucide-react';
import {
  BracketSize,
  SeedingStrategy,
  getAvailableSeedingStrategies,
  getSeedingStrategyName,
} from '../lib';

interface BracketSetupProps {
  itemCount: number;
  bracketSize: BracketSize;
  seedingStrategy: SeedingStrategy;
  onBracketSizeChange: (size: BracketSize) => void;
  onSeedingStrategyChange: (strategy: SeedingStrategy) => void;
  onStart: () => void;
  onCancel: () => void;
}

/**
 * Bracket size selector buttons
 */
function BracketSizeSelector({
  size,
  onChange,
  maxSize,
}: {
  size: BracketSize;
  onChange: (size: BracketSize) => void;
  maxSize: number;
}) {
  const sizes: BracketSize[] = [8, 16, 32, 64];
  const availableSizes = sizes.filter((s) => s <= Math.max(8, maxSize));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {availableSizes.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-200
            ${
              size === s
                ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300'
                : 'bg-slate-800 border border-slate-600 text-slate-400 hover:border-slate-500'
            }
          `}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

/**
 * Seeding strategy dropdown
 */
function SeedingSelector({
  strategy,
  onChange,
}: {
  strategy: SeedingStrategy;
  onChange: (strategy: SeedingStrategy) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const strategies = getAvailableSeedingStrategies();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition-all"
      >
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          <span>{getSeedingStrategyName(strategy)}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden"
            >
              {strategies.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    onChange(s.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full px-3 py-2.5 text-left hover:bg-slate-700 transition-colors
                    ${
                      strategy === s.id
                        ? 'bg-slate-700/50 border-l-2 border-cyan-400'
                        : ''
                    }
                  `}
                >
                  <div className="text-sm font-medium text-slate-200">
                    {s.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {s.description}
                  </div>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Setup screen before bracket tournament starts
 */
export function BracketSetup({
  itemCount,
  bracketSize,
  seedingStrategy,
  onBracketSizeChange,
  onSeedingStrategyChange,
  onStart,
  onCancel,
}: BracketSetupProps) {
  const byeCount = Math.max(0, bracketSize - itemCount);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-sm mx-auto px-4"
    >
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 backdrop-blur-sm">
        {/* Header */}
        <div className="text-center mb-5">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-3"
          >
            <Trophy className="w-7 h-7 text-white" />
          </motion.div>
          <h2 className="text-lg font-bold text-white mb-1">
            Tournament Bracket
          </h2>
          <p className="text-xs text-slate-400">
            Rank items through head-to-head matchups
          </p>
        </div>

        {/* Settings */}
        <div className="space-y-4 mb-5">
          {/* Bracket size */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Bracket Size
            </label>
            <BracketSizeSelector
              size={bracketSize}
              onChange={onBracketSizeChange}
              maxSize={itemCount}
            />
            {byeCount > 0 && (
              <p className="text-[10px] text-slate-500 mt-1.5">
                {byeCount} bye{byeCount > 1 ? 's' : ''} will be added
              </p>
            )}
          </div>

          {/* Seeding strategy */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Seeding Strategy
            </label>
            <SeedingSelector
              strategy={seedingStrategy}
              onChange={onSeedingStrategyChange}
            />
          </div>

          {/* Info box */}
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                <strong className="text-slate-300">How it works:</strong> Choose
                between two items in each matchup. Winners advance until a
                champion is crowned.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onStart}
            className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Play className="w-4 h-4" />
            Start
          </button>
        </div>
      </div>
    </motion.div>
  );
}
