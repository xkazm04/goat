"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Info, ChevronRight, Undo2, Scale } from 'lucide-react';
import { useState, useCallback, useMemo, useRef } from 'react';

import { DURATION } from '@/lib/animations/motion-presets';


import { ComparisonModal } from '../../../ComparisonModal';
import { BracketMatchup, BracketState, CompletedVote } from '../../lib/bracketGenerator';
import { useBracketDimensions } from '../../lib/useBracketDimensions';
import { VotingHistoryStrip } from '../VotingHistoryStrip';
import { ParticipantCard } from './ParticipantCard';
import { useMatchupKeyboard } from './useMatchupKeyboard';
import { VSDivider } from './VSDivider';

interface MatchupScreenProps {
  matchup: BracketMatchup;
  bracket: BracketState;
  completedVotes?: CompletedVote[];
  onSelectWinner: (winnerId: string) => void;
  onClose: () => void;
  onSkip?: () => void;
  onUndo?: () => void;
  onRevote?: (matchupId: string) => void;
  canUndo?: boolean;
  roundName: string;
  matchNumber: number;
  totalMatchesInRound: number;
}

/**
 * Main matchup screen - full screen voting experience
 * Includes voting history, responsive cards, and keyboard navigation
 */
export function MatchupScreen({
  matchup,
  bracket,
  completedVotes,
  onSelectWinner,
  onClose,
  onSkip,
  onUndo,
  onRevote,
  canUndo = false,
  roundName,
  matchNumber,
  totalMatchesInRound,
}: MatchupScreenProps) {
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const dims = useBracketDimensions();

  // Build comparison items from matchup participants
  const comparisonItems = useMemo(() => {
    const items = [];
    if (matchup.participant1?.item) items.push(matchup.participant1.item);
    if (matchup.participant2?.item) items.push(matchup.participant2.item);
    return items;
  }, [matchup.participant1, matchup.participant2]);

  const handleSelect = useCallback((participantId: string) => {
    if (isConfirming) return;
    setSelectedWinnerId(participantId);
    // Light haptic feedback on selection
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }
  }, [isConfirming]);

  const handleConfirm = useCallback(() => {
    if (!selectedWinnerId || isConfirming) return;
    setIsConfirming(true);

    // Haptic feedback on confirm (stronger pattern)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([30, 20, 50]);
    }

    // Quick animation then submit
    setTimeout(() => {
      onSelectWinner(selectedWinnerId);
    }, 300);
  }, [selectedWinnerId, onSelectWinner, isConfirming]);

  const handleClear = useCallback(() => {
    if (isConfirming) return;
    setSelectedWinnerId(null);
  }, [isConfirming]);

  // Keyboard navigation
  useMatchupKeyboard({
    matchup,
    selectedWinnerId,
    isConfirming,
    isCompareOpen,
    canUndo,
    onSelectWinner: (id) => setSelectedWinnerId(id),
    onConfirm: handleConfirm,
    onClose,
    onSkip,
    onUndo,
    onOpenCompare: () => setIsCompareOpen(true),
  });

  // Swipe-to-vote gesture tracking
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || isConfirming) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    // Must be a quick, primarily horizontal swipe with enough distance
    if (dt > 500 || Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;

    // Swipe left = select left participant, swipe right = select right participant
    const participant = dx < 0 ? matchup.participant1 : matchup.participant2;
    if (participant) {
      setSelectedWinnerId(participant.id);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(20);
      }
    }
  }, [matchup.participant1, matchup.participant2, isConfirming]);

  if (!matchup.participant1 || !matchup.participant2) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-modal flex flex-col backdrop-blur-xl"
      style={{
        background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
      }}
    >
      {/* Voting History - top strip */}
      <VotingHistoryStrip bracket={bracket} completedVotes={completedVotes} onRevote={onRevote} />

      {/* Header */}
      <div className="shrink-0 relative px-4 py-1.5 border-b border-slate-800/50">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          {/* Back & Undo buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              aria-label="Close matchup screen"
              className="p-2 -ml-2 rounded-card hover:bg-slate-800/50 transition-colors focus-ring"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>

            {canUndo && onUndo && (
              <button
                onClick={onUndo}
                aria-label="Undo last vote"
                title="Undo last vote (Ctrl+Z)"
                className="p-2 rounded-card hover:bg-slate-800/50 transition-colors text-slate-400 hover:text-amber-400 focus-ring"
              >
                <Undo2 className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => setIsCompareOpen(true)}
              aria-label="Compare items side-by-side"
              title="Compare items (C)"
              className="p-2 rounded-card hover:bg-slate-800/50 transition-colors text-slate-400 hover:text-brand-hover focus-ring"
            >
              <Scale className="w-5 h-5" />
            </button>
          </div>

          {/* Round info */}
          <div className="text-center">
            <div className="text-brand-hover text-sm font-semibold font-grotesk uppercase tracking-wider">
              {roundName}
            </div>
            <div className="text-slate-500 text-2xs sm:text-xs">
              Match {matchNumber} / {totalMatchesInRound}
            </div>
          </div>

          {/* Skip button (if available) */}
          <div className="w-9">
            {onSkip && (
              <button
                onClick={onSkip}
                aria-label="Skip to next matchup"
                className="p-2 rounded-card hover:bg-slate-800/50 transition-colors text-slate-500 hover:text-slate-300 focus-ring"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main matchup area - with swipe-to-vote on mobile */}
      <div
        className="flex-1 flex items-center justify-center px-3 sm:px-6 py-1 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
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
      <div className="shrink-0 px-4 py-1.5 border-t border-slate-800/50 bg-slate-900/50">
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
                  className="flex-1 px-4 py-2.5 rounded-card bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium transition-colors disabled:opacity-50 text-sm focus-ring"
                >
                  Change
                </button>

                <button
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  aria-label={isConfirming ? 'Advancing winner...' : 'Confirm selected winner'}
                  aria-busy={isConfirming}
                  className="flex-2 px-6 py-2.5 rounded-card bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-500/30 text-sm sm:text-base focus-ring"
                >
                  {isConfirming ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: DURATION.slow, repeat: Infinity, ease: 'linear' }}
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
                <span>{dims.isMobile ? 'Tap or swipe to select the winner' : 'Tap a card to select the winner'}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Keyboard hints - desktop only */}
        {dims.isDesktop && (
          <div className="mt-1.5 flex items-center justify-center gap-4 text-2xs text-slate-600">
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
            {canUndo && (
              <span>
                <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-500">Ctrl+Z</kbd> undo
              </span>
            )}
            <span>
              <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-500">C</kbd> compare
            </span>
          </div>
        )}
      </div>

      {/* Comparison Modal */}
      <ComparisonModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        items={comparisonItems}
      />
    </motion.div>
  );
}
