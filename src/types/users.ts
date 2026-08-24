/**
 * User Types
 *
 * Domain types for users and user preferences.
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  notifications?: boolean;
  defaultCategory?: string;
}

export interface ConsensusSubmission {
  listId: string;
  userId?: string;
  rankings: Array<{
    itemId: string;
    position: number;
  }>;
}
