// Challenge & Leaderboard Types

export interface Challenge {
  id: string;
  list_id: string;
  category: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'completed' | 'scheduled';
  prize_description?: string;
  entry_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChallengeEntry {
  id: string;
  challenge_id: string;
  user_id: string;
  list_id: string;
  score: number;
  completion_time: number;
  rank?: number;
  submitted_at: string;
  created_at: string;
}

export interface ChallengeEntryWithUser extends ChallengeEntry {
  user: {
    id: string;
    name?: string;
    email: string;
    avatar_url?: string;
  };
  list: {
    id: string;
    title: string;
  };
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  score: number;
  entry_count: number;
  badges: Badge[];
  is_premium: boolean;
}

export interface Badge {
  id: string;
  user_id: string;
  badge_type: BadgeType;
  challenge_id?: string;
  earned_at: string;
  metadata?: Record<string, any>;
}

export type BadgeType =
  | 'first_place'
  | 'top_10'
  | 'speed_master'
  | 'consistency_king'
  | 'category_expert'
  | 'challenge_veteran'
  | 'perfect_score'
  | 'early_bird'
  | 'comeback_kid'
  | 'streak_master';

export interface BadgeDefinition {
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirement: string;
}

export interface CategoryLeaderboard {
  category: string;
  entries: LeaderboardEntry[];
  last_updated: string;
}

export interface UserStats {
  user_id: string;
  total_challenges: number;
  challenges_won: number;
  total_entries: number;
  average_score: number;
  best_rank: number;
  badges: Badge[];
  current_streak: number;
  created_at: string;
  updated_at: string;
}

export interface CreateChallengeRequest {
  list_id: string;
  category: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  prize_description?: string;
}

export interface SubmitChallengeEntryRequest {
  challenge_id: string;
  user_id: string;
  list_id: string;
  score: number;
  completion_time: number;
}

export interface LeaderboardParams {
  category?: string;
  limit?: number;
  offset?: number;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all-time';
}
