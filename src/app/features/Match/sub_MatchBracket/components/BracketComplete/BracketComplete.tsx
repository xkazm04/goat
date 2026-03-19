"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Check, Trophy, List, BarChart3 } from 'lucide-react';
import { useState, useMemo } from 'react';

import { DURATION } from '@/lib/animations/motion-presets';

import { StandingsTab } from './StandingsTab';
import { StatsTab } from './StatsTab';
import { TrophyTab, useConfettiParticles } from './TrophyTab';
import {
  BracketState,
  bracketToRanking,
  getTournamentAnalytics,
} from '../../lib/bracketGenerator';

interface BracketCompleteProps {
  bracket: BracketState;
  onApplyRanking: () => void;
  onRestart: () => void;
}

type TabId = 'trophy' | 'standings' | 'stats';

const TABS: { id: TabId; label: string; icon: typeof Trophy }[] = [
  { id: 'trophy', label: 'Trophy', icon: Trophy },
  { id: 'standings', label: 'Standings', icon: List },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
];

/**
 * Completion screen when tournament bracket is finished.
 * Tabbed view: Trophy (champion), Standings (full ranking), Stats (analytics).
 */
export function BracketComplete({
  bracket,
  onApplyRanking,
  onRestart,
}: BracketCompleteProps) {
  const [activeTab, setActiveTab] = useState<TabId>('trophy');
  const particles = useConfettiParticles();

  const ranking = useMemo(() => bracketToRanking(bracket), [bracket]);
  const analytics = useMemo(() => getTournamentAnalytics(bracket), [bracket]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md mx-auto px-4 text-center"
    >
      <div className="bg-slate-800/80 border border-slate-700 rounded-container p-5 backdrop-blur-xs">
        {/* Tab bar */}
        <div className="flex gap-1 mb-4 bg-slate-900/60 rounded-card p-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-control text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: DURATION.quick }}
          >
            {activeTab === 'trophy' && (
              <TrophyTab bracket={bracket} particles={particles} />
            )}
            {activeTab === 'standings' && <StandingsTab ranking={ranking} bracket={bracket} />}
            {activeTab === 'stats' && <StatsTab analytics={analytics} />}
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={onRestart}
            className="flex-1 px-4 py-2.5 rounded-card bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            New Bracket
          </button>
          <button
            onClick={onApplyRanking}
            className="flex-1 px-4 py-2.5 rounded-card bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-green-500/30"
          >
            <Check className="w-4 h-4" />
            Apply
          </button>
        </div>
      </div>
    </motion.div>
  );
}
