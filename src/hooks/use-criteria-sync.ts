/**
 * Criteria Sync Hook
 *
 * Bridges the Zustand criteria store with TanStack Query hooks.
 * Provides a unified API for syncing criteria data between local state and the database.
 *
 * This hook manages the coordination between:
 * 1. Local Zustand store (immediate UI updates)
 * 2. TanStack Query cache (API response caching, deduplication)
 * 3. Database (persistent storage)
 *
 * @example
 * ```tsx
 * function CriteriaScoringPanel({ listId, itemId }) {
 *   const {
 *     config,
 *     isLoading,
 *     saveScore,
 *     isSaving,
 *   } = useCriteriaSync(listId);
 *
 *   const handleScore = (criterionId: string, score: number) => {
 *     saveScore({ itemId, criterionId, score });
 *   };
 *
 *   // ... render scoring UI
 * }
 * ```
 */

import { useCallback, useEffect } from 'react';
import { useCriteriaStore } from '@/stores/criteria-store';
import {
  useCriteriaConfig,
  useListItemScores,
  useSaveItemScores,
  useSaveCriteriaConfig,
  useBatchSaveItemScores,
  useCriteriaCache,
} from './use-criteria-queries';
import type {
  CriteriaProfile,
  CriterionScore,
  ItemCriteriaScores,
  ListCriteriaConfig,
  ListItemCriteriaScores,
} from '@/lib/criteria/types';

// =============================================================================
// Types
// =============================================================================

interface UseCriteriaSyncOptions {
  /** Auto-load data from database on mount */
  autoLoad?: boolean;
  /** Debounce delay for auto-save (ms). Set to 0 to disable. */
  autoSaveDelay?: number;
  /** Sync scores to local store when loaded from database */
  syncToLocalStore?: boolean;
}

interface UseCriteriaSyncReturn {
  // Data
  config: ListCriteriaConfig | null;
  scores: Map<string, ListItemCriteriaScores>;
  activeProfile: CriteriaProfile | null;

  // Loading states
  isLoadingConfig: boolean;
  isLoadingScores: boolean;
  isLoading: boolean;

  // Error states
  configError: Error | null;
  scoresError: Error | null;
  error: Error | null;

  // Mutation states
  isSavingConfig: boolean;
  isSavingScore: boolean;
  isBatchSaving: boolean;
  isSaving: boolean;

  // Actions
  loadConfig: () => void;
  loadScores: () => void;
  reload: () => void;
  saveConfig: (config: ListCriteriaConfig) => Promise<void>;
  saveScore: (params: {
    itemId: string;
    scores: CriterionScore[];
    justification?: string;
  }) => Promise<void>;
  batchSaveScores: (
    items: Array<{ itemId: string; criteriaScores: ListItemCriteriaScores }>
  ) => Promise<void>;
  prefetch: () => void;

  // Cache utilities
  invalidateConfig: () => void;
  invalidateScores: () => void;
  invalidateAll: () => void;

  // Local store integration
  syncLocalToRemote: () => Promise<void>;
  syncRemoteToLocal: () => void;
}

// =============================================================================
// Main Hook
// =============================================================================

export function useCriteriaSync(
  listId: string | null | undefined,
  options: UseCriteriaSyncOptions = {}
): UseCriteriaSyncReturn {
  const {
    autoLoad = true,
    syncToLocalStore = true,
  } = options;

  // Zustand store state and actions
  const {
    activeProfileId,
    profiles,
    itemScores: localItemScores,
    setActiveProfile,
    getActiveProfile,
  } = useCriteriaStore();

  const activeProfile = getActiveProfile();

  // TanStack Query hooks
  const configQuery = useCriteriaConfig(listId, { enabled: autoLoad && !!listId });
  const scoresQuery = useListItemScores(listId, { enabled: autoLoad && !!listId });
  const saveConfigMutation = useSaveCriteriaConfig();
  const saveScoreMutation = useSaveItemScores();
  const batchSaveMutation = useBatchSaveItemScores();
  const cache = useCriteriaCache();

  // =============================================================================
  // Sync remote data to local store
  // =============================================================================

  useEffect(() => {
    if (!syncToLocalStore || !listId) return;

    // Sync config to local store
    if (configQuery.data?.criteriaConfig) {
      const config = configQuery.data.criteriaConfig;

      // Check if profile exists locally
      const existingProfile = profiles.find((p) => p.id === config.profileId);

      if (!existingProfile) {
        // Profile doesn't exist locally - would need to create it
        // This is handled by the criteria-store's loadFromDatabase
        // For now, just set the active profile if it exists
      }

      // Set active profile if different
      if (activeProfileId !== config.profileId) {
        const localProfile = profiles.find((p) => p.id === config.profileId);
        if (localProfile) {
          setActiveProfile(config.profileId);
        }
      }
    }

    // Note: Scores from remote are available via the TanStack Query cache.
    // The local Zustand store maintains its own item scores for immediate UI updates.
    // If you need to sync remote scores to local store, use syncRemoteToLocal()
    // which triggers a refetch and the data becomes available via the scores Map.
  }, [
    syncToLocalStore,
    listId,
    configQuery.data,
    scoresQuery.data,
    activeProfileId,
    profiles,
    setActiveProfile,
  ]);

  // =============================================================================
  // Convert scores array to Map
  // =============================================================================

  const scoresMap = new Map<string, ListItemCriteriaScores>();
  if (scoresQuery.data?.items) {
    for (const item of scoresQuery.data.items) {
      if (item.criteriaScores) {
        scoresMap.set(item.itemId, item.criteriaScores);
      }
    }
  }

  // =============================================================================
  // Actions
  // =============================================================================

  const loadConfig = useCallback(() => {
    if (listId) {
      configQuery.refetch();
    }
  }, [listId, configQuery]);

  const loadScores = useCallback(() => {
    if (listId) {
      scoresQuery.refetch();
    }
  }, [listId, scoresQuery]);

  const reload = useCallback(() => {
    loadConfig();
    loadScores();
  }, [loadConfig, loadScores]);

  const saveConfig = useCallback(
    async (config: ListCriteriaConfig) => {
      if (!listId) throw new Error('No list ID provided');

      await saveConfigMutation.mutateAsync({
        listId,
        criteriaConfig: config,
      });
    },
    [listId, saveConfigMutation]
  );

  const saveScore = useCallback(
    async (params: {
      itemId: string;
      scores: CriterionScore[];
      justification?: string;
    }) => {
      if (!listId) throw new Error('No list ID provided');
      if (!activeProfileId) throw new Error('No active profile');

      await saveScoreMutation.mutateAsync({
        listId,
        itemId: params.itemId,
        scores: params.scores,
        profileId: activeProfileId,
        justification: params.justification,
      });
    },
    [listId, activeProfileId, saveScoreMutation]
  );

  const batchSaveScores = useCallback(
    async (
      items: Array<{ itemId: string; criteriaScores: ListItemCriteriaScores }>
    ) => {
      if (!listId) throw new Error('No list ID provided');

      await batchSaveMutation.mutateAsync({
        listId,
        items,
      });
    },
    [listId, batchSaveMutation]
  );

  const prefetch = useCallback(() => {
    if (listId) {
      cache.prefetchConfig(listId);
      cache.prefetchListScores(listId);
    }
  }, [listId, cache]);

  // =============================================================================
  // Cache utilities
  // =============================================================================

  const invalidateConfig = useCallback(() => {
    if (listId) {
      cache.invalidateConfig(listId);
    }
  }, [listId, cache]);

  const invalidateScores = useCallback(() => {
    if (listId) {
      cache.invalidateListScores(listId);
    }
  }, [listId, cache]);

  const invalidateAll = useCallback(() => {
    cache.invalidateAll();
  }, [cache]);

  // =============================================================================
  // Local/Remote sync helpers
  // =============================================================================

  /**
   * Sync local store scores to remote database
   */
  const syncLocalToRemote = useCallback(async () => {
    if (!listId || !activeProfileId) return;

    // Collect all local scores for this profile
    const items: Array<{
      itemId: string;
      criteriaScores: ListItemCriteriaScores;
    }> = [];

    for (const [key, scores] of Object.entries(localItemScores)) {
      if (key.endsWith(`:${activeProfileId}`)) {
        items.push({
          itemId: scores.itemId,
          criteriaScores: {
            profileId: scores.profileId,
            scores: scores.scores,
            weightedScore: scores.weightedScore,
            justification: scores.justification,
            scoredAt: scores.scoredAt,
          },
        });
      }
    }

    if (items.length > 0) {
      await batchSaveScores(items);
    }
  }, [listId, activeProfileId, localItemScores, batchSaveScores]);

  /**
   * Sync remote data to local store (triggers refetch)
   */
  const syncRemoteToLocal = useCallback(() => {
    reload();
  }, [reload]);

  // =============================================================================
  // Computed states
  // =============================================================================

  const isLoadingConfig = configQuery.isLoading;
  const isLoadingScores = scoresQuery.isLoading;
  const isLoading = isLoadingConfig || isLoadingScores;

  const configError = configQuery.error;
  const scoresError = scoresQuery.error;
  const error = configError || scoresError;

  const isSavingConfig = saveConfigMutation.isPending;
  const isSavingScore = saveScoreMutation.isPending;
  const isBatchSaving = batchSaveMutation.isPending;
  const isSaving = isSavingConfig || isSavingScore || isBatchSaving;

  // =============================================================================
  // Return
  // =============================================================================

  return {
    // Data
    config: configQuery.data?.criteriaConfig ?? null,
    scores: scoresMap,
    activeProfile,

    // Loading states
    isLoadingConfig,
    isLoadingScores,
    isLoading,

    // Error states
    configError,
    scoresError,
    error,

    // Mutation states
    isSavingConfig,
    isSavingScore,
    isBatchSaving,
    isSaving,

    // Actions
    loadConfig,
    loadScores,
    reload,
    saveConfig,
    saveScore,
    batchSaveScores,
    prefetch,

    // Cache utilities
    invalidateConfig,
    invalidateScores,
    invalidateAll,

    // Local store integration
    syncLocalToRemote,
    syncRemoteToLocal,
  };
}

// =============================================================================
// Specialized Hooks
// =============================================================================

/**
 * Hook for scoring a single item with optimistic updates
 */
export function useItemScoring(
  listId: string | null | undefined,
  itemId: string | null | undefined
) {
  const { activeProfileId, setItemScore, getItemScores } = useCriteriaStore();
  const saveMutation = useSaveItemScores();

  const localScores = itemId ? getItemScores(itemId) : null;

  const setScore = useCallback(
    async (
      criterionId: string,
      score: number,
      options?: { note?: string; autoSave?: boolean }
    ) => {
      if (!itemId) return;

      // Update local store immediately (optimistic)
      setItemScore(itemId, criterionId, score, options?.note);

      // Auto-save to database if enabled
      if (options?.autoSave && listId && activeProfileId) {
        const currentScores = getItemScores(itemId);
        if (currentScores) {
          await saveMutation.mutateAsync({
            listId,
            itemId,
            scores: currentScores.scores,
            profileId: activeProfileId,
            justification: currentScores.justification,
          });
        }
      }
    },
    [
      itemId,
      listId,
      activeProfileId,
      setItemScore,
      getItemScores,
      saveMutation,
    ]
  );

  const saveScores = useCallback(async () => {
    if (!listId || !itemId || !activeProfileId) return;

    const currentScores = getItemScores(itemId);
    if (!currentScores) return;

    await saveMutation.mutateAsync({
      listId,
      itemId,
      scores: currentScores.scores,
      profileId: activeProfileId,
      justification: currentScores.justification,
    });
  }, [listId, itemId, activeProfileId, getItemScores, saveMutation]);

  return {
    scores: localScores,
    setScore,
    saveScores,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
  };
}

/**
 * Hook for managing criteria config with TanStack Query
 */
export function useCriteriaConfigManager(listId: string | null | undefined) {
  const configQuery = useCriteriaConfig(listId);
  const saveMutation = useSaveCriteriaConfig();
  const cache = useCriteriaCache();
  const { profiles, getActiveProfile } = useCriteriaStore();

  const activeProfile = getActiveProfile();

  const saveCurrentProfile = useCallback(async () => {
    if (!listId || !activeProfile) return;

    const config: ListCriteriaConfig = {
      profileId: activeProfile.id,
      profileName: activeProfile.name,
      criteria: activeProfile.criteria,
      createdAt: activeProfile.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await saveMutation.mutateAsync({
      listId,
      criteriaConfig: config,
    });
  }, [listId, activeProfile, saveMutation]);

  const clearConfig = useCallback(async () => {
    if (!listId) return;

    await saveMutation.mutateAsync({
      listId,
      criteriaConfig: null,
    });
  }, [listId, saveMutation]);

  return {
    config: configQuery.data?.criteriaConfig ?? null,
    isLoading: configQuery.isLoading,
    error: configQuery.error,
    activeProfile,
    profiles,
    saveCurrentProfile,
    clearConfig,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
    refetch: configQuery.refetch,
    invalidate: () => listId && cache.invalidateConfig(listId),
  };
}
