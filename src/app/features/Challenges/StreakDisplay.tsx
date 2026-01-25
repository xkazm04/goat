'use client';

/**
 * StreakDisplay Component
 * Shows user's current streaks and milestones
 */

import { motion } from 'framer-motion';
import type { UserStreak } from '@/lib/challenges/types';
import type { StreakMilestone, StreakType } from '@/lib/challenges/StreakTracker';
import { STREAK_MILESTONES } from '@/lib/challenges';

interface StreakDisplayProps {
  streaks: Record<StreakType, UserStreak>;
  milestonesAchieved?: StreakMilestone[];
  showMilestones?: boolean;
  compact?: boolean;
}

/**
 * Format streak type for display
 */
function formatStreakType(type: StreakType): string {
  switch (type) {
    case 'daily_challenge':
      return 'Daily Challenge';
    case 'any_challenge':
      return 'Any Challenge';
    case 'collaborative':
      return 'Collaborative';
    default:
      return type;
  }
}

/**
 * Get next milestone for a streak
 */
function getNextMilestone(currentDays: number): StreakMilestone | null {
  for (const milestone of STREAK_MILESTONES) {
    if (currentDays < milestone.days) {
      return milestone;
    }
  }
  return null;
}

/**
 * Get current milestone for a streak
 */
function getCurrentMilestone(currentDays: number): StreakMilestone | null {
  let current: StreakMilestone | null = null;
  for (const milestone of STREAK_MILESTONES) {
    if (currentDays >= milestone.days) {
      current = milestone;
    } else {
      break;
    }
  }
  return current;
}

/**
 * Individual streak card
 */
function StreakCard({
  type,
  streak,
  compact,
}: {
  type: StreakType;
  streak: UserStreak;
  compact: boolean;
}) {
  const currentMilestone = getCurrentMilestone(streak.currentStreak);
  const nextMilestone = getNextMilestone(streak.currentStreak);
  const progress = nextMilestone
    ? ((streak.currentStreak - (currentMilestone?.days || 0)) /
        (nextMilestone.days - (currentMilestone?.days || 0))) *
      100
    : 100;

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg">
        <span className="text-lg">{currentMilestone?.badge || '🔥'}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white">
            {streak.currentStreak} day{streak.currentStreak !== 1 ? 's' : ''}
          </div>
          <div className="text-xs text-zinc-500">{formatStreakType(type)}</div>
        </div>
        {streak.currentStreak > 0 && currentMilestone && (
          <div className="text-xs text-amber-400">{currentMilestone.bonusMultiplier}x</div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{currentMilestone?.badge || '🔥'}</span>
          <div>
            <div className="font-medium text-white">{formatStreakType(type)}</div>
            <div className="text-sm text-zinc-400">
              {currentMilestone?.name || 'Getting Started'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{streak.currentStreak}</div>
          <div className="text-xs text-zinc-500">day streak</div>
        </div>
      </div>

      {/* Progress to next milestone */}
      {nextMilestone && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">
              Next: {nextMilestone.badge} {nextMilestone.name}
            </span>
            <span className="text-zinc-400">
              {nextMilestone.days - streak.currentStreak} days left
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, progress)}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800 text-sm">
        <div>
          <span className="text-zinc-500">Best: </span>
          <span className="text-white">{streak.longestStreak} days</span>
        </div>
        <div>
          <span className="text-zinc-500">Bonus: </span>
          <span className="text-emerald-400">
            {currentMilestone?.bonusMultiplier || streak.bonusMultiplier || 1}x
          </span>
        </div>
      </div>
    </div>
  );
}

export function StreakDisplay({
  streaks,
  milestonesAchieved = [],
  showMilestones = true,
  compact = false,
}: StreakDisplayProps) {
  const streakEntries = Object.entries(streaks) as [StreakType, UserStreak][];
  const activeStreaks = streakEntries.filter(
    ([, data]) => data.currentStreak > 0 || data.longestStreak > 0
  );

  if (activeStreaks.length === 0) {
    return (
      <div className="p-6 text-center bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="text-4xl mb-3">🔥</div>
        <div className="font-medium text-white mb-1">No active streaks</div>
        <div className="text-sm text-zinc-400">
          Complete a challenge daily to start a streak!
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {activeStreaks.map(([type, data]) => (
          <StreakCard key={type} type={type} streak={data} compact />
        ))}
      </div>
    );
  }

  // Get best streaks for stats
  const bestCurrentStreak = Math.max(...activeStreaks.map(([, s]) => s.currentStreak));
  const bestLongestStreak = Math.max(...activeStreaks.map(([, s]) => s.longestStreak));
  const bestCurrentMilestone = getCurrentMilestone(bestCurrentStreak);

  return (
    <div className="space-y-6">
      {/* Active Streaks */}
      <div className="grid gap-4 md:grid-cols-3">
        {activeStreaks.map(([type, data]) => (
          <StreakCard key={type} type={type} streak={data} compact={false} />
        ))}
      </div>

      {/* Milestones */}
      {showMilestones && (
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <h4 className="text-sm font-medium text-zinc-400 mb-3">All Milestones</h4>
          <div className="flex flex-wrap gap-2">
            {STREAK_MILESTONES.map((milestone) => {
              const unlocked = milestonesAchieved.some(m => m.days === milestone.days) ||
                bestLongestStreak >= milestone.days;

              return (
                <div
                  key={milestone.days}
                  className={`px-3 py-2 rounded-lg border text-center ${
                    unlocked
                      ? 'bg-zinc-800 border-zinc-700'
                      : 'bg-zinc-900/50 border-zinc-800/50 opacity-50'
                  }`}
                  title={`${milestone.name} - ${milestone.days} days (${milestone.bonusMultiplier}x bonus)`}
                >
                  <div className="text-xl">{milestone.badge}</div>
                  <div className="text-xs text-zinc-400 mt-1">{milestone.days}d</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Total Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
          <div className="text-2xl font-bold text-white">
            {milestonesAchieved.length}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Milestones</div>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {bestLongestStreak}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Best Streak</div>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
          <div className="text-2xl font-bold text-amber-400">
            {bestCurrentMilestone?.bonusMultiplier || 1}x
          </div>
          <div className="text-xs text-zinc-500 mt-1">Current Bonus</div>
        </div>
      </div>
    </div>
  );
}
