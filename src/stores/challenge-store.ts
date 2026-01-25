/**
 * Challenge Store
 * Zustand store for managing challenge state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Challenge,
  ChallengeStatus,
  ChallengeType,
  RankingSubmission,
  LeaderboardEntry,
  ChallengeInvitation,
  ChallengeParticipant,
  CreateChallengeInput,
  RankedItem,
} from '@/lib/challenges/types';
import type { ShareChain, ShareChainStats } from '@/lib/challenges/ShareChainTracker';
import type { UserStreakData } from '@/lib/challenges/StreakTracker';
import type { CollaborativeSession } from '@/lib/collaboration/CollaborativeRanking';

/**
 * Challenge view mode
 */
export type ChallengeViewMode = 'list' | 'detail' | 'create' | 'participate' | 'results';

/**
 * Challenge filter state
 */
export interface ChallengeFilters {
  status: ChallengeStatus[];
  type: ChallengeType[];
  createdByMe: boolean;
  participatedIn: boolean;
  searchQuery: string;
}

/**
 * Challenge store state
 */
export interface ChallengeState {
  // Current view
  viewMode: ChallengeViewMode;

  // Active challenge
  activeChallenge: Challenge | null;
  activeChallengeId: string | null;

  // User's challenges
  myChallenges: Challenge[];
  participatedChallenges: Challenge[];

  // Current challenge data
  leaderboard: LeaderboardEntry[];
  submissions: RankingSubmission[];
  participants: ChallengeParticipant[];
  invitations: ChallengeInvitation[];

  // Share chain data
  shareChain: ShareChain | null;
  shareChainStats: ShareChainStats | null;

  // Collaborative session
  collaborativeSession: CollaborativeSession | null;

  // User streaks
  userStreaks: UserStreakData | null;

  // Filters
  filters: ChallengeFilters;

  // Loading states
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  // Draft challenge (for create flow)
  draftChallenge: Partial<CreateChallengeInput> | null;
  draftRanking: RankedItem[];

  // Invitation handling
  pendingInvitationToken: string | null;
}

/**
 * Challenge store actions
 */
export interface ChallengeActions {
  // View mode
  setViewMode: (mode: ChallengeViewMode) => void;

  // Active challenge
  setActiveChallenge: (challenge: Challenge | null) => void;
  setActiveChallengeId: (id: string | null) => void;

  // Challenge management
  setMyChallenges: (challenges: Challenge[]) => void;
  setParticipatedChallenges: (challenges: Challenge[]) => void;
  addChallenge: (challenge: Challenge) => void;
  updateChallenge: (id: string, updates: Partial<Challenge>) => void;
  removeChallenge: (id: string) => void;

  // Leaderboard & submissions
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
  setSubmissions: (submissions: RankingSubmission[]) => void;
  addSubmission: (submission: RankingSubmission) => void;

  // Participants & invitations
  setParticipants: (participants: ChallengeParticipant[]) => void;
  setInvitations: (invitations: ChallengeInvitation[]) => void;
  addParticipant: (participant: ChallengeParticipant) => void;
  addInvitation: (invitation: ChallengeInvitation) => void;

  // Share chain
  setShareChain: (chain: ShareChain | null) => void;
  setShareChainStats: (stats: ShareChainStats | null) => void;

  // Collaborative session
  setCollaborativeSession: (session: CollaborativeSession | null) => void;

  // User streaks
  setUserStreaks: (streaks: UserStreakData | null) => void;

  // Filters
  setFilters: (filters: Partial<ChallengeFilters>) => void;
  resetFilters: () => void;

  // Loading states
  setLoading: (loading: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  setError: (error: string | null) => void;

  // Draft challenge
  setDraftChallenge: (draft: Partial<CreateChallengeInput> | null) => void;
  updateDraftChallenge: (updates: Partial<CreateChallengeInput>) => void;
  setDraftRanking: (ranking: RankedItem[]) => void;
  clearDraft: () => void;

  // Invitation handling
  setPendingInvitationToken: (token: string | null) => void;

  // Reset
  reset: () => void;
}

/**
 * Default filter state
 */
const DEFAULT_FILTERS: ChallengeFilters = {
  status: [],
  type: [],
  createdByMe: false,
  participatedIn: false,
  searchQuery: '',
};

/**
 * Initial state
 */
const initialState: ChallengeState = {
  viewMode: 'list',
  activeChallenge: null,
  activeChallengeId: null,
  myChallenges: [],
  participatedChallenges: [],
  leaderboard: [],
  submissions: [],
  participants: [],
  invitations: [],
  shareChain: null,
  shareChainStats: null,
  collaborativeSession: null,
  userStreaks: null,
  filters: DEFAULT_FILTERS,
  isLoading: false,
  isSubmitting: false,
  error: null,
  draftChallenge: null,
  draftRanking: [],
  pendingInvitationToken: null,
};

/**
 * Challenge store
 */
export const useChallengeStore = create<ChallengeState & ChallengeActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // View mode
      setViewMode: (mode) => set({ viewMode: mode }),

      // Active challenge
      setActiveChallenge: (challenge) => set({
        activeChallenge: challenge,
        activeChallengeId: challenge?.id || null,
      }),

      setActiveChallengeId: (id) => set({ activeChallengeId: id }),

      // Challenge management
      setMyChallenges: (challenges) => set({ myChallenges: challenges }),

      setParticipatedChallenges: (challenges) => set({ participatedChallenges: challenges }),

      addChallenge: (challenge) => set((state) => ({
        myChallenges: [challenge, ...state.myChallenges],
      })),

      updateChallenge: (id, updates) => set((state) => ({
        myChallenges: state.myChallenges.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
        participatedChallenges: state.participatedChallenges.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
        activeChallenge: state.activeChallenge?.id === id
          ? { ...state.activeChallenge, ...updates }
          : state.activeChallenge,
      })),

      removeChallenge: (id) => set((state) => ({
        myChallenges: state.myChallenges.filter((c) => c.id !== id),
        participatedChallenges: state.participatedChallenges.filter((c) => c.id !== id),
        activeChallenge: state.activeChallenge?.id === id ? null : state.activeChallenge,
        activeChallengeId: state.activeChallengeId === id ? null : state.activeChallengeId,
      })),

      // Leaderboard & submissions
      setLeaderboard: (entries) => set({ leaderboard: entries }),

      setSubmissions: (submissions) => set({ submissions }),

      addSubmission: (submission) => set((state) => ({
        submissions: [...state.submissions, submission],
      })),

      // Participants & invitations
      setParticipants: (participants) => set({ participants }),

      setInvitations: (invitations) => set({ invitations }),

      addParticipant: (participant) => set((state) => ({
        participants: [...state.participants, participant],
      })),

      addInvitation: (invitation) => set((state) => ({
        invitations: [...state.invitations, invitation],
      })),

      // Share chain
      setShareChain: (chain) => set({ shareChain: chain }),

      setShareChainStats: (stats) => set({ shareChainStats: stats }),

      // Collaborative session
      setCollaborativeSession: (session) => set({ collaborativeSession: session }),

      // User streaks
      setUserStreaks: (streaks) => set({ userStreaks: streaks }),

      // Filters
      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters },
      })),

      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      // Loading states
      setLoading: (loading) => set({ isLoading: loading }),

      setSubmitting: (submitting) => set({ isSubmitting: submitting }),

      setError: (error) => set({ error }),

      // Draft challenge
      setDraftChallenge: (draft) => set({ draftChallenge: draft }),

      updateDraftChallenge: (updates) => set((state) => ({
        draftChallenge: state.draftChallenge
          ? { ...state.draftChallenge, ...updates }
          : updates,
      })),

      setDraftRanking: (ranking) => set({ draftRanking: ranking }),

      clearDraft: () => set({ draftChallenge: null, draftRanking: [] }),

      // Invitation handling
      setPendingInvitationToken: (token) => set({ pendingInvitationToken: token }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'goat-challenge-store',
      partialize: (state) => ({
        // Only persist certain state
        draftChallenge: state.draftChallenge,
        draftRanking: state.draftRanking,
        pendingInvitationToken: state.pendingInvitationToken,
        filters: state.filters,
      }),
    }
  )
);

/**
 * Selectors
 */
export const selectActiveChallenge = (state: ChallengeState) => state.activeChallenge;
export const selectMyChallenges = (state: ChallengeState) => state.myChallenges;
export const selectParticipatedChallenges = (state: ChallengeState) => state.participatedChallenges;
export const selectLeaderboard = (state: ChallengeState) => state.leaderboard;
export const selectShareChain = (state: ChallengeState) => state.shareChain;
export const selectUserStreaks = (state: ChallengeState) => state.userStreaks;
export const selectFilters = (state: ChallengeState) => state.filters;
export const selectIsLoading = (state: ChallengeState) => state.isLoading;
export const selectError = (state: ChallengeState) => state.error;

/**
 * Filter challenges based on current filters
 */
export function filterChallenges(
  challenges: Challenge[],
  filters: ChallengeFilters
): Challenge[] {
  return challenges.filter((challenge) => {
    // Status filter
    if (filters.status.length > 0 && !filters.status.includes(challenge.status)) {
      return false;
    }

    // Type filter
    if (filters.type.length > 0 && !filters.type.includes(challenge.type)) {
      return false;
    }

    // Search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesTitle = challenge.title.toLowerCase().includes(query);
      const matchesDescription = challenge.description?.toLowerCase().includes(query);
      const matchesCreator = challenge.creatorName.toLowerCase().includes(query);
      if (!matchesTitle && !matchesDescription && !matchesCreator) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get all challenges (combined my + participated, deduplicated)
 */
export function getAllChallenges(state: ChallengeState): Challenge[] {
  const all = [...state.myChallenges, ...state.participatedChallenges];
  const seen = new Set<string>();
  return all.filter((challenge) => {
    if (seen.has(challenge.id)) return false;
    seen.add(challenge.id);
    return true;
  });
}
