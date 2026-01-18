"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Shuffle,
  Play,
  Pause,
  RotateCcw,
  Settings2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Zap,
  Check,
  X
} from 'lucide-react';
import { GridItemType, BacklogItemType } from '@/types/match';
import { BacklogItem } from '@/types/backlog-groups';
import {
  BracketState,
  BracketMatchup,
  BracketSize,
  createEmptyBracket,
  seedBracket,
  recordMatchupResult,
  getCurrentMatchup,
  getPlayableMatchups,
  getBracketStats,
  bracketToRanking,
  getBracketSizeForItems
} from '../../lib/bracketGenerator';
import {
  SeedingStrategy,
  SeedingOptions,
  seedParticipants,
  getAvailableSeedingStrategies,
  getSeedingStrategyName
} from '../../lib/seedingEngine';
import { BracketVisualization } from './BracketVisualization';
import { MatchupScreen } from './MatchupScreen';

interface BracketViewProps {
  gridItems: GridItemType[];
  backlogItems: BacklogItem[];
  onRankingComplete: (ranking: BacklogItem[]) => void;
  listSize: number;
}

type BracketPhase = 'setup' | 'playing' | 'complete';

/**
 * Seeding strategy selector dropdown
 */
function SeedingSelector({
  strategy,
  onChange,
  disabled,
}: {
  strategy: SeedingStrategy;
  onChange: (strategy: SeedingStrategy) => void;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const strategies = getAvailableSeedingStrategies();

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          transition-all duration-200
          ${disabled
            ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600'
          }
        `}
      >
        <Settings2 className="w-4 h-4" />
        <span>Seeding: {getSeedingStrategyName(strategy)}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden"
          >
            {strategies.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onChange(s.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors
                  ${strategy === s.id ? 'bg-slate-700/50 border-l-2 border-cyan-400' : ''}
                `}
              >
                <div className="text-sm font-medium text-slate-200">{s.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{s.description}</div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Bracket size selector
 */
function BracketSizeSelector({
  size,
  onChange,
  maxSize,
  disabled,
}: {
  size: BracketSize;
  onChange: (size: BracketSize) => void;
  maxSize: number;
  disabled: boolean;
}) {
  const sizes: BracketSize[] = [8, 16, 32, 64];
  const availableSizes = sizes.filter(s => s <= Math.max(8, maxSize));

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-400">Size:</span>
      {availableSizes.map((s) => (
        <button
          key={s}
          onClick={() => !disabled && onChange(s)}
          disabled={disabled}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-200
            ${size === s
              ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300'
              : 'bg-slate-800 border border-slate-600 text-slate-400 hover:border-slate-500'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

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
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-300">
          {currentRoundName}
        </span>
        <span className="text-sm text-slate-400">
          {stats.completedMatchups} / {stats.totalMatchups} matchups
        </span>
      </div>

      <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${stats.progressPercentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex justify-between mt-2 text-xs text-slate-500">
        <span>Start</span>
        <span>Champion</span>
      </div>
    </div>
  );
}

/**
 * Round navigation buttons
 */
function RoundNavigator({
  bracket,
  onJumpToRound,
}: {
  bracket: BracketState;
  onJumpToRound: (roundIndex: number) => void;
}) {
  const currentIndex = bracket.currentRoundIndex;
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < bracket.rounds.length - 1 && bracket.rounds[currentIndex].isComplete;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onJumpToRound(currentIndex - 1)}
        disabled={!canGoBack}
        className={`
          p-2 rounded-lg transition-colors
          ${canGoBack
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            : 'bg-slate-900 text-slate-600 cursor-not-allowed'
          }
        `}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1 px-2">
        {bracket.rounds.map((round, index) => (
          <button
            key={round.index}
            onClick={() => round.isComplete && onJumpToRound(index)}
            className={`
              w-3 h-3 rounded-full transition-all duration-200
              ${index === currentIndex
                ? 'bg-cyan-400 scale-125'
                : round.isComplete
                  ? 'bg-green-500/50 hover:bg-green-500/70 cursor-pointer'
                  : 'bg-slate-600'
              }
            `}
            title={round.name}
          />
        ))}
      </div>

      <button
        onClick={() => onJumpToRound(currentIndex + 1)}
        disabled={!canGoForward}
        className={`
          p-2 rounded-lg transition-colors
          ${canGoForward
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            : 'bg-slate-900 text-slate-600 cursor-not-allowed'
          }
        `}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Setup screen before bracket starts
 */
function BracketSetup({
  itemCount,
  bracketSize,
  seedingStrategy,
  onBracketSizeChange,
  onSeedingStrategyChange,
  onStart,
  onCancel,
}: {
  itemCount: number;
  bracketSize: BracketSize;
  seedingStrategy: SeedingStrategy;
  onBracketSizeChange: (size: BracketSize) => void;
  onSeedingStrategyChange: (strategy: SeedingStrategy) => void;
  onStart: () => void;
  onCancel: () => void;
}) {
  const byeCount = Math.max(0, bracketSize - itemCount);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-md mx-auto"
    >
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-4"
          >
            <Trophy className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-xl font-bold text-white mb-1">Tournament Bracket</h2>
          <p className="text-sm text-slate-400">
            Rank your items through head-to-head matchups
          </p>
        </div>

        {/* Settings */}
        <div className="space-y-4 mb-6">
          {/* Bracket size */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Bracket Size
            </label>
            <BracketSizeSelector
              size={bracketSize}
              onChange={onBracketSizeChange}
              maxSize={itemCount}
              disabled={false}
            />
            {byeCount > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                {byeCount} bye{byeCount > 1 ? 's' : ''} will be added
              </p>
            )}
          </div>

          {/* Seeding strategy */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Seeding Strategy
            </label>
            <SeedingSelector
              strategy={seedingStrategy}
              onChange={onSeedingStrategyChange}
              disabled={false}
            />
          </div>

          {/* Info */}
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-slate-400">
                <strong className="text-slate-300">How it works:</strong> Choose between two items
                in each matchup. Winners advance until a champion is crowned. Your final ranking
                is determined by tournament performance.
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onStart}
            className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Start Tournament
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Completion screen when bracket is finished
 */
function BracketComplete({
  bracket,
  onViewRanking,
  onRestart,
}: {
  bracket: BracketState;
  onViewRanking: () => void;
  onRestart: () => void;
}) {
  const champion = bracket.champion;
  const championTitle = champion?.item?.title || champion?.item?.name || 'Champion';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto text-center"
    >
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-8 backdrop-blur-sm">
        {/* Champion trophy */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="mb-6"
        >
          <div className="relative inline-block">
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Trophy className="w-20 h-20 text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.6)]" />
            </motion.div>
            <motion.div
              className="absolute -inset-8 rounded-full"
              animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                background: 'radial-gradient(circle, rgba(250,204,21,0.3) 0%, transparent 70%)',
              }}
            />
          </div>
        </motion.div>

        {/* Champion name */}
        <h2 className="text-2xl font-black text-white mb-2">
          Tournament Complete!
        </h2>
        <p className="text-lg text-slate-300 mb-1">Your champion:</p>

        {champion?.item?.image_url && (
          <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-yellow-400/50 mx-auto mb-3">
            <img
              src={champion.item.image_url}
              alt={championTitle}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <p className="text-xl font-bold text-yellow-400 mb-6">
          {championTitle}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onRestart}
            className="flex-1 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            New Bracket
          </button>
          <button
            onClick={onViewRanking}
            className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Apply Ranking
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Main Bracket View Component
 */
export function BracketView({
  gridItems,
  backlogItems,
  onRankingComplete,
  listSize,
}: BracketViewProps) {
  // State
  const [phase, setPhase] = useState<BracketPhase>('setup');
  const [bracket, setBracket] = useState<BracketState | null>(null);
  const [selectedMatchup, setSelectedMatchup] = useState<BracketMatchup | null>(null);
  const [bracketSize, setBracketSize] = useState<BracketSize>(
    getBracketSizeForItems(backlogItems.length)
  );
  const [seedingStrategy, setSeedingStrategy] = useState<SeedingStrategy>('random');

  // Get available items (from backlog, not already in grid)
  const availableItems = useMemo(() => {
    const usedIds = new Set(
      gridItems
        .filter(item => item.matched && item.backlogItemId)
        .map(item => item.backlogItemId)
    );
    return backlogItems.filter(item => !usedIds.has(item.id));
  }, [gridItems, backlogItems]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!bracket) return null;
    return getBracketStats(bracket);
  }, [bracket]);

  // Initialize bracket
  const initializeBracket = useCallback(() => {
    const options: SeedingOptions = {
      strategy: seedingStrategy,
    };

    // Create participants from available items
    // Cast BacklogItem[] to BacklogItemType[] - BacklogItem is a superset of BacklogItemType
    const participants = seedParticipants(availableItems as BacklogItemType[], bracketSize, options);

    // Create and seed bracket
    const emptyBracket = createEmptyBracket(bracketSize);
    const seededBracket = seedBracket(emptyBracket, participants);

    setBracket(seededBracket);
    setPhase('playing');
  }, [availableItems, bracketSize, seedingStrategy]);

  // Handle matchup selection
  const handleMatchupClick = useCallback((matchup: BracketMatchup) => {
    // Only allow clicking on playable matchups
    if (matchup.isComplete) return;
    if (!matchup.participant1 || !matchup.participant2) return;
    if (matchup.participant1.isBye || matchup.participant2.isBye) return;

    setSelectedMatchup(matchup);
  }, []);

  // Handle winner selection
  const handleSelectWinner = useCallback((winnerId: string) => {
    if (!bracket || !selectedMatchup) return;

    const updatedBracket = recordMatchupResult(bracket, selectedMatchup.id, winnerId);
    setBracket(updatedBracket);
    setSelectedMatchup(null);

    // Check if bracket is complete
    if (updatedBracket.isComplete) {
      setPhase('complete');
    }
  }, [bracket, selectedMatchup]);

  // Auto-advance to next playable matchup
  useEffect(() => {
    if (phase !== 'playing' || !bracket || selectedMatchup) return;

    const playable = getPlayableMatchups(bracket);
    if (playable.length > 0 && !selectedMatchup) {
      // Small delay before showing next matchup
      const timer = setTimeout(() => {
        setSelectedMatchup(playable[0]);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [bracket, phase, selectedMatchup]);

  // Convert bracket to ranking
  const handleApplyRanking = useCallback(() => {
    if (!bracket || !bracket.isComplete) return;

    const ranking = bracketToRanking(bracket);
    // Cast items to BacklogItem (which has all required fields)
    // BacklogItemType items from bracket should be compatible since they came from backlogItems
    const rankedItems = ranking
      .filter(p => p.item)
      .map(p => p.item as BacklogItem);

    onRankingComplete(rankedItems);
  }, [bracket, onRankingComplete]);

  // Reset bracket
  const handleRestart = useCallback(() => {
    setBracket(null);
    setSelectedMatchup(null);
    setPhase('setup');
  }, []);

  // Render based on phase
  return (
    <div className="relative py-8">
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
            onCancel={() => {}} // Parent would handle this
          />
        )}

        {/* Playing Phase */}
        {phase === 'playing' && bracket && stats && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header with progress and controls */}
            <div className="max-w-5xl mx-auto mb-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Left: Round Navigator */}
                <RoundNavigator
                  bracket={bracket}
                  onJumpToRound={(index) => {
                    // Scroll to round (could be enhanced)
                  }}
                />

                {/* Center: Progress */}
                <div className="flex-1 max-w-md">
                  <BracketProgress
                    stats={stats}
                    currentRoundName={stats.currentRoundName}
                  />
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRestart}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                    title="Restart bracket"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bracket visualization */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
              <BracketVisualization
                bracket={bracket}
                onMatchupClick={handleMatchupClick}
                selectedMatchupId={selectedMatchup?.id}
              />
            </div>

            {/* Matchup screen overlay */}
            <AnimatePresence>
              {selectedMatchup && (
                <MatchupScreen
                  matchup={selectedMatchup}
                  onSelectWinner={handleSelectWinner}
                  onClose={() => setSelectedMatchup(null)}
                  roundName={bracket.rounds[selectedMatchup.roundIndex]?.name || ''}
                  matchNumber={selectedMatchup.matchIndex + 1}
                  totalMatchesInRound={bracket.rounds[selectedMatchup.roundIndex]?.matchups.length || 0}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Complete Phase */}
        {phase === 'complete' && bracket && (
          <BracketComplete
            key="complete"
            bracket={bracket}
            onViewRanking={handleApplyRanking}
            onRestart={handleRestart}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
