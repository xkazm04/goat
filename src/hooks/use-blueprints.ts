import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { CACHE_TTL_MS, GC_TIME_MS } from '@/lib/cache/unified-cache';
import {
  Blueprint,
  CreateBlueprintRequest,
  UpdateBlueprintRequest,
  SearchBlueprintsParams,
  PublishAsTemplateRequest,
  RateTemplateRequest,
} from '@/types/blueprint';

// Query keys for blueprint caching
export const blueprintKeys = {
  all: ['blueprints'] as const,
  lists: () => [...blueprintKeys.all, 'list'] as const,
  list: (filters: SearchBlueprintsParams) => [...blueprintKeys.lists(), filters] as const,
  details: () => [...blueprintKeys.all, 'detail'] as const,
  detail: (slugOrId: string) => [...blueprintKeys.details(), slugOrId] as const,
  featured: () => [...blueprintKeys.all, 'featured'] as const,
  byCategory: (category: string) => [...blueprintKeys.all, 'category', category] as const,
  byAuthor: (authorId: string) => [...blueprintKeys.all, 'author', authorId] as const,
};

// Fetch blueprints with optional filters
async function fetchBlueprints(params?: SearchBlueprintsParams): Promise<Blueprint[]> {
  const queryParams = new URLSearchParams();

  if (params?.category) queryParams.set('category', params.category);
  if (params?.subcategory) queryParams.set('subcategory', params.subcategory);
  if (params?.authorId) queryParams.set('author_id', params.authorId);
  if (params?.isFeatured !== undefined) queryParams.set('is_featured', String(params.isFeatured));
  if (params?.isCommunity !== undefined) queryParams.set('is_community', String(params.isCommunity));
  if (params?.search) queryParams.set('search', params.search);
  if (params?.limit) queryParams.set('limit', String(params.limit));
  if (params?.offset) queryParams.set('offset', String(params.offset));
  if (params?.sort) queryParams.set('sort', params.sort);

  const url = `/api/blueprints${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch blueprints');
  }

  return response.json();
}

// Fetch a single blueprint by slug or ID
async function fetchBlueprint(slugOrId: string): Promise<Blueprint> {
  const response = await fetch(`/api/blueprints/${slugOrId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Blueprint not found');
    }
    throw new Error('Failed to fetch blueprint');
  }

  return response.json();
}

// Record a single blueprint view (fire-once, decoupled from the detail GET so
// refetches don't inflate the count). Best-effort: never throws into the UI.
export async function trackBlueprintView(slugOrId: string): Promise<void> {
  try {
    await fetch(`/api/blueprints/${slugOrId}/view`, { method: 'POST' });
  } catch {
    // View tracking is non-critical; swallow network errors.
  }
}

// Create a new blueprint
async function createBlueprint(data: CreateBlueprintRequest): Promise<{ blueprint: Blueprint; shareUrl: string }> {
  const response = await fetch('/api/blueprints', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create blueprint');
  }

  return response.json();
}

// Update a blueprint
async function updateBlueprint(slugOrId: string, data: UpdateBlueprintRequest): Promise<Blueprint> {
  const response = await fetch(`/api/blueprints/${slugOrId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update blueprint');
  }

  return response.json();
}

// Delete a blueprint
async function deleteBlueprint(slugOrId: string): Promise<void> {
  const response = await fetch(`/api/blueprints/${slugOrId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete blueprint');
  }
}

// Clone a blueprint and create a list from it
async function cloneBlueprint(
  slugOrId: string,
  options?: {
    title?: string;
    userId?: string;
    timePeriod?: string;
    size?: number;
  }
): Promise<{ list: { id: string }; blueprint: Blueprint }> {
  const response = await fetch(`/api/blueprints/${slugOrId}/clone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options || {}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to clone blueprint');
  }

  return response.json();
}

// Hook to fetch blueprints with filters
export function useBlueprints(params?: SearchBlueprintsParams) {
  return useQuery({
    queryKey: blueprintKeys.list(params || {}),
    queryFn: () => fetchBlueprints(params),
    staleTime: CACHE_TTL_MS.LONG, // Blueprints are reference data
    gcTime: GC_TIME_MS.LONG,
  });
}

// Hook to fetch featured blueprints
export function useFeaturedBlueprints() {
  return useQuery({
    queryKey: blueprintKeys.featured(),
    queryFn: () => fetchBlueprints({ isFeatured: true, limit: 20 }),
    staleTime: CACHE_TTL_MS.LONG, // Featured blueprints rarely change
    gcTime: GC_TIME_MS.LONG,
  });
}

// Hook to fetch blueprints by category
export function useBlueprintsByCategory(category: string) {
  return useQuery({
    queryKey: blueprintKeys.byCategory(category),
    queryFn: () => fetchBlueprints({ category }),
    enabled: !!category,
    staleTime: CACHE_TTL_MS.LONG,
    gcTime: GC_TIME_MS.LONG,
  });
}

// Hook to fetch blueprints by author
export function useBlueprintsByAuthor(authorId: string) {
  return useQuery({
    queryKey: blueprintKeys.byAuthor(authorId),
    queryFn: () => fetchBlueprints({ authorId }),
    enabled: !!authorId,
    staleTime: CACHE_TTL_MS.STANDARD, // Author-specific data changes more often
    gcTime: GC_TIME_MS.STANDARD,
  });
}

// Hook to fetch a single blueprint
export function useBlueprint(slugOrId: string) {
  return useQuery({
    queryKey: blueprintKeys.detail(slugOrId),
    queryFn: () => fetchBlueprint(slugOrId),
    enabled: !!slugOrId,
    staleTime: CACHE_TTL_MS.LONG,
    gcTime: GC_TIME_MS.LONG,
  });
}

// Hook to create a blueprint
export function useCreateBlueprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBlueprint,
    onSuccess: () => {
      // Invalidate all blueprint lists to refetch
      queryClient.invalidateQueries({ queryKey: blueprintKeys.lists() });
    },
  });
}

// Hook to update a blueprint
export function useUpdateBlueprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slugOrId, data }: { slugOrId: string; data: UpdateBlueprintRequest }) =>
      updateBlueprint(slugOrId, data),
    onSuccess: (_, variables) => {
      // Invalidate the specific blueprint and all lists
      queryClient.invalidateQueries({ queryKey: blueprintKeys.detail(variables.slugOrId) });
      queryClient.invalidateQueries({ queryKey: blueprintKeys.lists() });
    },
  });
}

// Hook to delete a blueprint
export function useDeleteBlueprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBlueprint,
    onSuccess: (_, slugOrId) => {
      // Invalidate the specific blueprint and all lists
      queryClient.invalidateQueries({ queryKey: blueprintKeys.detail(slugOrId) });
      queryClient.invalidateQueries({ queryKey: blueprintKeys.lists() });
    },
  });
}

// Hook to clone a blueprint
export function useCloneBlueprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slugOrId, options }: { slugOrId: string; options?: Parameters<typeof cloneBlueprint>[1] }) =>
      cloneBlueprint(slugOrId, options),
    onSuccess: (_, variables) => {
      // Invalidate the blueprint to update clone count
      queryClient.invalidateQueries({ queryKey: blueprintKeys.detail(variables.slugOrId) });
    },
  });
}

// Hook to fetch community templates
export function useCommunityTemplates(params?: Omit<SearchBlueprintsParams, 'isCommunity'>) {
  const fullParams: SearchBlueprintsParams = { ...params, isCommunity: true };
  return useQuery({
    queryKey: [...blueprintKeys.all, 'community', fullParams] as const,
    queryFn: () => fetchBlueprints(fullParams),
    staleTime: CACHE_TTL_MS.STANDARD,
    gcTime: GC_TIME_MS.STANDARD,
  });
}

// Publish a list as a community template
async function publishAsTemplate(data: PublishAsTemplateRequest): Promise<{ blueprint: Blueprint; shareUrl: string }> {
  const response = await fetch('/api/blueprints/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to publish template');
  }

  const json = await response.json();
  return json.data ?? json;
}

// Hook to publish a list as a community template
export function usePublishAsTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: publishAsTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blueprintKeys.all });
    },
  });
}

// Rate a community template
async function rateTemplate(slugOrId: string, data: RateTemplateRequest): Promise<{ avgRating: number; ratingCount: number; userRating: number }> {
  const response = await fetch(`/api/blueprints/${slugOrId}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to rate template');
  }

  const json = await response.json();
  return json.data ?? json;
}

// Fetch current user's rating for a template
async function fetchUserRating(slugOrId: string): Promise<{ userRating: number | null }> {
  const response = await fetch(`/api/blueprints/${slugOrId}/rate`);
  if (!response.ok) return { userRating: null };
  const json = await response.json();
  return json.data ?? json;
}

// Hook to rate a template
export function useRateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slugOrId, rating }: { slugOrId: string; rating: number }) =>
      rateTemplate(slugOrId, { rating }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: blueprintKeys.detail(variables.slugOrId) });
      queryClient.invalidateQueries({ queryKey: [...blueprintKeys.all, 'community'] });
      queryClient.invalidateQueries({ queryKey: [...blueprintKeys.all, 'user-rating', variables.slugOrId] });
    },
  });
}

// Hook to get current user's rating
export function useUserRating(slugOrId: string) {
  return useQuery({
    queryKey: [...blueprintKeys.all, 'user-rating', slugOrId] as const,
    queryFn: () => fetchUserRating(slugOrId),
    enabled: !!slugOrId,
    staleTime: CACHE_TTL_MS.STANDARD,
    gcTime: GC_TIME_MS.STANDARD,
  });
}

// Generate share URL for a blueprint
export function generateBlueprintShareUrl(blueprint: Blueprint): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/blueprint/${blueprint.slug || blueprint.id}`;
}

// Copy share URL to clipboard
export async function copyBlueprintShareUrl(blueprint: Blueprint): Promise<boolean> {
  const url = generateBlueprintShareUrl(blueprint);

  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
