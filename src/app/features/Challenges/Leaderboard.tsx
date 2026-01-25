'use client';

/**
 * Leaderboard Component
 * Displays challenge rankings with animations
 */

import { motion } from 'framer-motion';
import type { LeaderboardEntry } from '@/lib/challenges/types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  showRank?: boolean;
  maxVisible?: number;
}

/**
 * Get medal emoji for top 3
 */
function getMedal(rank: number): string | null {
  switch (rank) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return null;
  }
}

/**
 * Format time taken (in seconds) to readable string
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function Leaderboard({
  entries,
  currentUserId,
  showRank = true,
  maxVisible = 10,
}: LeaderboardProps) {
  const visibleEntries = entries.slice(0, maxVisible);
  const currentUserEntry = entries.find((e) => e.userId === currentUserId);
  const currentUserNotVisible =
    currentUserEntry && visibleEntries.every((e) => e.userId !== currentUserId);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        <span>Player</span>
        <div className="flex items-center gap-6">
          <span className="w-16 text-right">Score</span>
          <span className="w-16 text-right">Time</span>
        </div>
      </div>

      {/* Entries */}
      <div className="space-y-1">
        {visibleEntries.map((entry, index) => {
          const isCurrentUser = entry.userId === currentUserId;
          const medal = getMedal(entry.rank);

          return (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                isCurrentUser
                  ? 'bg-emerald-500/10 border border-emerald-500/30'
                  : 'bg-zinc-900/50'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                {showRank && (
                  <div
                    className={`w-6 text-center font-bold ${
                      entry.rank <= 3 ? 'text-lg' : 'text-sm text-zinc-500'
                    }`}
                  >
                    {medal || entry.rank}
                  </div>
                )}

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden">
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt={entry.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm font-medium">
                      {entry.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="flex items-center gap-2">
                  <span
                    className={`font-medium ${
                      isCurrentUser ? 'text-emerald-400' : 'text-white'
                    }`}
                  >
                    {entry.displayName}
                  </span>
                  {isCurrentUser && (
                    <span className="px-1.5 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded">
                      You
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Score */}
                <div className="w-16 text-right">
                  <span className="font-semibold text-white">{entry.score}</span>
                </div>

                {/* Time */}
                <div className="w-16 text-right text-sm text-zinc-400">
                  {entry.timeTaken ? formatTime(entry.timeTaken) : '-'}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Show current user if not in visible list */}
        {currentUserNotVisible && currentUserEntry && (
          <>
            <div className="flex items-center justify-center py-2 text-zinc-600">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-zinc-600" />
                <div className="w-1 h-1 rounded-full bg-zinc-600" />
                <div className="w-1 h-1 rounded-full bg-zinc-600" />
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
            >
              <div className="flex items-center gap-3">
                {showRank && (
                  <div className="w-6 text-center text-sm text-zinc-500 font-bold">
                    {currentUserEntry.rank}
                  </div>
                )}
                <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden">
                  {currentUserEntry.avatarUrl ? (
                    <img
                      src={currentUserEntry.avatarUrl}
                      alt={currentUserEntry.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm font-medium">
                      {currentUserEntry.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-emerald-400">
                    {currentUserEntry.displayName}
                  </span>
                  <span className="px-1.5 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded">
                    You
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-16 text-right">
                  <span className="font-semibold text-white">{currentUserEntry.score}</span>
                </div>
                <div className="w-16 text-right text-sm text-zinc-400">
                  {currentUserEntry.timeTaken ? formatTime(currentUserEntry.timeTaken) : '-'}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Empty State */}
      {entries.length === 0 && (
        <div className="py-8 text-center text-zinc-500">
          No submissions yet. Be the first to compete!
        </div>
      )}
    </div>
  );
}
