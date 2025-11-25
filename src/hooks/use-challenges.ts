import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  Challenge,
  ChallengeEntry,
  CreateChallengeRequest,
  SubmitChallengeEntryRequest,
} from '@/types/challenges';

// Query keys
export const challengeKeys = {
  all: ['challenges'] as const,
  lists: () => [...challengeKeys.all, 'list'] as const,
  list: (filters: any) => [...challengeKeys.lists(), filters] as const,
  details: () => [...challengeKeys.all, 'detail'] as const,
  detail: (id: string) => [...challengeKeys.details(), id] as const,
  entries: (id: string) => [...challengeKeys.detail(id), 'entries'] as const,
};

// Fetch all challenges with optional filters
export function useChallenges(params?: {
  category?: string;
  status?: 'active' | 'completed' | 'scheduled';
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: challengeKeys.list(params || {}),
    queryFn: () => apiClient.get<Challenge[]>('/challenges', params),
  });
}

// Fetch a single challenge with entries
export function useChallenge(id: string) {
  return useQuery({
    queryKey: challengeKeys.detail(id),
    queryFn: () => apiClient.get<Challenge>(`/challenges/${id}`),
    enabled: !!id,
  });
}

// Fetch challenge entries
export function useChallengeEntries(challengeId: string, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: challengeKeys.entries(challengeId),
    queryFn: () => apiClient.get<ChallengeEntry[]>(`/challenges/${challengeId}/entries`, params),
    enabled: !!challengeId,
  });
}

// Create a new challenge
export function useCreateChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChallengeRequest) =>
      apiClient.post<Challenge>('/challenges', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.lists() });
    },
  });
}

// Submit a challenge entry
export function useSubmitChallengeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ challengeId, ...data }: SubmitChallengeEntryRequest & { challengeId: string }) =>
      apiClient.post<ChallengeEntry>(`/challenges/${challengeId}/entries`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.entries(variables.challengeId) });
      queryClient.invalidateQueries({ queryKey: challengeKeys.detail(variables.challengeId) });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

// Update a challenge
export function useUpdateChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Challenge>) =>
      apiClient.put<Challenge>(`/challenges/${id}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: challengeKeys.lists() });
    },
  });
}

// Delete a challenge
export function useDeleteChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/challenges/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.lists() });
    },
  });
}
