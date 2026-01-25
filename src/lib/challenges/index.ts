/**
 * Challenges Module
 * Viral share mechanics with challenges and collaborative rankings
 */

// Types
export type {
  ChallengeType,
  ChallengeStatus,
  ParticipantStatus,
  ChallengeConfig,
  CustomScoringRule,
  Challenge,
  ChallengeStats,
  RankingSubmission,
  RankedItem,
  ChallengeParticipant,
  ChallengeInvitation,
  ShareChainInfo,
  LeaderboardEntry,
  UserStreak,
  ChallengeTemplate,
  CreateChallengeInput,
  UpdateChallengeInput,
  ChallengeFilters,
  ScoringResult,
} from './types';

export { CHALLENGE_TEMPLATES } from './types';

// Challenge Manager
export {
  ChallengeManager,
  createChallengeManager,
  getChallengeManager,
} from './ChallengeManager';

// Invitation System
export {
  InvitationSystem,
  createInvitationSystem,
  getInvitationSystem,
} from './InvitationSystem';

// Share Chain Tracker
export {
  ShareChainTracker,
  createShareChainTracker,
  getShareChainTracker,
  type ShareChain,
  type ShareChainNode,
  type ShareChainStats,
} from './ShareChainTracker';

// Streak Tracker
export {
  StreakTracker,
  createStreakTracker,
  getStreakTracker,
  STREAK_MILESTONES,
  type StreakType,
  type StreakMilestone,
  type UserStreakData,
} from './StreakTracker';
