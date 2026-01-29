"use client";

import { useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { BracketState } from '../lib/bracketGenerator';

interface VotingHistoryStripProps {
  bracket: BracketState;
}

interface VoteResult {
  id: string;
  roundIndex: number;
  winner: {
    id: string;
    title?: string;
    image_url?: string | null;
  };
  loser: {
    id: string;
    title?: string;
    image_url?: string | null;
  };
}

/**
 * Compact vote display showing winner vs loser
 */
function VoteCard({ vote, isNew }: { vote: VoteResult; isNew: boolean }) {
  const winnerName = vote.winner.title || 'Winner';
  const loserName = vote.loser.title || 'Loser';

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, scale: 0.8, x: 20 } : false}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      className="flex-shrink-0 flex items-center gap-px rounded-lg overflow-hidden bg-slate-800/40 border border-slate-700/30"
      role="listitem"
      aria-label={`${winnerName} beat ${loserName}`}
    >
      {/* Winner */}
      <div className="relative w-9 h-9 sm:w-10 sm:h-10">
        {vote.winner.image_url ? (
          <img
            src={vote.winner.image_url}
            alt={`${winnerName} (winner)`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-400 font-bold" aria-label={winnerName}>
            {vote.winner.title?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
        {/* Winner indicator */}
        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center border border-slate-900" aria-hidden="true">
          <Check className="w-2 h-2 text-white stroke-[3]" />
        </div>
      </div>

      {/* Loser - grayed with X */}
      <div className="relative w-9 h-9 sm:w-10 sm:h-10">
        {vote.loser.image_url ? (
          <img
            src={vote.loser.image_url}
            alt={`${loserName} (eliminated)`}
            className="w-full h-full object-cover grayscale opacity-40"
          />
        ) : (
          <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-700 font-bold" aria-label={loserName}>
            {vote.loser.title?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
        {/* Loser X overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30" aria-hidden="true">
          <X className="w-4 h-4 text-red-500/80 stroke-[2.5]" />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Horizontal scrolling strip showing voting history
 * Displays at the top of the matchup screen
 */
export function VotingHistoryStrip({ bracket }: VotingHistoryStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // Collect all completed matchups
  const completedVotes = useMemo(() => {
    const results: VoteResult[] = [];

    for (const round of bracket.rounds) {
      for (const matchup of round.matchups) {
        if (
          matchup.isComplete &&
          matchup.winner &&
          matchup.participant1 &&
          matchup.participant2 &&
          !matchup.participant1.isBye &&
          !matchup.participant2.isBye
        ) {
          const loser =
            matchup.winner.id === matchup.participant1.id
              ? matchup.participant2
              : matchup.participant1;

          results.push({
            id: matchup.id,
            roundIndex: matchup.roundIndex,
            winner: {
              id: matchup.winner.id,
              title: matchup.winner.item?.title || matchup.winner.item?.name,
              image_url: matchup.winner.item?.image_url,
            },
            loser: {
              id: loser.id,
              title: loser.item?.title || loser.item?.name,
              image_url: loser.item?.image_url,
            },
          });
        }
      }
    }

    return results;
  }, [bracket]);

  // Auto-scroll to end when new vote is added
  useEffect(() => {
    if (completedVotes.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: 'smooth',
      });
    }
    prevCountRef.current = completedVotes.length;
  }, [completedVotes.length]);

  // Don't render if no completed matchups
  if (completedVotes.length === 0) {
    return (
      <div className="flex-shrink-0 h-12 sm:h-14 bg-slate-900/60 border-b border-slate-800/50 flex items-center justify-center">
        <span className="text-[10px] sm:text-xs text-slate-600 uppercase tracking-wide">
          Your voting history will appear here
        </span>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 bg-slate-900/60 border-b border-slate-800/50">
      <div className="flex items-center h-12 sm:h-14">
        {/* Label */}
        <div className="flex-shrink-0 px-3 sm:px-4 border-r border-slate-800/50 h-full flex items-center">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-500 tracking-wide">
            History
          </span>
          <span className="ml-1.5 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            {completedVotes.length}
          </span>
        </div>

        {/* Scrollable history */}
        <div
          ref={scrollRef}
          role="list"
          aria-label={`Voting history: ${completedVotes.length} completed matchups`}
          className="flex-1 overflow-x-auto scrollbar-none flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3"
        >
          <AnimatePresence mode="popLayout">
            {completedVotes.map((vote, index) => (
              <VoteCard
                key={vote.id}
                vote={vote}
                isNew={index === completedVotes.length - 1}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default VotingHistoryStrip;
