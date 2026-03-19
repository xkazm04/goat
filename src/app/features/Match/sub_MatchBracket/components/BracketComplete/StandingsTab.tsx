"use client";

import { motion } from 'framer-motion';
import { useMemo } from 'react';

import { getRankStyle } from './rankStyles';
import { BracketParticipant, BracketState, computeRankingTies } from '../../lib/bracketGenerator';

interface StandingsTabProps {
  ranking: BracketParticipant[];
  bracket: BracketState;
}

export function StandingsTab({ ranking, bracket }: StandingsTabProps) {
  const ties = useMemo(() => computeRankingTies(bracket), [bracket]);

  return (
    <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
      {ranking.map((participant, index) => {
        const tieInfo = ties[index];
        const displayRank = tieInfo?.displayRank ?? index + 1;
        const isTied = tieInfo?.isTied ?? false;
        const style = getRankStyle(displayRank);
        const title = participant.item?.title || participant.item?.name || 'Unknown';

        return (
          <motion.div
            key={participant.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-card border ${style.bg} ${style.border}`}
          >
            {/* Rank badge */}
            <div
              className={`${isTied ? 'w-8' : 'w-7'} h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${style.text} ${displayRank <= 3 ? 'ring-1 ring-current/30' : ''}`}
              title={isTied ? `Tied at rank ${displayRank} (bracket did not compare these participants)` : undefined}
            >
              {isTied ? `T-${displayRank}` : displayRank}
            </div>

            {/* Item image */}
            {participant.item?.image_url ? (
              <img
                src={participant.item.image_url}
                alt={title}
                className="w-8 h-8 rounded object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded bg-slate-700 shrink-0" />
            )}

            {/* Name + seed */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${displayRank <= 3 ? style.text : 'text-slate-200'}`}>
                {title}
              </p>
            </div>

            {/* Seed indicator */}
            <span className="text-2xs text-slate-500 shrink-0">
              #{participant.seed} seed
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
