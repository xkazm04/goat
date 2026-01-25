/**
 * Challenge System Types
 * Type definitions for viral share mechanics and ranking challenges
 */

/**
 * Challenge types
 */
export type ChallengeType =
  | 'beat_my_ranking'    // Try to beat the creator's ranking
  | 'collaborative'      // Multiple users contribute to one ranking
  | 'speed_ranking'      // Complete ranking fastest
  | 'blind_ranking'      // Can't see others' choices until done
  | 'daily_challenge';   // Daily themed challenge

/**
 * Challenge status
 */
export type ChallengeStatus =
  | 'draft'         // Being created
  | 'active'        // Open for participation
  | 'completed'     // Challenge ended
  | 'expired'       // Past deadline
  | 'cancelled';    // Creator cancelled

/**
 * Participant status in a challenge
 */
export type ParticipantStatus =
  | 'invited'       // Received invitation
  | 'accepted'      // Joined the challenge
  | 'in_progress'   // Currently working on ranking
  | 'submitted'     // Submitted their ranking
  | 'declined';     // Declined invitation

/**
 * Challenge configuration
 */
export interface ChallengeConfig {
  /** Challenge type */
  type: ChallengeType;
  /** Time limit in minutes (optional) */
  timeLimit?: number;
  /** Maximum participants */
  maxParticipants?: number;
  /** Minimum participants to start */
  minParticipants?: number;
  /** Deadline for submissions */
  deadline?: string; // ISO date
  /** Allow late submissions */
  allowLateSubmissions?: boolean;
  /** Reveal results immediately or after deadline */
  revealMode: 'immediate' | 'after_deadline' | 'after_all_submit';
  /** Scoring method */
  scoringMethod: 'similarity' | 'speed' | 'points' | 'custom';
  /** Custom scoring rules */
  customScoring?: CustomScoringRule[];
  /** Challenge visibility */
  visibility: 'public' | 'private' | 'invite_only' | 'link_only';
}

/**
 * Custom scoring rule
 */
export interface CustomScoringRule {
  /** Rule type */
  type: 'position_match' | 'top_n_match' | 'bonus' | 'penalty';
  /** Points for this rule */
  points: number;
  /** Additional parameters */
  params?: Record<string, number | string>;
}

/**
 * Challenge definition
 */
export interface Challenge {
  /** Unique challenge ID */
  id: string;
  /** Short shareable code */
  code: string;
  /** Challenge title */
  title: string;
  /** Description/instructions */
  description?: string;
  /** Challenge type */
  type: ChallengeType;
  /** Current status */
  status: ChallengeStatus;
  /** Configuration */
  config: ChallengeConfig;
  /** Source list ID */
  listId: string;
  /** Source list title */
  listTitle: string;
  /** Category */
  category: string;
  /** Creator user ID */
  creatorId: string;
  /** Creator display name */
  creatorName: string;
  /** Creator's ranking (for beat_my_ranking type) */
  creatorRanking?: RankingSubmission;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
  /** Expires at */
  expiresAt?: string;
  /** Challenge statistics */
  stats: ChallengeStats;
  /** Share chain information */
  shareChain?: ShareChainInfo;
}

/**
 * Challenge statistics
 */
export interface ChallengeStats {
  /** Total invitations sent */
  invitationsSent: number;
  /** Invitations accepted */
  invitationsAccepted: number;
  /** Submissions received */
  submissions: number;
  /** Total views */
  views: number;
  /** Shares */
  shares: number;
  /** Average completion time (minutes) */
  avgCompletionTime?: number;
  /** Highest score */
  highScore?: number;
}

/**
 * Ranking submission for a challenge
 */
export interface RankingSubmission {
  /** Submission ID */
  id: string;
  /** Challenge ID */
  challengeId: string;
  /** User ID */
  userId: string;
  /** User display name */
  userName: string;
  /** User avatar */
  userAvatar?: string;
  /** Ranked items */
  items: RankedItem[];
  /** Score (calculated based on challenge type) */
  score?: number;
  /** Time taken in seconds */
  timeTaken?: number;
  /** Submitted at */
  submittedAt: string;
  /** Position on leaderboard */
  rank?: number;
}

/**
 * Ranked item in a submission
 */
export interface RankedItem {
  /** Item ID */
  id: string;
  /** Position (1-based) */
  position: number;
  /** Item title */
  title: string;
  /** Item image */
  imageUrl?: string;
}

/**
 * Challenge participant
 */
export interface ChallengeParticipant {
  /** User ID */
  userId: string;
  /** Display name */
  displayName: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Participation status */
  status: ParticipantStatus;
  /** Invited at */
  invitedAt: string;
  /** Joined at */
  joinedAt?: string;
  /** Submitted at */
  submittedAt?: string;
  /** Invitation source */
  invitedBy?: string;
  /** Their submission */
  submission?: RankingSubmission;
}

/**
 * Challenge invitation
 */
export interface ChallengeInvitation {
  /** Invitation ID */
  id: string;
  /** Challenge ID */
  challengeId: string;
  /** Challenge title */
  challengeTitle: string;
  /** Inviter user ID */
  inviterId: string;
  /** Inviter name */
  inviterName: string;
  /** Invitee user ID (if known) */
  inviteeId?: string;
  /** Invitee email (for email invites) */
  inviteeEmail?: string;
  /** Invitation token (for link invites) */
  token: string;
  /** Status */
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  /** Created at */
  createdAt: string;
  /** Expires at */
  expiresAt: string;
  /** Accepted/declined at */
  respondedAt?: string;
}

/**
 * Share chain information
 */
export interface ShareChainInfo {
  /** Original challenge creator */
  originatorId: string;
  /** Chain depth (how many shares deep) */
  depth: number;
  /** Chain path (user IDs from origin to current) */
  path: string[];
  /** Total participants in chain */
  totalParticipants: number;
  /** Chain created at */
  createdAt: string;
}

/**
 * Challenge leaderboard entry
 */
export interface LeaderboardEntry {
  /** Rank position */
  rank: number;
  /** User ID */
  userId: string;
  /** Display name */
  displayName: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Score */
  score: number;
  /** Time taken (seconds) */
  timeTaken?: number;
  /** Submitted at */
  submittedAt: string;
  /** Is current user */
  isCurrentUser?: boolean;
}

/**
 * User streak information
 */
export interface UserStreak {
  /** User ID */
  userId: string;
  /** Current streak count */
  currentStreak: number;
  /** Longest streak ever */
  longestStreak: number;
  /** Last activity date */
  lastActivityDate: string;
  /** Streak type */
  streakType: 'daily_challenge' | 'any_challenge' | 'collaborative';
  /** Streak started at */
  streakStartedAt: string;
  /** Days until streak breaks */
  daysUntilBreak: number;
  /** Bonus multiplier from streak */
  bonusMultiplier: number;
}

/**
 * Challenge template for quick creation
 */
export interface ChallengeTemplate {
  /** Template ID */
  id: string;
  /** Template name */
  name: string;
  /** Description */
  description: string;
  /** Icon */
  icon: string;
  /** Default configuration */
  defaultConfig: Partial<ChallengeConfig>;
  /** Suggested categories */
  suggestedCategories?: string[];
  /** Is featured */
  isFeatured?: boolean;
}

/**
 * Default challenge templates
 */
export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    id: 'beat-my-ranking',
    name: 'Beat My Ranking',
    description: 'Challenge friends to rank items closer to yours',
    icon: '🏆',
    defaultConfig: {
      type: 'beat_my_ranking',
      revealMode: 'immediate',
      scoringMethod: 'similarity',
      visibility: 'link_only',
    },
  },
  {
    id: 'collaborative',
    name: 'Collaborative Ranking',
    description: 'Work together to create a group ranking',
    icon: '🤝',
    defaultConfig: {
      type: 'collaborative',
      revealMode: 'immediate',
      scoringMethod: 'points',
      visibility: 'invite_only',
      maxParticipants: 10,
    },
  },
  {
    id: 'speed-challenge',
    name: 'Speed Challenge',
    description: 'Who can rank fastest?',
    icon: '⚡',
    defaultConfig: {
      type: 'speed_ranking',
      timeLimit: 5,
      revealMode: 'immediate',
      scoringMethod: 'speed',
      visibility: 'link_only',
    },
  },
  {
    id: 'blind-ranking',
    name: 'Blind Ranking',
    description: "Rank without seeing others' choices",
    icon: '🙈',
    defaultConfig: {
      type: 'blind_ranking',
      revealMode: 'after_all_submit',
      scoringMethod: 'similarity',
      visibility: 'link_only',
    },
  },
  {
    id: 'daily-challenge',
    name: 'Daily Challenge',
    description: 'Daily themed ranking challenge',
    icon: '📅',
    defaultConfig: {
      type: 'daily_challenge',
      revealMode: 'after_deadline',
      scoringMethod: 'points',
      visibility: 'link_only',
    },
  },
];

/**
 * Challenge creation input
 */
export interface CreateChallengeInput {
  /** List ID to base challenge on */
  listId: string;
  /** Challenge title */
  title: string;
  /** Description */
  description?: string;
  /** Template ID or custom config */
  templateId?: string;
  /** Custom configuration (overrides template) */
  config?: Partial<ChallengeConfig>;
  /** Initial invitees */
  invitees?: string[];
}

/**
 * Challenge update input
 */
export interface UpdateChallengeInput {
  /** Challenge ID */
  challengeId: string;
  /** Updates */
  updates: Partial<Pick<Challenge, 'title' | 'description' | 'status' | 'config' | 'stats'>>;
}

/**
 * Challenge filter options
 */
export interface ChallengeFilters {
  /** Status filter */
  status?: ChallengeStatus[];
  /** Type filter */
  type?: ChallengeType[];
  /** Created by user */
  creatorId?: string;
  /** Participated by user */
  participantId?: string;
  /** Category filter */
  category?: string;
  /** Date range */
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * Scoring calculation result
 */
export interface ScoringResult {
  /** Total score */
  score: number;
  /** Score breakdown */
  breakdown: {
    rule: string;
    points: number;
    details?: string;
  }[];
  /** Similarity percentage (for similarity scoring) */
  similarity?: number;
  /** Time bonus (for speed scoring) */
  timeBonus?: number;
}
