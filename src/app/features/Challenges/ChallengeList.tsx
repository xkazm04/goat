'use client';

/**
 * ChallengeList Component
 * Displays a list of challenges with filtering
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChallengeCard } from './ChallengeCard';
import { useChallengeStore, filterChallenges, getAllChallenges } from '@/stores/challenge-store';
import type { Challenge, ChallengeStatus, ChallengeType } from '@/lib/challenges/types';

interface ChallengeListProps {
  challenges?: Challenge[];
  currentUserId?: string;
  onChallengeClick?: (challenge: Challenge) => void;
  emptyMessage?: string;
}

const STATUS_OPTIONS: { value: ChallengeStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_OPTIONS: { value: ChallengeType; label: string }[] = [
  { value: 'beat_my_ranking', label: 'Beat My Ranking' },
  { value: 'collaborative', label: 'Collaborative' },
  { value: 'speed_ranking', label: 'Speed Ranking' },
  { value: 'blind_ranking', label: 'Blind Ranking' },
  { value: 'daily_challenge', label: 'Daily Challenge' },
];

export function ChallengeList({
  challenges: propChallenges,
  currentUserId,
  onChallengeClick,
  emptyMessage = 'No challenges found',
}: ChallengeListProps) {
  const { filters, setFilters } = useChallengeStore();
  const storeState = useChallengeStore();

  // Use prop challenges or get from store
  const allChallenges = propChallenges || getAllChallenges(storeState);

  // Filter challenges
  const filteredChallenges = useMemo(
    () => filterChallenges(allChallenges, filters),
    [allChallenges, filters]
  );

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleStatusToggle = (status: ChallengeStatus) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    setFilters({ status: newStatus });
  };

  const handleTypeToggle = (type: ChallengeType) => {
    const newType = filters.type.includes(type)
      ? filters.type.filter((t) => t !== type)
      : [...filters.type, type];
    setFilters({ type: newType });
  };

  const activeFilterCount =
    filters.status.length + filters.type.length + (filters.searchQuery ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search challenges..."
            value={filters.searchQuery}
            onChange={(e) => setFilters({ searchQuery: e.target.value })}
            className="w-full px-4 py-2 pl-10 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
            isFilterOpen || activeFilterCount > 0
              ? 'bg-zinc-800 border-zinc-700 text-white'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-zinc-700 rounded">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg space-y-4">
              {/* Status Filters */}
              <div>
                <h4 className="text-sm font-medium text-zinc-300 mb-2">Status</h4>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleStatusToggle(option.value)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        filters.status.includes(option.value)
                          ? 'bg-zinc-700 border-zinc-600 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type Filters */}
              <div>
                <h4 className="text-sm font-medium text-zinc-300 mb-2">Type</h4>
                <div className="flex flex-wrap gap-2">
                  {TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleTypeToggle(option.value)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        filters.type.includes(option.value)
                          ? 'bg-zinc-700 border-zinc-600 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              {activeFilterCount > 0 && (
                <button
                  onClick={() =>
                    setFilters({ status: [], type: [], searchQuery: '' })
                  }
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Challenge Grid */}
      {filteredChallenges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredChallenges.map((challenge) => (
              <motion.div
                key={challenge.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <ChallengeCard
                  challenge={challenge}
                  onClick={() => onChallengeClick?.(challenge)}
                  isCurrentUser={challenge.creatorId === currentUserId}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-12 text-center">
          <svg
            className="w-12 h-12 mx-auto text-zinc-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-zinc-400">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
