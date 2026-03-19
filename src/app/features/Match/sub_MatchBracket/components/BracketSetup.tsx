"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Play, Settings2, ChevronDown, Zap } from 'lucide-react';
import { useState } from 'react';

import {
  GLASS_BUTTON_PRIMARY,
  GLASS_BUTTON_SECONDARY,
  GLASS_SECTION_CLASS,
} from '@/components/ui/glass-modal';
import {
  SURFACE_ELEVATION,
  INSET,
} from '@/components/visual/depth/depth-tokens';

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
  hasConsensusData?: boolean;
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
          aria-pressed={size === s}
          aria-label={`Bracket size: ${s} competitors`}
          className={`
            px-3 py-1.5 rounded-card text-sm font-bold transition-all duration-200
            focus-ring
            ${
              size === s
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                : 'bg-gray-800/60 border border-gray-700/50 text-gray-500 hover:border-gray-600 hover:text-gray-300'
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
  hasConsensusData,
}: {
  strategy: SeedingStrategy;
  onChange: (strategy: SeedingStrategy) => void;
  hasConsensusData?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const strategies = getAvailableSeedingStrategies({ hasConsensusData });

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Seeding strategy: ${getSeedingStrategyName(strategy)}`}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-card text-sm font-medium bg-gray-900/60 hover:bg-gray-800/60 text-gray-300 border border-gray-700/50 transition-all focus-ring"
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
              className="fixed inset-0 z-dropdown"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              role="listbox"
              aria-label="Seeding strategy options"
              className="absolute top-full left-0 right-0 mt-1 border border-gray-700/50 rounded-card shadow-xl z-dropdown overflow-hidden"
              style={{ backgroundColor: SURFACE_ELEVATION.overlay }}
            >
              {strategies.map((s) => (
                <button
                  key={s.id}
                  role="option"
                  aria-selected={strategy === s.id}
                  aria-disabled={s.disabled}
                  disabled={s.disabled}
                  onClick={() => {
                    if (s.disabled) return;
                    onChange(s.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full px-3 py-2.5 text-left transition-colors
                    focus-visible:outline-hidden focus-visible:bg-gray-700/50
                    ${s.disabled
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-gray-700/40'
                    }
                    ${
                      strategy === s.id
                        ? 'bg-gray-700/30 border-l-2 border-amber-400'
                        : ''
                    }
                  `}
                >
                  <div className="text-sm font-medium text-gray-200">
                    {s.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {s.disabledReason || s.description}
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
 * Setup screen before bracket tournament starts.
 * Uses Studio design language (dark overlay surface, amber accents, glass inset).
 */
export function BracketSetup({
  itemCount,
  bracketSize,
  seedingStrategy,
  hasConsensusData,
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
      <div
        className="border border-gray-700/50 rounded-container p-5 backdrop-blur-sm"
        style={{
          backgroundColor: SURFACE_ELEVATION.overlay,
          boxShadow: INSET.glassHighlight,
        }}
      >
        {/* Header */}
        <div className="text-center mb-5">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-3"
          >
            <Trophy className="w-7 h-7 text-amber-400" />
          </motion.div>
          <h2 className="text-lg font-bold font-grotesk text-white mb-1">
            Tournament Bracket
          </h2>
          <p className="text-xs text-gray-400">
            Rank items through head-to-head matchups
          </p>
        </div>

        {/* Settings */}
        <div className="space-y-4 mb-5">
          {/* Bracket size */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2">
              Bracket Size
            </label>
            <BracketSizeSelector
              size={bracketSize}
              onChange={onBracketSizeChange}
              maxSize={itemCount}
            />
            {byeCount > 0 && (
              <p className="text-2xs text-gray-500 mt-1.5">
                {byeCount} bye{byeCount > 1 ? 's' : ''} will be added
              </p>
            )}
          </div>

          {/* Seeding strategy */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2">
              Seeding Strategy
            </label>
            <SeedingSelector
              strategy={seedingStrategy}
              onChange={onSeedingStrategyChange}
              hasConsensusData={hasConsensusData}
            />
          </div>

          {/* Info box */}
          <div className={GLASS_SECTION_CLASS}>
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-400 leading-relaxed">
                <strong className="text-gray-300">How it works:</strong> Choose
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
            className={`flex-1 ${GLASS_BUTTON_SECONDARY} focus-ring`}
          >
            Cancel
          </button>
          <button
            onClick={onStart}
            className={`flex-1 ${GLASS_BUTTON_PRIMARY} font-bold flex items-center justify-center gap-2 focus-ring`}
          >
            <Play className="w-4 h-4" />
            Start
          </button>
        </div>
      </div>
    </motion.div>
  );
}
