import { create } from 'zustand';
import { Challenge, ChallengeEntry, LeaderboardEntry } from '@/types/challenges';

interface ChallengeState {
  // Selected challenge
  selectedChallenge: Challenge | null;
  setSelectedChallenge: (challenge: Challenge | null) => void;

  // Challenge modal state
  isChallengeModalOpen: boolean;
  openChallengeModal: (challenge: Challenge) => void;
  closeChallengeModal: () => void;

  // User's current entry for selected challenge
  userEntry: ChallengeEntry | null;
  setUserEntry: (entry: ChallengeEntry | null) => void;

  // Leaderboard state
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;

  selectedTimeframe: 'daily' | 'weekly' | 'monthly' | 'all-time';
  setSelectedTimeframe: (timeframe: 'daily' | 'weekly' | 'monthly' | 'all-time') => void;

  // Filter state
  filterStatus: 'active' | 'completed' | 'scheduled' | null;
  setFilterStatus: (status: 'active' | 'completed' | 'scheduled' | null) => void;

  // Actions
  resetFilters: () => void;
  reset: () => void;
}

export const useChallengeStore = create<ChallengeState>((set) => ({
  // Initial state
  selectedChallenge: null,
  isChallengeModalOpen: false,
  userEntry: null,
  selectedCategory: null,
  selectedTimeframe: 'all-time',
  filterStatus: 'active',

  // Setters
  setSelectedChallenge: (challenge) => set({ selectedChallenge: challenge }),

  openChallengeModal: (challenge) =>
    set({
      selectedChallenge: challenge,
      isChallengeModalOpen: true,
    }),

  closeChallengeModal: () =>
    set({
      isChallengeModalOpen: false,
    }),

  setUserEntry: (entry) => set({ userEntry: entry }),

  setSelectedCategory: (category) => set({ selectedCategory: category }),

  setSelectedTimeframe: (timeframe) => set({ selectedTimeframe: timeframe }),

  setFilterStatus: (status) => set({ filterStatus: status }),

  resetFilters: () =>
    set({
      selectedCategory: null,
      selectedTimeframe: 'all-time',
      filterStatus: 'active',
    }),

  reset: () =>
    set({
      selectedChallenge: null,
      isChallengeModalOpen: false,
      userEntry: null,
      selectedCategory: null,
      selectedTimeframe: 'all-time',
      filterStatus: 'active',
    }),
}));
