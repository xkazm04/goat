"use client";

import { useMemo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  BracketState,
  BracketMatchup,
  BracketParticipant,
  BracketRound,
} from '../../lib/bracketGenerator';

interface BracketVisualizationProps {
  bracket: BracketState;
  onMatchupClick: (matchup: BracketMatchup) => void;
  selectedMatchupId?: string;
}

// Layout constants
const MATCHUP_WIDTH = 180;
const MATCHUP_HEIGHT = 72;
const MATCHUP_VERTICAL_GAP = 16;
const ROUND_HORIZONTAL_GAP = 80;
const CONNECTOR_LINE_LENGTH = 40;

// Colors
const COLORS = {
  connector: 'rgb(71, 85, 105)',
  connectorActive: 'rgb(34, 211, 238)',
  matchupBg: 'rgba(30, 41, 59, 0.8)',
  matchupBgHover: 'rgba(51, 65, 85, 0.9)',
  matchupBgActive: 'rgba(8, 145, 178, 0.2)',
  matchupBorder: 'rgba(71, 85, 105, 0.5)',
  matchupBorderActive: 'rgba(34, 211, 238, 0.6)',
  winner: 'rgb(34, 197, 94)',
  winnerBg: 'rgba(34, 197, 94, 0.1)',
  bye: 'rgba(100, 116, 139, 0.5)',
  seed: 'rgb(148, 163, 184)',
  text: 'rgb(226, 232, 240)',
  textMuted: 'rgb(148, 163, 184)',
};

/**
 * Single participant slot in a matchup
 */
function ParticipantSlot({
  participant,
  isWinner,
  position,
}: {
  participant: BracketParticipant | null;
  isWinner: boolean;
  position: 'top' | 'bottom';
}) {
  if (!participant) {
    return (
      <div className="h-8 flex items-center px-2 bg-slate-900/30 rounded">
        <span className="text-xs text-slate-600 italic">TBD</span>
      </div>
    );
  }

  if (participant.isBye) {
    return (
      <div className="h-8 flex items-center px-2 bg-slate-800/20 rounded border border-dashed border-slate-700/30">
        <span className="text-xs text-slate-500 italic">BYE</span>
      </div>
    );
  }

  const title = participant.item?.title || participant.item?.name || 'Unknown';

  return (
    <div
      className={`h-8 flex items-center gap-2 px-2 rounded transition-all duration-200 ${
        isWinner
          ? 'bg-green-500/10 border border-green-500/30'
          : 'bg-slate-800/40 border border-slate-700/30'
      }`}
    >
      {/* Seed number */}
      <span
        className="text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded bg-slate-700/50"
        style={{ color: COLORS.seed }}
      >
        {participant.seed}
      </span>

      {/* Item image (small thumbnail) */}
      {participant.item?.image_url && (
        <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0">
          <img
            src={participant.item.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Title */}
      <span
        className={`text-xs truncate flex-1 ${
          isWinner ? 'text-green-300 font-medium' : 'text-slate-300'
        }`}
      >
        {title}
      </span>

      {/* Winner indicator */}
      {isWinner && (
        <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-1.5 h-1.5 bg-white rounded-full"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Single matchup card
 */
function MatchupCard({
  matchup,
  onClick,
  isSelected,
  isPlayable,
}: {
  matchup: BracketMatchup;
  onClick: () => void;
  isSelected: boolean;
  isPlayable: boolean;
}) {
  const canClick = isPlayable && !matchup.isComplete;

  return (
    <motion.div
      onClick={canClick ? onClick : undefined}
      whileHover={canClick ? { scale: 1.02 } : {}}
      whileTap={canClick ? { scale: 0.98 } : {}}
      className={`
        rounded-lg p-1.5 transition-all duration-200
        ${canClick ? 'cursor-pointer' : 'cursor-default'}
        ${isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900' : ''}
      `}
      style={{
        width: MATCHUP_WIDTH,
        backgroundColor: isSelected ? COLORS.matchupBgActive : COLORS.matchupBg,
        border: `1px solid ${isSelected ? COLORS.matchupBorderActive : COLORS.matchupBorder}`,
      }}
    >
      {/* Top participant */}
      <ParticipantSlot
        participant={matchup.participant1}
        isWinner={matchup.winner?.id === matchup.participant1?.id}
        position="top"
      />

      {/* VS divider */}
      <div className="flex items-center justify-center h-4 my-0.5">
        <div className="flex-1 h-px bg-slate-700/50" />
        <span className="px-2 text-[10px] font-bold text-slate-500">VS</span>
        <div className="flex-1 h-px bg-slate-700/50" />
      </div>

      {/* Bottom participant */}
      <ParticipantSlot
        participant={matchup.participant2}
        isWinner={matchup.winner?.id === matchup.participant2?.id}
        position="bottom"
      />

      {/* Playable indicator */}
      {canClick && (
        <motion.div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

/**
 * Round header
 */
function RoundHeader({ round, isCurrent }: { round: BracketRound; isCurrent: boolean }) {
  return (
    <div className="text-center mb-4">
      <h3
        className={`text-sm font-bold ${
          isCurrent ? 'text-cyan-400' : 'text-slate-400'
        }`}
      >
        {round.name}
      </h3>
      <div
        className={`text-xs mt-1 ${
          round.isComplete ? 'text-green-400' : 'text-slate-500'
        }`}
      >
        {round.isComplete ? 'Complete' : `${round.matchups.filter(m => m.isComplete).length}/${round.matchups.length}`}
      </div>
    </div>
  );
}

/**
 * Champion display
 */
function ChampionDisplay({ champion }: { champion: BracketParticipant }) {
  const title = champion.item?.title || champion.item?.name || 'Champion';

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
      className="flex flex-col items-center justify-center p-4"
    >
      {/* Trophy */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="relative mb-4"
      >
        <Trophy className="w-16 h-16 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" />
        <motion.div
          className="absolute -inset-4 rounded-full"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            background: 'radial-gradient(circle, rgba(250,204,21,0.3) 0%, transparent 70%)',
          }}
        />
      </motion.div>

      {/* Champion label */}
      <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-2">
        Champion
      </div>

      {/* Champion image */}
      {champion.item?.image_url && (
        <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-yellow-400/50 shadow-lg shadow-yellow-400/20 mb-3">
          <img
            src={champion.item.image_url}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Champion name */}
      <div className="text-lg font-bold text-white text-center max-w-[200px]">
        {title}
      </div>

      {/* Seed badge */}
      <div className="mt-2 px-2 py-0.5 rounded bg-yellow-400/20 text-yellow-300 text-xs font-medium">
        #{champion.seed} Seed
      </div>
    </motion.div>
  );
}

/**
 * SVG connector lines between matchups
 */
function BracketConnectors({
  bracket,
  roundX,
}: {
  bracket: BracketState;
  roundX: number[];
}) {
  const paths: React.ReactNode[] = [];

  for (let r = 0; r < bracket.rounds.length - 1; r++) {
    const currentRound = bracket.rounds[r];
    const nextRound = bracket.rounds[r + 1];

    for (let m = 0; m < currentRound.matchups.length; m++) {
      const matchup = currentRound.matchups[m];
      if (!matchup.nextMatchupId) continue;

      const nextMatchup = nextRound.matchups.find(nm => nm.id === matchup.nextMatchupId);
      if (!nextMatchup) continue;

      // Calculate positions
      const matchupsInCurrentRound = currentRound.matchups.length;
      const matchupsInNextRound = nextRound.matchups.length;

      const currentMatchupY = calculateMatchupY(m, matchupsInCurrentRound, bracket.size);
      const nextMatchupIndex = nextRound.matchups.indexOf(nextMatchup);
      const nextMatchupY = calculateMatchupY(nextMatchupIndex, matchupsInNextRound, bracket.size);

      const x1 = roundX[r] + MATCHUP_WIDTH;
      const y1 = currentMatchupY + MATCHUP_HEIGHT / 2;
      const x2 = roundX[r + 1];
      const y2 = nextMatchupY + MATCHUP_HEIGHT / 2 + (matchup.position === 'top' ? -MATCHUP_HEIGHT / 4 : MATCHUP_HEIGHT / 4);

      const isWinnerPath = matchup.winner && nextMatchup.participant1?.id === matchup.winner.id || nextMatchup.participant2?.id === matchup.winner?.id;

      // Draw path
      const midX = (x1 + x2) / 2;
      const path = `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;

      paths.push(
        <motion.path
          key={`connector-${matchup.id}`}
          d={path}
          fill="none"
          stroke={isWinnerPath ? COLORS.connectorActive : COLORS.connector}
          strokeWidth={isWinnerPath ? 2 : 1.5}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: r * 0.1 }}
        />
      );
    }
  }

  return <>{paths}</>;
}

/**
 * Calculate Y position for a matchup
 */
function calculateMatchupY(matchIndex: number, matchupsInRound: number, bracketSize: number): number {
  const totalHeight = bracketSize * (MATCHUP_HEIGHT + MATCHUP_VERTICAL_GAP) / 2;
  const spacing = totalHeight / matchupsInRound;
  return matchIndex * spacing + spacing / 2 - MATCHUP_HEIGHT / 2 + 60; // +60 for header
}

/**
 * Main bracket visualization component
 */
export function BracketVisualization({
  bracket,
  onMatchupClick,
  selectedMatchupId,
}: BracketVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Calculate dimensions
  const { width, height, roundX } = useMemo(() => {
    const numRounds = bracket.rounds.length;
    const width = numRounds * (MATCHUP_WIDTH + ROUND_HORIZONTAL_GAP) + 200; // Extra for champion
    const height = bracket.size * (MATCHUP_HEIGHT + MATCHUP_VERTICAL_GAP) / 2 + 120;

    const roundX: number[] = [];
    for (let r = 0; r < numRounds; r++) {
      roundX.push(r * (MATCHUP_WIDTH + ROUND_HORIZONTAL_GAP) + 20);
    }

    return { width, height, roundX };
  }, [bracket]);

  // Scroll handlers
  const scrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // Track scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollPosition(container.scrollLeft);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = containerRef.current
    ? scrollPosition < containerRef.current.scrollWidth - containerRef.current.clientWidth - 10
    : false;

  return (
    <div className="relative w-full">
      {/* Scroll buttons */}
      <AnimatePresence>
        {canScrollLeft && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={scrollLeft}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-800/90 border border-slate-600 flex items-center justify-center hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-300" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {canScrollRight && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={scrollRight}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-800/90 border border-slate-600 flex items-center justify-center hover:bg-slate-700 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bracket container */}
      <div
        ref={containerRef}
        className="overflow-x-auto overflow-y-hidden pb-4 scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600"
        style={{ maxHeight: height + 40 }}
      >
        <div className="relative" style={{ width, height, minWidth: width }}>
          {/* SVG for connector lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={width}
            height={height}
          >
            <BracketConnectors bracket={bracket} roundX={roundX} />
          </svg>

          {/* Rounds */}
          {bracket.rounds.map((round, roundIndex) => (
            <div
              key={round.index}
              className="absolute top-0"
              style={{ left: roundX[roundIndex] }}
            >
              {/* Round header */}
              <RoundHeader
                round={round}
                isCurrent={roundIndex === bracket.currentRoundIndex}
              />

              {/* Matchups */}
              <div className="relative">
                {round.matchups.map((matchup, matchupIndex) => {
                  const y = calculateMatchupY(matchupIndex, round.matchups.length, bracket.size);
                  const isPlayable = Boolean(
                    roundIndex === bracket.currentRoundIndex &&
                    matchup.participant1 &&
                    matchup.participant2 &&
                    !matchup.participant1.isBye &&
                    !matchup.participant2.isBye
                  );

                  return (
                    <div
                      key={matchup.id}
                      className="absolute"
                      style={{ top: y - 60 }}
                    >
                      <MatchupCard
                        matchup={matchup}
                        onClick={() => onMatchupClick(matchup)}
                        isSelected={selectedMatchupId === matchup.id}
                        isPlayable={isPlayable}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Champion display */}
          {bracket.isComplete && bracket.champion && (
            <div
              className="absolute"
              style={{
                left: roundX[roundX.length - 1] + MATCHUP_WIDTH + ROUND_HORIZONTAL_GAP,
                top: height / 2 - 100,
              }}
            >
              <ChampionDisplay champion={bracket.champion} />
            </div>
          )}
        </div>
      </div>

      {/* Gradient overlays for scroll indication */}
      <div
        className="absolute top-0 left-0 w-16 h-full pointer-events-none"
        style={{
          background: 'linear-gradient(to right, rgba(15,23,42,0.9) 0%, transparent 100%)',
          opacity: canScrollLeft ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      />
      <div
        className="absolute top-0 right-0 w-16 h-full pointer-events-none"
        style={{
          background: 'linear-gradient(to left, rgba(15,23,42,0.9) 0%, transparent 100%)',
          opacity: canScrollRight ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      />
    </div>
  );
}
