"use client";

import { useMemo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  BracketState,
  BracketMatchup,
  BracketParticipant,
  BracketRound,
} from '../lib/bracketGenerator';
import { useBracketDimensions } from '../lib/useBracketDimensions';

interface BracketVisualizationProps {
  bracket: BracketState;
  onMatchupClick: (matchup: BracketMatchup) => void;
  selectedMatchupId?: string;
}

// Colors
const COLORS = {
  connector: 'rgb(71, 85, 105)',
  connectorActive: 'rgb(34, 211, 238)',
  matchupBg: 'rgba(30, 41, 59, 0.8)',
  matchupBgActive: 'rgba(8, 145, 178, 0.2)',
  matchupBorder: 'rgba(71, 85, 105, 0.5)',
  matchupBorderActive: 'rgba(34, 211, 238, 0.6)',
  seed: 'rgb(148, 163, 184)',
};

/**
 * Single participant slot in a matchup
 */
function ParticipantSlot({
  participant,
  isWinner,
}: {
  participant: BracketParticipant | null;
  isWinner: boolean;
  position: 'top' | 'bottom';
}) {
  if (!participant) {
    return (
      <div className="h-7 flex items-center px-2 bg-slate-900/30 rounded">
        <span className="text-[10px] text-slate-600 italic">TBD</span>
      </div>
    );
  }

  if (participant.isBye) {
    return (
      <div className="h-7 flex items-center px-2 bg-slate-800/20 rounded border border-dashed border-slate-700/30">
        <span className="text-[10px] text-slate-500 italic">BYE</span>
      </div>
    );
  }

  const title = participant.item?.title || participant.item?.name || 'Unknown';

  return (
    <div
      className={`h-7 flex items-center gap-1.5 px-1.5 rounded transition-all duration-200 ${
        isWinner
          ? 'bg-green-500/10 border border-green-500/30'
          : 'bg-slate-800/40 border border-slate-700/30'
      }`}
    >
      <span
        className="text-[9px] font-bold min-w-[14px] h-3.5 flex items-center justify-center rounded bg-slate-700/50"
        style={{ color: COLORS.seed }}
      >
        {participant.seed}
      </span>

      {participant.item?.image_url && (
        <div className="w-4 h-4 rounded overflow-hidden flex-shrink-0">
          <img
            src={participant.item.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <span
        className={`text-[10px] truncate flex-1 ${
          isWinner ? 'text-green-300 font-medium' : 'text-slate-300'
        }`}
      >
        {title}
      </span>

      {isWinner && (
        <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex items-center justify-center">
          <div className="w-1 h-1 bg-white rounded-full" />
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
  width,
}: {
  matchup: BracketMatchup;
  onClick: () => void;
  isSelected: boolean;
  isPlayable: boolean;
  width: number;
}) {
  const canClick = isPlayable && !matchup.isComplete;

  return (
    <motion.div
      onClick={canClick ? onClick : undefined}
      whileHover={canClick ? { scale: 1.02 } : {}}
      whileTap={canClick ? { scale: 0.98 } : {}}
      className={`
        relative rounded-lg p-1 transition-all duration-200
        ${canClick ? 'cursor-pointer' : 'cursor-default'}
        ${isSelected ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-900' : ''}
      `}
      style={{
        width,
        backgroundColor: isSelected ? COLORS.matchupBgActive : COLORS.matchupBg,
        border: `1px solid ${isSelected ? COLORS.matchupBorderActive : COLORS.matchupBorder}`,
      }}
    >
      <ParticipantSlot
        participant={matchup.participant1}
        isWinner={matchup.winner?.id === matchup.participant1?.id}
        position="top"
      />

      <div className="flex items-center justify-center h-3 my-0.5">
        <div className="flex-1 h-px bg-slate-700/50" />
        <span className="px-1.5 text-[8px] font-bold text-slate-500">VS</span>
        <div className="flex-1 h-px bg-slate-700/50" />
      </div>

      <ParticipantSlot
        participant={matchup.participant2}
        isWinner={matchup.winner?.id === matchup.participant2?.id}
        position="bottom"
      />

      {canClick && (
        <motion.div
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyan-400"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

function RoundHeader({ round, isCurrent }: { round: BracketRound; isCurrent: boolean }) {
  return (
    <div className="text-center mb-3">
      <h3 className={`text-xs font-bold ${isCurrent ? 'text-cyan-400' : 'text-slate-400'}`}>
        {round.name}
      </h3>
      <div className={`text-[10px] mt-0.5 ${round.isComplete ? 'text-green-400' : 'text-slate-500'}`}>
        {round.isComplete ? 'Done' : `${round.matchups.filter(m => m.isComplete).length}/${round.matchups.length}`}
      </div>
    </div>
  );
}

function ChampionDisplay({ champion }: { champion: BracketParticipant }) {
  const title = champion.item?.title || champion.item?.name || 'Champion';

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
      className="flex flex-col items-center justify-center p-3"
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="relative mb-3"
      >
        <Trophy className="w-12 h-12 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
      </motion.div>

      <div className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider mb-1.5">
        Champion
      </div>

      {champion.item?.image_url && (
        <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-yellow-400/50 shadow-lg mb-2">
          <img src={champion.item.image_url} alt={title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="text-sm font-bold text-white text-center max-w-[140px]">{title}</div>
      <div className="mt-1 px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-300 text-[10px]">
        #{champion.seed}
      </div>
    </motion.div>
  );
}

function calculateMatchupY(
  matchIndex: number,
  matchupsInRound: number,
  bracketSize: number,
  matchupHeight: number,
  verticalGap: number
): number {
  const totalHeight = bracketSize * (matchupHeight + verticalGap) / 2;
  const spacing = totalHeight / matchupsInRound;
  return matchIndex * spacing + spacing / 2 - matchupHeight / 2 + 50;
}

/**
 * Bracket tree visualization with connector lines
 */
export function BracketVisualization({
  bracket,
  onMatchupClick,
  selectedMatchupId,
}: BracketVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  const dims = useBracketDimensions();
  const { matchupWidth, matchupHeight, verticalGap, roundGap } = dims;

  const { width, height, roundX } = useMemo(() => {
    const numRounds = bracket.rounds.length;
    const width = numRounds * (matchupWidth + roundGap) + 180;
    const height = bracket.size * (matchupHeight + verticalGap) / 2 + 100;

    const roundX: number[] = [];
    for (let r = 0; r < numRounds; r++) {
      roundX.push(r * (matchupWidth + roundGap) + 16);
    }

    return { width, height, roundX };
  }, [bracket, matchupWidth, matchupHeight, verticalGap, roundGap]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => setScrollPosition(container.scrollLeft);
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = containerRef.current
    ? scrollPosition < containerRef.current.scrollWidth - containerRef.current.clientWidth - 10
    : false;

  return (
    <div className="relative w-full">
      <AnimatePresence>
        {canScrollLeft && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => containerRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-800/90 border border-slate-600 flex items-center justify-center hover:bg-slate-700"
          >
            <ChevronLeft className="w-4 h-4 text-slate-300" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {canScrollRight && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => containerRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-800/90 border border-slate-600 flex items-center justify-center hover:bg-slate-700"
          >
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </motion.button>
        )}
      </AnimatePresence>

      <div
        ref={containerRef}
        className="overflow-x-auto overflow-y-hidden pb-3 scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600"
        style={{ maxHeight: height + 30 }}
      >
        <div className="relative" style={{ width, height, minWidth: width }}>
          {/* Connector lines SVG */}
          <svg className="absolute inset-0 pointer-events-none" width={width} height={height}>
            {bracket.rounds.slice(0, -1).map((round, r) => {
              const nextRound = bracket.rounds[r + 1];
              return round.matchups.map((matchup, m) => {
                if (!matchup.nextMatchupId) return null;
                const nextMatchup = nextRound.matchups.find(nm => nm.id === matchup.nextMatchupId);
                if (!nextMatchup) return null;

                const y1 = calculateMatchupY(m, round.matchups.length, bracket.size, matchupHeight, verticalGap) + matchupHeight / 2;
                const nextMatchupIndex = nextRound.matchups.indexOf(nextMatchup);
                const y2 = calculateMatchupY(nextMatchupIndex, nextRound.matchups.length, bracket.size, matchupHeight, verticalGap) + matchupHeight / 2 + (matchup.position === 'top' ? -matchupHeight / 4 : matchupHeight / 4);
                const x1 = roundX[r] + matchupWidth;
                const x2 = roundX[r + 1];
                const midX = (x1 + x2) / 2;

                const isActive = matchup.winner && (nextMatchup.participant1?.id === matchup.winner.id || nextMatchup.participant2?.id === matchup.winner?.id);

                return (
                  <motion.path
                    key={`c-${matchup.id}`}
                    d={`M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`}
                    fill="none"
                    stroke={isActive ? COLORS.connectorActive : COLORS.connector}
                    strokeWidth={isActive ? 1.5 : 1}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: r * 0.08 }}
                  />
                );
              });
            })}
          </svg>

          {/* Rounds */}
          {bracket.rounds.map((round, roundIndex) => (
            <div key={round.index} className="absolute top-0" style={{ left: roundX[roundIndex] }}>
              <RoundHeader round={round} isCurrent={roundIndex === bracket.currentRoundIndex} />
              <div className="relative">
                {round.matchups.map((matchup, matchupIndex) => {
                  const y = calculateMatchupY(matchupIndex, round.matchups.length, bracket.size, matchupHeight, verticalGap);
                  const isPlayable = roundIndex === bracket.currentRoundIndex &&
                    matchup.participant1 && matchup.participant2 &&
                    !matchup.participant1.isBye && !matchup.participant2.isBye;

                  return (
                    <div key={matchup.id} className="absolute" style={{ top: y - 50 }}>
                      <MatchupCard
                        matchup={matchup}
                        onClick={() => onMatchupClick(matchup)}
                        isSelected={selectedMatchupId === matchup.id}
                        isPlayable={!!isPlayable}
                        width={matchupWidth}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {bracket.isComplete && bracket.champion && (
            <div
              className="absolute"
              style={{ left: roundX[roundX.length - 1] + matchupWidth + roundGap, top: height / 2 - 80 }}
            >
              <ChampionDisplay champion={bracket.champion} />
            </div>
          )}
        </div>
      </div>

      {/* Gradient edges */}
      <div
        className="absolute top-0 left-0 w-12 h-full pointer-events-none"
        style={{
          background: 'linear-gradient(to right, rgba(15,23,42,0.9) 0%, transparent 100%)',
          opacity: canScrollLeft ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      />
      <div
        className="absolute top-0 right-0 w-12 h-full pointer-events-none"
        style={{
          background: 'linear-gradient(to left, rgba(15,23,42,0.9) 0%, transparent 100%)',
          opacity: canScrollRight ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      />
    </div>
  );
}
