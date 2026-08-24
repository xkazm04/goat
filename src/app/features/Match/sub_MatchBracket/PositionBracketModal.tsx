"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { Play, X } from 'lucide-react';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { BracketDrawingLoader } from '@/components/illustrations/BracketDrawingLoader';
import { DURATION } from '@/lib/animations/motion-presets';
import { useRankingStore } from '@/stores/ranking-store';
import { BacklogItem } from '@/types/backlog-groups';

import {
  BracketSetup,
  BracketVisualization,
  MatchupScreen,
} from './components';
import { PositionBracketComplete } from './components/PositionBracketComplete';
import {
  BracketMatchup,
  BracketSize,
  deriveBracketData,
  getBracketSizeForItems,
  findMatchupById,
  SeedingStrategy,
} from './lib';

interface PositionBracketModalProps {
  /** 0-based grid position this bracket will fill */
  targetPosition: number;
  /** Unused backlog items (already filtered by caller) */
  availableItems: BacklogItem[];
  /** Called when the champion is confirmed for the target position */
  onWinnerSelected: (winner: BacklogItem, position: number) => void;
  /** Called when the modal is dismissed without selecting */
  onClose: () => void;
}

type BracketPhase = 'setup' | 'playing' | 'complete';

/**
 * Position Bracket Modal
 *
 * A full-screen overlay hosting a focused bracket tournament to fill
 * a single grid position. The champion fills the position; losers
 * return to the backlog pool.
 *
 * Reuses all existing bracket sub-components (BracketSetup, BracketVisualization,
 * MatchupScreen) but reads from positionBracketSession in the ranking store
 * instead of the standalone bracketState.
 */
export function PositionBracketModal({
  targetPosition,
  availableItems,
  onWinnerSelected,
  onClose,
}: PositionBracketModalProps) {
  // Bracket settings
  const [bracketSize, setBracketSize] = useState<BracketSize>(
    () => getBracketSizeForItems(availableItems.length)
  );
  const [seedingStrategy, setSeedingStrategy] = useState<SeedingStrategy>('random');
  const [isVotingActive, setIsVotingActive] = useState(false);
  const [currentMatchup, setCurrentMatchup] = useState<BracketMatchup | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Connect to position bracket session in ranking store
  const session = useRankingStore(state => state.positionBracketSession);
  const {
    initPositionBracket,
    recordPositionMatchup,
    undoPositionMatchup,
    resetPositionBracket,
  } = useRankingStore(
    useShallow(state => ({
      initPositionBracket: state.initPositionBracket,
      recordPositionMatchup: state.recordPositionMatchup,
      undoPositionMatchup: state.undoPositionMatchup,
      resetPositionBracket: state.resetPositionBracket,
    }))
  );

  const bracket = session?.bracketState ?? null;

  // Phase derived from bracket state
  const phase = useMemo((): BracketPhase => {
    if (!bracket) return 'setup';
    if (bracket.isComplete) return 'complete';
    return 'playing';
  }, [bracket]);

  // Derived stats
  const derived = useMemo(() => {
    if (!bracket) return null;
    return deriveBracketData(bracket);
  }, [bracket]);

  const playableMatchups = derived?.playableMatchups ?? [];
  const completedVotes = derived?.completedVotes ?? [];

  // Initialize bracket
  const handleSetupStart = useCallback(() => {
    setIsInitializing(true);
    setTimeout(() => {
      initPositionBracket(availableItems, targetPosition, {
        size: bracketSize,
        seedingStrategy,
      });
      setIsInitializing(false);
    }, 1000);
  }, [availableItems, targetPosition, bracketSize, seedingStrategy, initPositionBracket]);

  // Close voting overlay when bracket completes
  useEffect(() => {
    if (phase === 'complete') {
      setIsVotingActive(false);
      setCurrentMatchup(null);
    }
  }, [phase]);

  // Auto-start voting after initialization
  useEffect(() => {
    if (phase === 'playing' && !isVotingActive && playableMatchups.length > 0 && !currentMatchup) {
      setCurrentMatchup(playableMatchups[0]);
      setIsVotingActive(true);
    }
  }, [phase, isVotingActive, playableMatchups, currentMatchup]);

  // Handle matchup click from visualization
  const handleMatchupClick = useCallback((matchup: BracketMatchup) => {
    if (matchup.isComplete || !matchup.participant1 || !matchup.participant2) return;
    if (matchup.participant1.isBye || matchup.participant2.isBye) return;
    setCurrentMatchup(matchup);
    setIsVotingActive(true);
  }, []);

  // Handle winner selection
  const handleSelectWinner = useCallback((winnerId: string) => {
    if (!bracket || !currentMatchup) return;
    recordPositionMatchup(currentMatchup.id, winnerId);
  }, [bracket, currentMatchup, recordPositionMatchup]);

  // Advance to next matchup after recording
  useEffect(() => {
    if (!isVotingActive || !bracket || phase !== 'playing') return;
    const freshMatchup = currentMatchup?.id ? findMatchupById(bracket, currentMatchup.id) : null;
    if (freshMatchup?.isComplete || !currentMatchup) {
      if (playableMatchups.length > 0) {
        setCurrentMatchup(playableMatchups[0]);
      } else if (bracket.isComplete) {
        setIsVotingActive(false);
        setCurrentMatchup(null);
      }
    }
  }, [bracket, currentMatchup?.id, isVotingActive, phase, playableMatchups]);

  // Handle undo
  const handleUndo = useCallback(() => {
    const matchupId = undoPositionMatchup();
    if (matchupId && bracket) {
      const matchup = findMatchupById(bracket, matchupId);
      if (matchup) {
        setCurrentMatchup(matchup);
        setIsVotingActive(true);
      }
    }
  }, [bracket, undoPositionMatchup]);

  // Apply champion to position
  const handleApply = useCallback(() => {
    if (!bracket?.champion?.item) return;
    const winner = bracket.champion.item as BacklogItem;
    onWinnerSelected(winner, targetPosition);
  }, [bracket, targetPosition, onWinnerSelected]);

  // Restart bracket
  const handleRestart = useCallback(() => {
    resetPositionBracket();
    setCurrentMatchup(null);
    setIsVotingActive(false);
  }, [resetPositionBracket]);

  // Close modal
  const handleClose = useCallback(() => {
    resetPositionBracket();
    onClose();
  }, [resetPositionBracket, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-modal bg-slate-950/95 backdrop-blur-md flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">
            Bracket for Position #{targetPosition + 1}
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {availableItems.length} candidates
          </span>
        </div>
        <button
          onClick={handleClose}
          className="p-2 rounded-control text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Setup phase */}
        {phase === 'setup' && !isInitializing && (
          <div className="flex items-center justify-center min-h-full py-8">
            <BracketSetup
              itemCount={availableItems.length}
              bracketSize={bracketSize}
              seedingStrategy={seedingStrategy}
              onBracketSizeChange={setBracketSize}
              onSeedingStrategyChange={setSeedingStrategy}
              onStart={handleSetupStart}
              onCancel={handleClose}
            />
          </div>
        )}

        {/* Initializing animation */}
        {isInitializing && (
          <div className="flex items-center justify-center min-h-full">
            <BracketDrawingLoader />
          </div>
        )}

        {/* Playing phase */}
        {phase === 'playing' && bracket && (
          <div className="relative h-full">
            <div className="p-4">
              {derived?.stats && (
                <div className="mb-4 max-w-md mx-auto">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-card p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-slate-300">
                        {derived.stats.currentRoundName}
                      </span>
                      <span className="text-2xs text-slate-400">
                        {derived.stats.completedMatchups} / {derived.stats.totalMatchups}
                      </span>
                    </div>
                    <div className="relative h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-linear-to-r from-brand to-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${derived.stats.progressPercentage}%` }}
                        transition={{ duration: DURATION.normal }}
                      />
                    </div>
                  </div>
                  {!isVotingActive && playableMatchups.length > 0 && (
                    <button
                      onClick={() => {
                        setCurrentMatchup(playableMatchups[0]);
                        setIsVotingActive(true);
                      }}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand/80 text-white rounded-control font-medium text-sm transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      {derived.stats.completedMatchups > 0 ? 'Resume Voting' : 'Start Voting'}
                    </button>
                  )}
                </div>
              )}
            </div>

            <BracketVisualization
              bracket={bracket}
              onMatchupClick={handleMatchupClick}
            />
          </div>
        )}

        {/* Complete phase */}
        {phase === 'complete' && bracket && (
          <div className="flex items-center justify-center min-h-full">
            <PositionBracketComplete
              bracket={bracket}
              targetPosition={targetPosition}
              onApply={handleApply}
              onRestart={handleRestart}
              onCancel={handleClose}
            />
          </div>
        )}
      </div>

      {/* Voting overlay */}
      <AnimatePresence>
        {isVotingActive && currentMatchup && bracket && (
          <MatchupScreen
            key={`matchup-${currentMatchup.id}`}
            matchup={currentMatchup}
            onSelectWinner={handleSelectWinner}
            onClose={() => {
              setIsVotingActive(false);
              setCurrentMatchup(null);
            }}
            onUndo={session?.undoStack && session.undoStack.length > 0 ? handleUndo : undefined}
            onSkip={playableMatchups.length > 1 ? () => {
              const nextIdx = playableMatchups.findIndex(m => m.id === currentMatchup.id);
              const next = playableMatchups[(nextIdx + 1) % playableMatchups.length];
              if (next) setCurrentMatchup(next);
            } : undefined}
            completedVotes={completedVotes}
            roundName={derived?.stats?.currentRoundName ?? ''}
            matchNumber={derived?.stats ? derived.stats.completedMatchups + 1 : 1}
            totalMatches={derived?.stats?.totalMatchups ?? 0}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
