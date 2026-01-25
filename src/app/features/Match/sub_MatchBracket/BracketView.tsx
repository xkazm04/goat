"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Play, Pause } from 'lucide-react';
import { GridItemType } from '@/types/match';
import { BacklogItem } from '@/types/backlog-groups';
import {
  BracketState,
  BracketMatchup,
  BracketSize,
  getPlayableMatchups,
  getBracketStats,
  bracketToRanking,
  getBracketSizeForItems,
  SeedingStrategy,
} from './lib';
import {
  BracketSetup,
  BracketComplete,
  BracketVisualization,
  MatchupScreen,
} from './components';
import { useRankingStore } from '@/stores/ranking-store';

interface BracketViewProps {
  gridItems: GridItemType[];
  backlogItems: BacklogItem[];
  onRankingComplete: (ranking: BacklogItem[]) => void;
  listSize: number;
  onCancel?: () => void;
}

type BracketPhase = 'setup' | 'playing' | 'complete';

/**
 * Progress bar for bracket completion
 */
function BracketProgress({
  stats,
  currentRoundName,
}: {
  stats: ReturnType<typeof getBracketStats>;
  currentRoundName: string;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-300">{currentRoundName}</span>
        <span className="text-[10px] text-slate-400">
          {stats.completedMatchups} / {stats.totalMatchups}
        </span>
      </div>
      <div className="relative h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${stats.progressPercentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

/**
 * Main Bracket View - Tournament-style ranking
 *
 * Flow:
 * 1. Setup phase - Configure bracket size and seeding
 * 2. Playing phase - BracketVisualization as base, MatchupScreen as overlay
 * 3. Complete phase - View results and apply ranking
 *
 * MatchupScreen is a persistent overlay that:
 * - Opens when user clicks "Start Voting" or clicks a matchup
 * - Stays open during matchup transitions (no blinking)
 * - Closes only when user manually exits OR bracket completes
 */
export function BracketView({
  gridItems,
  backlogItems,
  onRankingComplete,
  listSize,
  onCancel,
}: BracketViewProps) {
  // Local UI state
  const [bracketSize, setBracketSize] = useState<BracketSize>(
    getBracketSizeForItems(backlogItems.length)
  );
  const [seedingStrategy, setSeedingStrategy] = useState<SeedingStrategy>('random');

  // Voting overlay state - this controls whether the MatchupScreen overlay is shown
  const [isVotingActive, setIsVotingActive] = useState(false);
  const [currentMatchup, setCurrentMatchup] = useState<BracketMatchup | null>(null);

  // Connect to ranking store for bracket state
  const storeBracketState = useRankingStore((state) => state.bracketState);
  const storeInitializeBracket = useRankingStore((state) => state.initializeBracket);
  const storeRecordMatchup = useRankingStore((state) => state.recordMatchup);
  const storeApplyBracketToRanking = useRankingStore((state) => state.applyBracketToRanking);
  const storeResetBracket = useRankingStore((state) => state.resetBracket);

  const bracket = storeBracketState;

  // Determine phase from bracket state
  const phase = useMemo((): BracketPhase => {
    if (!bracket) return 'setup';
    if (bracket.isComplete) return 'complete';
    return 'playing';
  }, [bracket]);

  // Get available items (from backlog, not already in grid)
  const availableItems = useMemo(() => {
    const usedIds = new Set(
      gridItems
        .filter((item) => item.matched && item.backlogItemId)
        .map((item) => item.backlogItemId)
    );
    return backlogItems.filter((item) => !usedIds.has(item.id));
  }, [gridItems, backlogItems]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!bracket) return null;
    return getBracketStats(bracket);
  }, [bracket]);

  // Get playable matchups
  const playableMatchups = useMemo(() => {
    if (!bracket) return [];
    return getPlayableMatchups(bracket);
  }, [bracket]);

  // Initialize bracket and start voting immediately
  const initializeBracket = useCallback(() => {
    storeInitializeBracket(availableItems, {
      size: bracketSize,
      seedingStrategy: seedingStrategy,
    });
  }, [availableItems, bracketSize, seedingStrategy, storeInitializeBracket]);

  // When bracket completes, close voting overlay
  useEffect(() => {
    if (phase === 'complete') {
      setIsVotingActive(false);
      setCurrentMatchup(null);
    }
  }, [phase]);

  // Handle matchup click from visualization
  const handleMatchupClick = useCallback((matchup: BracketMatchup) => {
    if (matchup.isComplete) return;
    if (!matchup.participant1 || !matchup.participant2) return;
    if (matchup.participant1.isBye || matchup.participant2.isBye) return;

    setCurrentMatchup(matchup);
    setIsVotingActive(true);
  }, []);

  // Handle winner selection - stays in voting overlay and advances to next
  const handleSelectWinner = useCallback(
    (winnerId: string) => {
      if (!bracket || !currentMatchup) return;

      // Record the matchup result
      storeRecordMatchup(currentMatchup.id, winnerId);

      // The bracket state will update, and we'll get new playable matchups
      // We'll handle the transition in the effect below
    },
    [bracket, currentMatchup, storeRecordMatchup]
  );

  // After recording a matchup, advance to next one (if available) without closing overlay
  useEffect(() => {
    if (!isVotingActive || !bracket || phase !== 'playing') return;

    // Look up current matchup from fresh bracket state to check if complete
    const currentMatchupId = currentMatchup?.id;
    let isCurrentComplete = false;

    if (currentMatchupId) {
      for (const round of bracket.rounds) {
        const found = round.matchups.find((m) => m.id === currentMatchupId);
        if (found) {
          isCurrentComplete = found.isComplete;
          break;
        }
      }
    }

    // If current matchup is now complete (or doesn't exist), advance to next
    if (isCurrentComplete || !currentMatchup) {
      const nextPlayable = getPlayableMatchups(bracket);

      if (nextPlayable.length > 0) {
        // Advance to next matchup without closing overlay
        setCurrentMatchup(nextPlayable[0]);
      } else if (bracket.isComplete) {
        // Bracket is complete, close overlay
        setIsVotingActive(false);
        setCurrentMatchup(null);
      }
    }
  }, [bracket, currentMatchup?.id, isVotingActive, phase]);

  // Start voting manually
  const handleStartVoting = useCallback(() => {
    if (playableMatchups.length > 0) {
      setCurrentMatchup(playableMatchups[0]);
      setIsVotingActive(true);
    }
  }, [playableMatchups]);

  // Exit voting overlay (return to bracket visualization)
  const handleExitVoting = useCallback(() => {
    setIsVotingActive(false);
    setCurrentMatchup(null);
  }, []);

  // Apply bracket results to ranking
  const handleApplyRanking = useCallback(() => {
    if (!bracket || !bracket.isComplete) return;

    storeApplyBracketToRanking();

    const ranking = bracketToRanking(bracket);
    const rankedItems = ranking
      .filter((p) => p.item)
      .map((p) => p.item as BacklogItem);

    onRankingComplete(rankedItems);
  }, [bracket, onRankingComplete, storeApplyBracketToRanking]);

  // Reset bracket
  const handleRestart = useCallback(() => {
    storeResetBracket();
    setIsVotingActive(false);
    setCurrentMatchup(null);
  }, [storeResetBracket]);

  return (
    <div className="relative py-6">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-blue-500/5 to-transparent blur-3xl -z-10" />

      <AnimatePresence mode="wait">
        {/* Setup Phase */}
        {phase === 'setup' && (
          <BracketSetup
            key="setup"
            itemCount={availableItems.length}
            bracketSize={bracketSize}
            seedingStrategy={seedingStrategy}
            onBracketSizeChange={setBracketSize}
            onSeedingStrategyChange={setSeedingStrategy}
            onStart={initializeBracket}
            onCancel={onCancel || (() => {})}
          />
        )}

        {/* Playing Phase - BracketVisualization as base */}
        {phase === 'playing' && bracket && stats && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header with progress and controls */}
            <div className="max-w-4xl mx-auto mb-4 px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 max-w-xs">
                  <BracketProgress
                    stats={stats}
                    currentRoundName={stats.currentRoundName}
                  />
                </div>

                <div className="flex items-center gap-2">
                  {/* Start/Resume voting button */}
                  {!isVotingActive && playableMatchups.length > 0 && (
                    <button
                      onClick={handleStartVoting}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors text-sm"
                    >
                      <Play className="w-4 h-4" />
                      {stats.completedMatchups > 0 ? 'Resume' : 'Start'} Voting
                    </button>
                  )}

                  {/* Voting indicator */}
                  {isVotingActive && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600/20 border border-green-500/30 text-green-400 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Voting...
                    </div>
                  )}

                  <button
                    onClick={handleRestart}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                    title="Restart"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bracket visualization */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden mx-4">
              <BracketVisualization
                bracket={bracket}
                onMatchupClick={handleMatchupClick}
                selectedMatchupId={currentMatchup?.id}
              />
            </div>
          </motion.div>
        )}

        {/* Complete Phase */}
        {phase === 'complete' && bracket && (
          <BracketComplete
            key="complete"
            bracket={bracket}
            onApplyRanking={handleApplyRanking}
            onRestart={handleRestart}
          />
        )}
      </AnimatePresence>

      {/* MatchupScreen Overlay - renders on top of everything when voting is active */}
      <AnimatePresence>
        {isVotingActive && currentMatchup && bracket && (
          <MatchupScreen
            key="matchup-overlay"
            matchup={currentMatchup}
            bracket={bracket}
            onSelectWinner={handleSelectWinner}
            onClose={handleExitVoting}
            roundName={bracket.rounds[currentMatchup.roundIndex]?.name || ''}
            matchNumber={currentMatchup.matchIndex + 1}
            totalMatchesInRound={
              bracket.rounds[currentMatchup.roundIndex]?.matchups.length || 0
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default BracketView;
