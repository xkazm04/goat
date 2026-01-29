/**
 * Criteria Store
 * Zustand store for criteria-based scoring state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CriteriaProfile,
  Criterion,
  ItemCriteriaScores,
  CriterionScore,
  RankingSuggestion,
  ScoreInputMode,
  CriteriaProfileExport,
  ListCriteriaConfig,
  ListItemCriteriaScores,
} from '@/lib/criteria/types';
import { CriteriaManager, createCriteriaManager } from '@/lib/criteria/CriteriaManager';
import { ALL_TEMPLATES } from '@/lib/criteria/templates';
import {
  fetchListCriteria,
  saveListCriteria,
  fetchListItemScores,
  saveItemScores,
  batchSaveItemScores,
} from '@/lib/api/criteria';

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Criteria store state
 */
interface CriteriaStoreState {
  // Profiles
  profiles: CriteriaProfile[];
  activeProfileId: string | null;

  // Item scores - keyed by "itemId:profileId"
  itemScores: Record<string, ItemCriteriaScores>;

  // UI state
  scoreInputMode: ScoreInputMode;
  isPanelVisible: boolean;
  isLoading: boolean;
  error: string | null;

  // Database sync state
  currentListId: string | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncAt: string | null;

  // Manager instance (not persisted)
  _manager: CriteriaManager | null;
}

/**
 * Criteria store actions
 */
interface CriteriaStoreActions {
  // Initialization
  initialize: () => void;
  _getManager: () => CriteriaManager;

  // Profile management
  createProfile: (data: Omit<CriteriaProfile, 'id' | 'createdAt' | 'updatedAt'>) => CriteriaProfile;
  updateProfile: (id: string, updates: Partial<CriteriaProfile>) => void;
  deleteProfile: (id: string) => void;
  duplicateProfile: (id: string, newName: string) => CriteriaProfile | null;

  // Active profile
  setActiveProfile: (id: string | null) => void;
  getActiveProfile: () => CriteriaProfile | null;

  // Criterion management
  addCriterion: (profileId: string, criterion: Omit<Criterion, 'id'>) => void;
  updateCriterion: (profileId: string, criterionId: string, updates: Partial<Criterion>) => void;
  removeCriterion: (profileId: string, criterionId: string) => void;
  reorderCriteria: (profileId: string, fromIndex: number, toIndex: number) => void;

  // Scoring
  setItemScore: (itemId: string, criterionId: string, score: number, note?: string) => void;
  setItemJustification: (itemId: string, justification: string) => void;
  getItemScores: (itemId: string) => ItemCriteriaScores | null;
  calculateWeightedScore: (itemId: string) => number;
  clearItemScores: (itemId: string) => void;
  clearAllScores: () => void;

  // Ranking suggestions
  getRankingSuggestions: (itemIds: string[]) => RankingSuggestion[];

  // Sharing
  generateShareCode: (profileId: string) => string | null;
  exportProfile: (profileId: string) => CriteriaProfileExport | null;
  importProfile: (data: CriteriaProfileExport) => CriteriaProfile | null;

  // UI state
  setScoreInputMode: (mode: ScoreInputMode) => void;
  togglePanelVisibility: () => void;
  setPanelVisibility: (visible: boolean) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Database sync actions
  setCurrentList: (listId: string | null) => void;
  loadFromDatabase: (listId: string) => Promise<void>;
  saveToDatabase: (listId: string) => Promise<void>;
  syncItemScoresToDatabase: (listId: string, itemId: string) => Promise<void>;
  syncAllScoresToDatabase: (listId: string) => Promise<void>;
}

/**
 * Complete store type
 */
type CriteriaStore = CriteriaStoreState & CriteriaStoreActions;

/**
 * Create the criteria store
 */
export const useCriteriaStore = create<CriteriaStore>()(
  persist(
    (set, get) => ({
      // Initial state
      profiles: [...ALL_TEMPLATES],
      activeProfileId: null,
      itemScores: {},
      scoreInputMode: 'slider',
      isPanelVisible: false,
      isLoading: false,
      error: null,
      currentListId: null,
      syncStatus: 'idle',
      lastSyncAt: null,
      _manager: null,

      // Initialize manager and load templates
      initialize: () => {
        const state = get();
        if (state._manager) return;

        const manager = createCriteriaManager();
        manager.loadTemplates(ALL_TEMPLATES);
        manager.loadProfiles(state.profiles.filter((p) => !p.isTemplate));

        // Load item scores
        const scores = Object.values(state.itemScores);
        manager.loadItemScores(scores);

        set({ _manager: manager });
      },

      _getManager: () => {
        const state = get();
        if (!state._manager) {
          get().initialize();
        }
        return get()._manager!;
      },

      // Profile management
      createProfile: (data) => {
        const manager = get()._getManager();
        const profile = manager.createProfile(data);

        set((state) => ({
          profiles: [...state.profiles, profile],
        }));

        return profile;
      },

      updateProfile: (id, updates) => {
        const manager = get()._getManager();
        const updated = manager.updateProfile(id, updates);
        if (!updated) return;

        set((state) => ({
          profiles: state.profiles.map((p) => (p.id === id ? updated : p)),
        }));
      },

      deleteProfile: (id) => {
        const state = get();
        const profile = state.profiles.find((p) => p.id === id);
        if (!profile || profile.isTemplate) return;

        const manager = get()._getManager();
        manager.deleteProfile(id);

        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== id),
          activeProfileId: state.activeProfileId === id ? null : state.activeProfileId,
        }));
      },

      duplicateProfile: (id, newName) => {
        const manager = get()._getManager();
        const duplicated = manager.duplicateProfile(id, newName);
        if (!duplicated) return null;

        set((state) => ({
          profiles: [...state.profiles, duplicated],
        }));

        return duplicated;
      },

      // Active profile
      setActiveProfile: (id) => {
        set({ activeProfileId: id });
      },

      getActiveProfile: () => {
        const state = get();
        if (!state.activeProfileId) return null;
        return state.profiles.find((p) => p.id === state.activeProfileId) ?? null;
      },

      // Criterion management
      addCriterion: (profileId, criterionData) => {
        const state = get();
        const profile = state.profiles.find((p) => p.id === profileId);
        if (!profile || profile.isTemplate) return;

        const criterion: Criterion = {
          ...criterionData,
          id: generateId(),
        };

        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === profileId
              ? {
                  ...p,
                  criteria: [...p.criteria, criterion],
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      updateCriterion: (profileId, criterionId, updates) => {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === profileId && !p.isTemplate
              ? {
                  ...p,
                  criteria: p.criteria.map((c) =>
                    c.id === criterionId ? { ...c, ...updates, id: criterionId } : c
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      removeCriterion: (profileId, criterionId) => {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === profileId && !p.isTemplate
              ? {
                  ...p,
                  criteria: p.criteria.filter((c) => c.id !== criterionId),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      reorderCriteria: (profileId, fromIndex, toIndex) => {
        set((state) => ({
          profiles: state.profiles.map((p) => {
            if (p.id !== profileId || p.isTemplate) return p;
            const criteria = [...p.criteria];
            const [removed] = criteria.splice(fromIndex, 1);
            criteria.splice(toIndex, 0, removed);
            return { ...p, criteria, updatedAt: new Date().toISOString() };
          }),
        }));
      },

      // Scoring
      setItemScore: (itemId, criterionId, score, note) => {
        const state = get();
        if (!state.activeProfileId) return;

        const profile = state.profiles.find((p) => p.id === state.activeProfileId);
        if (!profile) return;

        const criterion = profile.criteria.find((c) => c.id === criterionId);
        if (!criterion) return;

        // Clamp score
        const clampedScore = Math.max(
          criterion.minScore,
          Math.min(criterion.maxScore, score)
        );

        const key = `${itemId}:${state.activeProfileId}`;
        const existing = state.itemScores[key];

        const criterionScore: CriterionScore = {
          criterionId,
          score: clampedScore,
          note,
        };

        let scores: CriterionScore[];
        if (existing) {
          const existingIndex = existing.scores.findIndex(
            (s) => s.criterionId === criterionId
          );
          if (existingIndex >= 0) {
            scores = [...existing.scores];
            scores[existingIndex] = criterionScore;
          } else {
            scores = [...existing.scores, criterionScore];
          }
        } else {
          scores = [criterionScore];
        }

        // Calculate weighted score
        const totalWeight = profile.criteria.reduce((sum, c) => sum + c.weight, 0);
        let weightedSum = 0;
        for (const s of scores) {
          const c = profile.criteria.find((cr) => cr.id === s.criterionId);
          if (!c) continue;
          const normalized = (s.score - c.minScore) / (c.maxScore - c.minScore);
          weightedSum += normalized * c.weight;
        }
        const weightedScore =
          totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100 * 100) / 100 : 0;

        const itemScores: ItemCriteriaScores = {
          itemId,
          profileId: state.activeProfileId,
          scores,
          weightedScore,
          justification: existing?.justification,
          scoredAt: new Date().toISOString(),
        };

        set((state) => ({
          itemScores: {
            ...state.itemScores,
            [key]: itemScores,
          },
        }));
      },

      setItemJustification: (itemId, justification) => {
        const state = get();
        if (!state.activeProfileId) return;

        const key = `${itemId}:${state.activeProfileId}`;
        const existing = state.itemScores[key];
        if (!existing) return;

        set((state) => ({
          itemScores: {
            ...state.itemScores,
            [key]: { ...existing, justification },
          },
        }));
      },

      getItemScores: (itemId) => {
        const state = get();
        if (!state.activeProfileId) return null;
        const key = `${itemId}:${state.activeProfileId}`;
        return state.itemScores[key] ?? null;
      },

      calculateWeightedScore: (itemId) => {
        const state = get();
        if (!state.activeProfileId) return 0;
        const key = `${itemId}:${state.activeProfileId}`;
        return state.itemScores[key]?.weightedScore ?? 0;
      },

      clearItemScores: (itemId) => {
        const state = get();
        if (!state.activeProfileId) return;
        const key = `${itemId}:${state.activeProfileId}`;

        set((state) => {
          const { [key]: removed, ...rest } = state.itemScores;
          return { itemScores: rest };
        });
      },

      clearAllScores: () => {
        set({ itemScores: {} });
      },

      // Ranking suggestions
      getRankingSuggestions: (itemIds) => {
        const state = get();
        if (!state.activeProfileId) return [];

        const profile = state.profiles.find((p) => p.id === state.activeProfileId);
        if (!profile) return [];

        const itemsWithScores = itemIds.map((itemId) => {
          const key = `${itemId}:${state.activeProfileId}`;
          const scores = state.itemScores[key];
          return {
            itemId,
            weightedScore: scores?.weightedScore ?? 0,
            hasAllScores: scores
              ? profile.criteria.every((c) =>
                  scores.scores.some((s) => s.criterionId === c.id)
                )
              : false,
          };
        });

        // Sort by weighted score descending
        itemsWithScores.sort((a, b) => b.weightedScore - a.weightedScore);

        return itemsWithScores.map((item, index) => ({
          itemId: item.itemId,
          suggestedPosition: index + 1,
          weightedScore: item.weightedScore,
          confidence: item.hasAllScores ? 1 : 0.5,
          reasoning: item.hasAllScores
            ? `Ranked #${index + 1} with score ${item.weightedScore.toFixed(1)}`
            : `Partial score: ${item.weightedScore.toFixed(1)} (incomplete criteria)`,
        }));
      },

      // Sharing
      generateShareCode: (profileId) => {
        const state = get();
        const profile = state.profiles.find((p) => p.id === profileId);
        if (!profile) return null;

        const data = {
          n: profile.name,
          c: profile.category,
          cr: profile.criteria.map((c) => ({
            n: c.name,
            w: c.weight,
            d: c.description.slice(0, 50),
          })),
        };
        const shareCode = btoa(encodeURIComponent(JSON.stringify(data)))
          .replace(/=/g, '')
          .slice(0, 32);

        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === profileId ? { ...p, shareCode } : p
          ),
        }));

        return shareCode;
      },

      exportProfile: (profileId) => {
        const state = get();
        const profile = state.profiles.find((p) => p.id === profileId);
        if (!profile) return null;

        const { id, createdAt, updatedAt, usageCount, ...rest } = profile;
        return {
          version: '1.0',
          profile: rest,
          exportedAt: new Date().toISOString(),
        };
      },

      importProfile: (data) => {
        if (!data.version || !data.profile) return null;

        const profile = get().createProfile({
          ...data.profile,
          criteria: data.profile.criteria.map((c) => ({ ...c, id: generateId() })),
          isTemplate: false,
        });

        return profile;
      },

      // UI state
      setScoreInputMode: (mode) => set({ scoreInputMode: mode }),

      togglePanelVisibility: () =>
        set((state) => ({ isPanelVisible: !state.isPanelVisible })),

      setPanelVisibility: (visible) => set({ isPanelVisible: visible }),

      // Error handling
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Database sync actions
      setCurrentList: (listId) => {
        set({ currentListId: listId });
      },

      loadFromDatabase: async (listId) => {
        set({ syncStatus: 'syncing' });
        try {
          const { criteriaConfig } = await fetchListCriteria(listId);

          if (criteriaConfig) {
            // Check if profile exists in store
            const state = get();
            const existingProfile = state.profiles.find(
              (p) => p.id === criteriaConfig.profileId
            );

            if (!existingProfile) {
              // Create profile from DB config
              const profile: CriteriaProfile = {
                id: criteriaConfig.profileId,
                name: criteriaConfig.profileName,
                description: `Loaded from list ${listId}`,
                category: 'universal',
                criteria: criteriaConfig.criteria,
                isTemplate: false,
                createdBy: null,
                createdAt: criteriaConfig.createdAt,
                updatedAt: criteriaConfig.updatedAt,
              };
              set((state) => ({
                profiles: [...state.profiles, profile],
              }));
            }

            set({ activeProfileId: criteriaConfig.profileId });
          }

          // Load item scores
          const { items } = await fetchListItemScores(listId);
          const itemScoresMap: Record<string, ItemCriteriaScores> = {};

          for (const item of items) {
            if (item.criteriaScores) {
              const key = `${item.itemId}:${item.criteriaScores.profileId}`;
              itemScoresMap[key] = {
                itemId: item.itemId,
                profileId: item.criteriaScores.profileId,
                scores: item.criteriaScores.scores,
                weightedScore: item.criteriaScores.weightedScore,
                justification: item.criteriaScores.justification,
                scoredAt: item.criteriaScores.scoredAt,
              };
            }
          }

          set((state) => ({
            itemScores: { ...state.itemScores, ...itemScoresMap },
            currentListId: listId,
            syncStatus: 'idle',
            lastSyncAt: new Date().toISOString(),
          }));
        } catch (error) {
          console.error('Failed to load criteria from database:', error);
          set({ syncStatus: 'error' });
        }
      },

      saveToDatabase: async (listId) => {
        const state = get();
        const profile = state.getActiveProfile();

        if (!profile) return;

        set({ syncStatus: 'syncing' });
        try {
          const criteriaConfig: ListCriteriaConfig = {
            profileId: profile.id,
            profileName: profile.name,
            criteria: profile.criteria,
            createdAt: profile.createdAt,
            updatedAt: new Date().toISOString(),
          };

          await saveListCriteria(listId, criteriaConfig);
          set({ syncStatus: 'idle', lastSyncAt: new Date().toISOString() });
        } catch (error) {
          console.error('Failed to save criteria to database:', error);
          set({ syncStatus: 'error' });
        }
      },

      syncItemScoresToDatabase: async (listId, itemId) => {
        const state = get();
        if (!state.activeProfileId) return;

        const key = `${itemId}:${state.activeProfileId}`;
        const scores = state.itemScores[key];

        if (!scores) return;

        try {
          await saveItemScores(
            listId,
            itemId,
            scores.scores,
            scores.profileId,
            scores.justification
          );
        } catch (error) {
          console.error('Failed to sync item scores:', error);
        }
      },

      syncAllScoresToDatabase: async (listId) => {
        const state = get();
        if (!state.activeProfileId) return;

        // Collect all scores for this list's profile
        const items: Array<{
          itemId: string;
          criteriaScores: ListItemCriteriaScores;
        }> = [];

        for (const [key, scores] of Object.entries(state.itemScores)) {
          if (key.endsWith(`:${state.activeProfileId}`)) {
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

        if (items.length === 0) return;

        set({ syncStatus: 'syncing' });
        try {
          await batchSaveItemScores(listId, items);
          set({ syncStatus: 'idle', lastSyncAt: new Date().toISOString() });
        } catch (error) {
          console.error('Failed to batch sync scores:', error);
          set({ syncStatus: 'error' });
        }
      },
    }),
    {
      name: 'criteria-store',
      partialize: (state) => ({
        profiles: state.profiles.filter((p) => !p.isTemplate),
        activeProfileId: state.activeProfileId,
        itemScores: state.itemScores,
        scoreInputMode: state.scoreInputMode,
        currentListId: state.currentListId,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);

// Selector hooks
export const useCriteriaProfiles = () => useCriteriaStore((state) => state.profiles);
export const useActiveProfile = () => useCriteriaStore((state) => state.getActiveProfile());
export const useCriteriaPanelState = () =>
  useCriteriaStore((state) => ({
    isVisible: state.isPanelVisible,
    inputMode: state.scoreInputMode,
  }));
export const useCriteriaActions = () =>
  useCriteriaStore((state) => ({
    setActiveProfile: state.setActiveProfile,
    setItemScore: state.setItemScore,
    getItemScores: state.getItemScores,
    togglePanel: state.togglePanelVisibility,
    setInputMode: state.setScoreInputMode,
    getRankingSuggestions: state.getRankingSuggestions,
  }));

// Database sync selector hooks
export const useSyncStatus = () =>
  useCriteriaStore((state) => ({
    status: state.syncStatus,
    lastSyncAt: state.lastSyncAt,
    currentListId: state.currentListId,
  }));

export const useCriteriaSync = () =>
  useCriteriaStore((state) => ({
    loadFromDatabase: state.loadFromDatabase,
    saveToDatabase: state.saveToDatabase,
    syncItemScoresToDatabase: state.syncItemScoresToDatabase,
    syncAllScoresToDatabase: state.syncAllScoresToDatabase,
    setCurrentList: state.setCurrentList,
  }));
