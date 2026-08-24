"use client";

import { Zap, Target, TrendingDown } from 'lucide-react';

import { TournamentAnalytics, getLoserFromMatchup, getParticipantTitle } from '../../lib/bracketGenerator';

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  sublabel: string;
  color: string;
}) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-card p-3 text-center">
      <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
      <p className="text-lg font-bold font-grotesk text-white">
        {value}
      </p>
      <p className="text-2xs text-slate-400 font-medium">{label}</p>
      <p className="text-2xs text-slate-500 mt-0.5">{sublabel}</p>
    </div>
  );
}

export function StatsTab({ analytics }: { analytics: TournamentAnalytics }) {
  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={Target}
          label="Seed Accuracy"
          value={`${analytics.seedAccuracyScore}%`}
          sublabel={`${analytics.higherSeedWins}/${analytics.totalVotedMatchups} favored`}
          color="text-cyan-400"
        />
        <StatCard
          icon={Zap}
          label="Upsets"
          value={String(analytics.upsets.length)}
          sublabel={analytics.upsets.length > 0 ? `Biggest: ${analytics.upsets[0].seedDiff} seed gap` : 'No upsets'}
          color="text-amber-400"
        />
      </div>

      {/* Upsets section */}
      {analytics.upsets.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-wide text-slate-500 font-medium mb-2 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400" />
            Upset Highlights
          </h4>
          <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
            {analytics.upsets.slice(0, 5).map((upset, i) => {
              const winnerName = getParticipantTitle(upset.matchup.winner);
              const loser = getLoserFromMatchup(upset.matchup);
              const loserName = getParticipantTitle(loser);

              return (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-control bg-amber-500/10 border border-amber-500/20 text-xs"
                >
                  <span className="text-amber-400 font-bold shrink-0">
                    #{upset.winnerSeed}
                  </span>
                  <span className="text-slate-300 truncate">{winnerName}</span>
                  <span className="text-slate-600 shrink-0">beat</span>
                  <span className="text-slate-400 font-bold shrink-0">
                    #{upset.loserSeed}
                  </span>
                  <span className="text-slate-400 truncate">{loserName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Closest matchups */}
      {analytics.closestMatchups.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-wide text-slate-500 font-medium mb-2 flex items-center gap-1.5">
            <TrendingDown className="w-3 h-3 text-cyan-400" />
            Closest Matchups
          </h4>
          <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
            {analytics.closestMatchups.slice(0, 5).map((closest, i) => {
              const p1Name = getParticipantTitle(closest.matchup.participant1, '?');
              const p2Name = getParticipantTitle(closest.matchup.participant2, '?');

              return (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-control bg-cyan-500/10 border border-cyan-500/20 text-xs"
                >
                  <span className="text-slate-300 truncate flex-1 text-right">
                    {p1Name}
                  </span>
                  <span className="text-cyan-400 font-bold text-2xs shrink-0">
                    VS
                  </span>
                  <span className="text-slate-300 truncate flex-1">
                    {p2Name}
                  </span>
                  <span className="text-slate-600 text-2xs shrink-0">
                    {closest.roundName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
