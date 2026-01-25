'use client';

/**
 * ChallengeCard Component
 * Displays a challenge in a card format
 */

import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import type { Challenge } from '@/lib/challenges/types';

interface ChallengeCardProps {
  challenge: Challenge;
  onClick?: () => void;
  isCurrentUser?: boolean;
}

/**
 * Get status badge color
 */
function getStatusColor(status: Challenge['status']): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'completed':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'cancelled':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

/**
 * Get challenge type label
 */
function getTypeLabel(type: Challenge['type']): string {
  switch (type) {
    case 'beat_my_ranking':
      return 'Beat My Ranking';
    case 'collaborative':
      return 'Collaborative';
    case 'speed_ranking':
      return 'Speed Ranking';
    case 'blind_ranking':
      return 'Blind Ranking';
    case 'daily_challenge':
      return 'Daily Challenge';
    default:
      return type;
  }
}

export function ChallengeCard({
  challenge,
  onClick,
  isCurrentUser = false,
}: ChallengeCardProps) {
  const timeAgo = formatDistanceToNow(new Date(challenge.createdAt), {
    addSuffix: true,
  });

  const expiresIn = challenge.expiresAt
    ? formatDistanceToNow(new Date(challenge.expiresAt), { addSuffix: true })
    : null;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-700 transition-colors"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{challenge.title}</h3>
          <p className="text-sm text-zinc-400 mt-0.5">
            by {isCurrentUser ? 'You' : challenge.creatorName}
          </p>
        </div>
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(
            challenge.status
          )}`}
        >
          {challenge.status}
        </span>
      </div>

      {/* Description */}
      {challenge.description && (
        <p className="text-sm text-zinc-400 line-clamp-2 mb-3">
          {challenge.description}
        </p>
      )}

      {/* Type badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-0.5 text-xs font-medium bg-zinc-800 text-zinc-300 rounded">
          {getTypeLabel(challenge.type)}
        </span>
        {challenge.config.timeLimit && (
          <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded">
            {Math.floor(challenge.config.timeLimit / 60)}m limit
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-zinc-500">
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>{challenge.stats.submissions}</span>
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <span>{challenge.stats.views}</span>
        </div>
        {challenge.stats.highScore !== undefined && (
          <div className="flex items-center gap-1 text-amber-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span>{challenge.stats.highScore}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-500">
        <span>{timeAgo}</span>
        {expiresIn && challenge.status === 'active' && (
          <span className="text-amber-400">Expires {expiresIn}</span>
        )}
      </div>
    </motion.div>
  );
}
