"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Trophy, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { BracketMatchup, BracketParticipant, BracketState } from '../lib/bracketGenerator';
import { useBracketDimensions } from '../lib/useBracketDimensions';
import { VotingHistoryStrip } from './VotingHistoryStrip';

interface MatchupScreenProps {
  matchup: BracketMatchup;
  bracket: BracketState;
  onSelectWinner: (winnerId: string) => void;
  onClose: () => void;
  onSkip?: () => void;
  roundName: string;
  matchNumber: number;
  totalMatchesInRound: number;
}

/**
 * Participant card for head-to-head display
 * Uses dynamic sizing from useBracketDimensions hook
 */
function ParticipantCard({
  participant,
  position,
  isSelected,
  onSelect,
  isDisabled,
  dims,
}: {
  participant: BracketParticipant;
  position: 'left' | 'right';
  isSelected: boolean;
  onSelect: () => void;
  isDisabled: boolean;
  dims: ReturnType<typeof useBracketDimensions>;
}) {
  const item = participant.item;
  if (!item) return null;

  const title = item.title || item.name || 'Unknown';
  const { cardWidth, cardMaxWidth, imageMaxHeight, isMobile, isTablet } = dims;

  return (
    <motion.div
      initial={{ opacity: 0, x: position === 'left' ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 20 }}
      className="flex-1 flex justify-center"
      style={{
        maxWidth: cardMaxWidth,
        minWidth: isMobile ? 140 : 200,
      }}
    >
      <motion.button
        onClick={onSelect}
        disabled={isDisabled}
        aria-label={`Select ${title} as winner${isSelected ? ' (currently selected)' : ''}`}
        aria-pressed={isSelected}
        whileHover={!isDisabled ? { scale: 1.02, y: -2 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        className={`
          relative w-full rounded-xl overflow-hidden transition-all duration-300
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
          ${isSelected
            ? 'ring-3 ring-green-400 ring-offset-2 ring-offset-slate-900 shadow-2xl shadow-green-500/40'
            : 'ring-1 ring-slate-600/50 hover:ring-cyan-400/50 shadow-xl'
          }
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          background: isSelected
            ? 'linear-gradient(160deg, rgba(34, 197, 94, 0.15) 0%, rgba(21, 128, 61, 0.2) 100%)'
            : 'linear-gradient(160deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)',
        }}
      >
        {/* Seed badge */}
        <div
          className={`
            absolute top-2 ${position === 'left' ? 'left-2' : 'right-2'} z-10
            px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold
            ${isSelected ? 'bg-green-500 text-white' : 'bg-slate-700/90 text-slate-300'}
          `}
        >
          #{participant.seed}
        </div>

        {/* Selected trophy indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            className={`
              absolute top-2 ${position === 'left' ? 'right-2' : 'left-2'} z-10
              w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-green-500 flex items-center justify-center
              shadow-lg shadow-green-500/50
            `}
          >
            <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
          </motion.div>
        )}

        {/* Image container - responsive height */}
        <div
          className="w-full relative overflow-hidden bg-slate-800"
          style={{
            maxHeight: imageMaxHeight,
            aspectRatio: isMobile ? '1 / 1.1' : isTablet ? '1 / 1.15' : '1 / 1.2',
          }}
        >
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={title}
              className="w-full h-full object-cover"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
              <span className="text-4xl sm:text-5xl text-slate-500 font-bold">
                {title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
        </div>

        {/* Content */}
        <div className="p-2 sm:p-3">
          <h3 className="text-sm sm:text-base font-bold text-white mb-0.5 line-clamp-2 leading-tight">
            {title}
          </h3>

          {/* Year */}
          {item.item_year && (
            <div className="text-xs text-slate-400">
              {item.item_year}
              {item.item_year_to && item.item_year_to !== item.item_year
                ? ` - ${item.item_year_to}`
                : ''}
            </div>
          )}

          {/* Tags - only on larger screens */}
          {!isMobile && item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.tags.slice(0, 2).map((tag, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded bg-slate-700/50 text-[10px] text-slate-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Hover overlay */}
        {!isSelected && !isDisabled && (
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-cyan-500/10 flex items-center justify-center pointer-events-none"
          >
            <div className="px-3 py-1.5 rounded-full bg-cyan-500/90 text-white font-bold text-xs sm:text-sm">
              Select Winner
            </div>
          </motion.div>
        )}
      </motion.button>
    </motion.div>
  );
}

/**
 * VS divider with responsive sizing
 */
function VSDivider({ size }: { size: number }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      className="relative flex-shrink-0 flex items-center justify-center z-10 mx-2 sm:mx-4"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 blur-xl scale-150" />

      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="relative"
      >
        <div
          className="rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/30"
          style={{ width: size, height: size }}
        >
          <span
            className="font-black text-white tracking-wider"
            style={{ fontSize: size * 0.3 }}
          >
            VS
          </span>
        </div>

        {/* Spark effects */}
        <motion.div
          className="absolute -left-1 top-1/2 -translate-y-1/2"
          animate={{ x: [-2, 2, -2], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        >
          <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
        </motion.div>
        <motion.div
          className="absolute -right-1 top-1/2 -translate-y-1/2"
          animate={{ x: [2, -2, 2], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
        >
          <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 rotate-180" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Main matchup screen - full screen voting experience
 * Includes voting history, responsive cards, and keyboard navigation
 */
export function MatchupScreen({
  matchup,
  bracket,
  onSelectWinner,
  onClose,
  onSkip,
  roundName,
  matchNumber,
  totalMatchesInRound,
}: MatchupScreenProps) {
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const dims = useBracketDimensions();

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isConfirming) return;

      switch (e.key) {
        case '1':
        case 'ArrowLeft':
          if (matchup.participant1) {
            setSelectedWinnerId(matchup.participant1.id);
          }
          break;
        case '2':
        case 'ArrowRight':
          if (matchup.participant2) {
            setSelectedWinnerId(matchup.participant2.id);
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (selectedWinnerId) {
            handleConfirm();
          }
          break;
        case 'Escape':
          onClose();
          break;
        case 'Tab':
          e.preventDefault();
          if (onSkip) onSkip();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [matchup, selectedWinnerId, isConfirming, onClose, onSkip]);

  const handleSelect = useCallback((participantId: string) => {
    if (isConfirming) return;
    setSelectedWinnerId(participantId);
  }, [isConfirming]);

  const handleConfirm = useCallback(() => {
    if (!selectedWinnerId || isConfirming) return;
    setIsConfirming(true);

    // Quick animation then submit
    setTimeout(() => {
      onSelectWinner(selectedWinnerId);
    }, 300);
  }, [selectedWinnerId, onSelectWinner, isConfirming]);

  const handleClear = useCallback(() => {
    if (isConfirming) return;
    setSelectedWinnerId(null);
  }, [isConfirming]);

  if (!matchup.participant1 || !matchup.participant2) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Voting History - top strip */}
      <VotingHistoryStrip bracket={bracket} />

      {/* Header */}
      <div className="flex-shrink-0 relative px-4 py-3 border-b border-slate-800/50">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          {/* Back button */}
          <button
            onClick={onClose}
            aria-label="Close matchup screen"
            className="p-2 -ml-2 rounded-lg hover:bg-slate-800/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>

          {/* Round info */}
          <div className="text-center">
            <div className="text-cyan-400 text-xs sm:text-sm font-semibold uppercase tracking-wider">
              {roundName}
            </div>
            <div className="text-slate-500 text-[10px] sm:text-xs">
              Match {matchNumber} / {totalMatchesInRound}
            </div>
          </div>

          {/* Skip button (if available) */}
          <div className="w-9">
            {onSkip && (
              <button
                onClick={onSkip}
                aria-label="Skip to next matchup"
                className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors text-slate-500 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main matchup area */}
      <div className="flex-1 flex items-center justify-center px-3 sm:px-6 py-2 overflow-hidden">
        <div
          className="flex items-center justify-center w-full"
          style={{ gap: dims.cardGap }}
        >
          {/* Left participant */}
          <ParticipantCard
            participant={matchup.participant1}
            position="left"
            isSelected={selectedWinnerId === matchup.participant1.id}
            onSelect={() => handleSelect(matchup.participant1!.id)}
            isDisabled={isConfirming}
            dims={dims}
          />

          {/* VS divider */}
          <VSDivider size={dims.vsDividerSize} />

          {/* Right participant */}
          <ParticipantCard
            participant={matchup.participant2}
            position="right"
            isSelected={selectedWinnerId === matchup.participant2.id}
            onSelect={() => handleSelect(matchup.participant2!.id)}
            isDisabled={isConfirming}
            dims={dims}
          />
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-slate-800/50 bg-slate-900/50">
        <div className="max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            {selectedWinnerId ? (
              <motion.div
                key="selected"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3"
              >
                <button
                  onClick={handleClear}
                  disabled={isConfirming}
                  aria-label="Change selection"
                  className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium transition-colors disabled:opacity-50 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Change
                </button>

                <button
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  aria-label={isConfirming ? 'Advancing winner...' : 'Confirm selected winner'}
                  aria-busy={isConfirming}
                  className="flex-[2] px-6 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-500/30 text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  {isConfirming ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
                    >
                      <Trophy className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <Trophy className="w-4 h-4" />
                  )}
                  {isConfirming ? 'Advancing...' : 'Confirm Winner'}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="hint"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-center gap-2 text-slate-400 text-sm py-2"
              >
                <Info className="w-4 h-4" />
                <span>Tap a card to select the winner</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Keyboard hints - desktop only */}
        {dims.isDesktop && (
          <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-slate-600">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-500">1</kbd> or{' '}
              <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-500">2</kbd> select
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-500">Enter</kbd> confirm
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-500">Esc</kbd> close
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
