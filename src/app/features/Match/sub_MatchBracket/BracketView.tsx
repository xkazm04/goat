"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Play, AlertTriangle } from 'lucide-react';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { BracketDrawingLoader } from '@/components/illustrations/BracketDrawingLoader';
import { GlassModal, GlassModalBody } from '@/components/ui/glass-modal';
import { DURATION } from '@/lib/animations/motion-presets';
import { useRankingStore } from '@/stores/ranking-store';
import { BacklogItem } from '@/types/backlog-groups';
import { GridItemType } from '@/types/match';

import {
  BracketSetup,
  BracketComplete,
  BracketVisualization,
  MatchupScreen,
} from './components';
import {
  BracketMatchup,
  BracketSize,
  deriveBracketData,
  bracketToRanking,
  getBracketSizeForItems,
  findMatchupById,
  SeedingStrategy,
  seedParticipants,
  generateSeedOrder,
} from './lib';



interface BracketViewProps {
  gridItems: GridItemType[];
  backlogItems: BacklogItem[];
  onRankingComplete: (ranking: BacklogItem[]) => void;
  listSize: number;
  onCancel?: () => void;
}

type BracketPhase = 'setup' | 'playing' | 'complete';

/**
 * Progress bar for bracket completion with round milestone markers
 */
function BracketProgress({
  stats,
  currentRoundName,
}: {
  stats: ReturnType<typeof deriveBracketData>['stats'];
  currentRoundName: string;
}) {
  const [hoveredMilestone, setHoveredMilestone] = useState<number | null>(null);

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-card p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium font-grotesk text-slate-300">{currentRoundName}</span>
        <span className="text-2xs text-slate-400">
          {stats.completedMatchups} / {stats.totalMatchups}
        </span>
      </div>
      <div className="relative h-3 flex items-center">
        {/* Track */}
        <div className="absolute inset-x-0 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-linear-to-r from-brand to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${stats.progressPercentage}%` }}
            transition={{ duration: DURATION.normal }}
          />
        </div>

        {/* Round milestone markers (skip the last one at 100%) */}
        {stats.roundMilestones.slice(0, -1).map((milestone, i) => (
          <div
            key={i}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 group"
            style={{ left: `${milestone.percentage}%` }}
            onMouseEnter={() => setHoveredMilestone(i)}
            onMouseLeave={() => setHoveredMilestone(null)}
          >
            {/* Marker dot */}
            <div
              className={`w-2 h-2 rounded-full border transition-colors ${
                milestone.completed
                  ? 'bg-brand border-brand/80'
                  : 'bg-slate-600 border-slate-500'
              }`}
            />

            {/* Tooltip on hover */}
            <AnimatePresence>
              {hoveredMilestone === i && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-2xs text-slate-300 whitespace-nowrap pointer-events-none"
                >
                  {milestone.name}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
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
  listSize: _listSize,
  onCancel,
}: BracketViewProps) {
  // User-configurable bracket settings
  const [bracketSize, setBracketSize] = useState<BracketSize>(() => getBracketSizeForItems(backlogItems.length));
  const [seedingStrategy, setSeedingStrategy] = useState<SeedingStrategy>('random');

  // Voting overlay state - this controls whether the MatchupScreen overlay is shown
  const [isVotingActive, setIsVotingActive] = useState(false);
  const [currentMatchup, setCurrentMatchup] = useState<BracketMatchup | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const initTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connect to ranking store for bracket state
  // Grouped into 2 selectors: reactive state (re-renders on change) and stable actions
  const { bracketState: storeBracketState, bracketUndoStack } = useRankingStore(
    useShallow((state) => ({
      bracketState: state.bracketState,
      bracketUndoStack: state.bracketUndoStack,
    }))
  );
  const {
    initializeBracket: storeInitializeBracket,
    recordMatchup: storeRecordMatchup,
    undoBracketMatchup: storeUndoBracketMatchup,
    revoteBracketMatchup: storeRevoteBracketMatchup,
    applyBracketToRanking: storeApplyBracketToRanking,
    resetBracket: storeResetBracket,
  } = useRankingStore(
    useShallow((state) => ({
      initializeBracket: state.initializeBracket,
      recordMatchup: state.recordMatchup,
      undoBracketMatchup: state.undoBracketMatchup,
      revoteBracketMatchup: state.revoteBracketMatchup,
      applyBracketToRanking: state.applyBracketToRanking,
      resetBracket: state.resetBracket,
    }))
  );

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
        .filter((item) => item.context.matched && item.item?.id)
        .map((item) => item.item!.id)
    );
    return backlogItems.filter((item) => !usedIds.has(item.id));
  }, [gridItems, backlogItems]);

  // Compute preview matchup pairs using actual seeding logic
  const previewMatchups = useMemo(() => {
    if (availableItems.length < 2) return [];
    const participants = seedParticipants(
      availableItems as unknown as import('@/types/match').BacklogItemType[],
      bracketSize,
      { strategy: seedingStrategy }
    );
    const seedOrder = generateSeedOrder(bracketSize);
    const numMatchups = Math.min(4, Math.floor(bracketSize / 2));
    const pairs: { a: string; b: string }[] = [];
    for (let i = 0; i < numMatchups; i++) {
      const seed1 = seedOrder[i * 2];
      const seed2 = seedOrder[i * 2 + 1];
      const p1 = participants.find(p => p.seed === seed1);
      const p2 = participants.find(p => p.seed === seed2);
      if (p1?.item && p2?.item) {
        pairs.push({
          a: p1.item.title || p1.item.name || '',
          b: p2.item.title || p2.item.name || '',
        });
      }
    }
    return pairs;
  }, [availableItems, bracketSize, seedingStrategy]);

  // Derive stats, playable matchups, and completed votes in a single pass
  const derived = useMemo(() => {
    if (!bracket) return null;
    return deriveBracketData(bracket);
  }, [bracket]);

  const stats = derived?.stats ?? null;
  const playableMatchups = derived?.playableMatchups ?? [];
  const completedVotes = derived?.completedVotes ?? [];

  // Initialize bracket from setup with branded loading transition
  const handleSetupStart = useCallback(() => {
    // Guard against seeding a bracket with too few participants — seedBracket
    // throws on zero, and a throw inside the timer below would never reset the
    // loading flag, leaving the branded loader spinning forever.
    if (availableItems.length < 2) return;
    setIsInitializing(true);
    // Show bracket-drawing animation briefly before initializing
    initTimerRef.current = setTimeout(() => {
      initTimerRef.current = null;
      try {
        storeInitializeBracket(availableItems, {
          size: bracketSize,
          seedingStrategy: seedingStrategy,
        });
      } catch (err) {
        console.error('Failed to initialize bracket:', err);
      } finally {
        setIsInitializing(false);
      }
    }, 1500);
  }, [availableItems, bracketSize, seedingStrategy, storeInitializeBracket]);

  // Cleanup init timer on unmount to prevent state updates on unmounted component
  useEffect(() => {
    return () => {
      if (initTimerRef.current) {
        clearTimeout(initTimerRef.current);
      }
    };
  }, []);

  // On mount, detect in-progress bracket and auto-resume voting
  const [hasAutoResumed, setHasAutoResumed] = useState(false);
  useEffect(() => {
    if (hasAutoResumed) return;
    if (!bracket || bracket.isComplete || !stats) return;

    // Only auto-resume if voting had already started (has completed matchups)
    if (stats.completedMatchups > 0 && playableMatchups.length > 0) {
      setCurrentMatchup(playableMatchups[0]);
      setIsVotingActive(true);
    }
    setHasAutoResumed(true);
  }, [bracket, hasAutoResumed, stats, playableMatchups]);

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
    const freshMatchup = currentMatchupId ? findMatchupById(bracket, currentMatchupId) : null;
    const isCurrentComplete = freshMatchup?.isComplete ?? false;

    // If current matchup is now complete (or doesn't exist), advance to next
    if (isCurrentComplete || !currentMatchup) {
      if (playableMatchups.length > 0) {
        // Advance to next matchup without closing overlay
        setCurrentMatchup(playableMatchups[0]);
      } else if (bracket.isComplete) {
        // Bracket is complete, close overlay
        setIsVotingActive(false);
        setCurrentMatchup(null);
      }
    }
  }, [bracket, currentMatchup?.id, isVotingActive, phase, playableMatchups]);

  // Start voting manually
  const handleStartVoting = useCallback(() => {
    if (playableMatchups.length > 0) {
      setCurrentMatchup(playableMatchups[0]);
      setIsVotingActive(true);
    }
  }, [playableMatchups]);

  // Undo last vote - restores previous bracket state and reopens that matchup
  const handleUndo = useCallback(() => {
    const restoredMatchupId = storeUndoBracketMatchup();
    if (restoredMatchupId) {
      const updatedBracket = useRankingStore.getState().bracketState;
      if (updatedBracket) {
        const matchup = findMatchupById(updatedBracket, restoredMatchupId);
        if (matchup && !matchup.isComplete) {
          setCurrentMatchup(matchup);
          setIsVotingActive(true);
        }
      }
    }
  }, [storeUndoBracketMatchup]);

  // Revote a specific past matchup - undoes it and all downstream, reopens for voting
  const handleRevote = useCallback((matchupId: string) => {
    storeRevoteBracketMatchup(matchupId);

    const updatedBracket = useRankingStore.getState().bracketState;
    if (updatedBracket) {
      const matchup = findMatchupById(updatedBracket, matchupId);
      if (matchup && !matchup.isComplete) {
        setCurrentMatchup(matchup);
        setIsVotingActive(true);
      }
    }
  }, [storeRevoteBracketMatchup]);

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

  // Restart confirmation dialog
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  const handleRestartRequest = useCallback(() => {
    setShowRestartConfirm(true);
  }, []);

  // Reset bracket (only called after confirmation)
  const handleRestartConfirm = useCallback(() => {
    storeResetBracket();
    setIsVotingActive(false);
    setCurrentMatchup(null);
    setShowRestartConfirm(false);
  }, [storeResetBracket]);

  return (
    <div className="relative py-6">
      {/* Background glow */}
      <div className="absolute inset-0 bg-linear-to-b from-brand/5 via-blue-500/5 to-transparent blur-3xl -z-10" />

      <AnimatePresence mode="wait">
        {/* Initializing Phase - Bracket drawing animation */}
        {isInitializing && (
          <motion.div
            key="initializing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-20"
          >
            <BracketDrawingLoader className="text-center" />
          </motion.div>
        )}

        {/* Setup Phase - User selects bracket size and seeding */}
        {phase === 'setup' && !isInitializing && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-8"
          >
            <BracketSetup
              itemCount={availableItems.length}
              bracketSize={bracketSize}
              seedingStrategy={seedingStrategy}
              onBracketSizeChange={setBracketSize}
              onSeedingStrategyChange={setSeedingStrategy}
              onStart={handleSetupStart}
              onCancel={onCancel || (() => {})}
            />

            {/* Seed preview - show first round matchup pairs using actual seeding */}
            {previewMatchups.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="max-w-sm mx-auto mt-4 px-4"
              >
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-card p-3">
                  <p className="text-2xs uppercase tracking-wide text-slate-500 font-medium mb-2">
                    Preview: First {previewMatchups.length} matchups
                    {seedingStrategy === 'random' && (
                      <span className="text-slate-600 normal-case"> (randomized on start)</span>
                    )}
                  </p>
                  <div className="space-y-1">
                    {previewMatchups.map((pair, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-slate-300 truncate flex-1 text-right">{pair.a}</span>
                        <span className="text-slate-600 text-2xs font-bold shrink-0">VS</span>
                        <span className="text-slate-300 truncate flex-1">{pair.b}</span>
                      </div>
                    ))}
                    {Math.floor(Math.min(availableItems.length, bracketSize) / 2) > previewMatchups.length && (
                      <p className="text-2xs text-slate-600 text-center">
                        +{Math.floor(Math.min(availableItems.length, bracketSize) / 2) - previewMatchups.length} more
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
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
                      className="flex items-center gap-2 px-3 py-2 rounded-card bg-brand-muted hover:bg-brand text-white font-medium transition-colors text-sm"
                    >
                      <Play className="w-4 h-4" />
                      {stats.completedMatchups > 0 ? `Resume (${stats.remainingMatchups} left)` : 'Start Voting'}
                    </button>
                  )}

                  {/* Voting indicator */}
                  {isVotingActive && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-card bg-green-600/20 border border-green-500/30 text-green-400 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Voting...
                    </div>
                  )}

                  <button
                    onClick={handleRestartRequest}
                    className="p-2 rounded-card bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                    title="Restart"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bracket visualization */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-container mx-4">
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
            onRestart={handleRestartRequest}
          />
        )}
      </AnimatePresence>

      {/* Restart Confirmation Dialog */}
      <GlassModal
        open={showRestartConfirm}
        onClose={() => setShowRestartConfirm(false)}
        size="sm:w-[400px]"
      >
        <GlassModalBody>
          <div className="text-center py-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Restart Tournament?</h3>
            <p className="text-sm text-slate-400 mb-6">
              {stats && stats.completedMatchups > 0
                ? `You have ${stats.completedMatchups} completed vote${stats.completedMatchups !== 1 ? 's' : ''}. All progress will be lost.`
                : 'This will reset the entire bracket.'}
            </p>
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={() => setShowRestartConfirm(false)}
                className="px-4 py-2 rounded-card text-sm font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestartConfirm}
                className="px-4 py-2 rounded-card text-sm font-medium bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-colors"
              >
                Restart
              </button>
            </div>
          </div>
        </GlassModalBody>
      </GlassModal>

      {/* MatchupScreen Overlay - renders on top of everything when voting is active */}
      <AnimatePresence>
        {isVotingActive && currentMatchup && bracket && (
          <MatchupScreen
            key={`matchup-${currentMatchup.id ?? `${currentMatchup.participant1?.id}-${currentMatchup.participant2?.id}`}`}
            matchup={currentMatchup}
            bracket={bracket}
            completedVotes={completedVotes}
            onSelectWinner={handleSelectWinner}
            onClose={handleExitVoting}
            onUndo={handleUndo}
            onRevote={handleRevote}
            canUndo={bracketUndoStack.length > 0}
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
