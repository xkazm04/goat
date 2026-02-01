/**
 * Criteria Query Keys
 * Centralized query key factory for criteria-related data caching
 */

export const criteriaKeys = {
  // Root key
  all: ['criteria'] as const,

  // Config queries - criteria configuration for a list
  config: () => [...criteriaKeys.all, 'config'] as const,
  configByList: (listId: string) =>
    [...criteriaKeys.config(), listId] as const,

  // Scores queries - item scores within a list
  scores: () => [...criteriaKeys.all, 'scores'] as const,
  scoresByList: (listId: string) =>
    [...criteriaKeys.scores(), 'list', listId] as const,
  scoresByItem: (listId: string, itemId: string) =>
    [...criteriaKeys.scores(), 'item', listId, itemId] as const,

  // Profiles queries - user criteria profiles
  profiles: () => [...criteriaKeys.all, 'profiles'] as const,
  profileById: (profileId: string) =>
    [...criteriaKeys.profiles(), profileId] as const,
  profilesByCategory: (category: string) =>
    [...criteriaKeys.profiles(), 'category', category] as const,

  // Suggestions queries - ranking suggestions based on scores
  suggestions: () => [...criteriaKeys.all, 'suggestions'] as const,
  suggestionsByList: (listId: string, itemIds: string[]) =>
    [...criteriaKeys.suggestions(), listId, { itemIds }] as const,

  // Mutations - used for cache invalidation
  mutations: {
    saveConfig: (listId: string) =>
      [...criteriaKeys.all, 'mutations', 'save-config', listId] as const,
    saveScore: (listId: string, itemId: string) =>
      [...criteriaKeys.all, 'mutations', 'save-score', listId, itemId] as const,
    batchSaveScores: (listId: string) =>
      [...criteriaKeys.all, 'mutations', 'batch-save', listId] as const,
  },
};

// Type exports for external use
export type CriteriaQueryKeys = typeof criteriaKeys;
