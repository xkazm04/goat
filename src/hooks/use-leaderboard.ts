import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { LeaderboardEntry, Badge } from '@/types/challenges';

// Query keys
export const leaderboardKeys = {
  all: ['leaderboard'] as const,
  list: (filters: any) => [...leaderboardKeys.all, filters] as const,
};

export const badgeKeys = {
  all: ['badges'] as const,
  user: (userId: string) => [...badgeKeys.all, 'user', userId] as const,
};

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  category: string;
  timeframe: string;
  last_updated: string;
}

// Fetch leaderboard
export function useLeaderboard(params?: {
  category?: string;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all-time';
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: leaderboardKeys.list(params || {}),
    queryFn: () => apiClient.get<LeaderboardResponse>('/leaderboard', params),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute for live updates
  });
}

// Fetch user badges
export function useUserBadges(userId?: string) {
  return useQuery({
    queryKey: badgeKeys.user(userId || ''),
    queryFn: () => apiClient.get<Badge[]>('/badges', { user_id: userId }),
    enabled: !!userId,
  });
}

// Fetch all badges for badge types
export function useBadges(params?: { badge_type?: string; limit?: number }) {
  return useQuery({
    queryKey: [...badgeKeys.all, params || {}],
    queryFn: () => apiClient.get<Badge[]>('/badges', params),
  });
}
