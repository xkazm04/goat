/**
 * User Preferences Store
 * Zustand store for user display and feature preferences
 *
 * Supports all three directions:
 * - Direction 1: Community Wisdom preferences
 * - Direction 2: Smart Seeding preferences
 * - Direction 3: AI Results preferences
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  UserPreferencesClient,
  SeedingStrategy,
  ArrangeMode,
  ViewMode,
} from '@/types/user-preferences';
import { DEFAULT_USER_PREFERENCES, toClientPreferences, toDatabasePreferences } from '@/types/user-preferences';

/**
 * User preferences state
 */
interface UserPreferencesState extends UserPreferencesClient {
  // Loading state
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  error: string | null;
}

/**
 * User preferences actions
 */
interface UserPreferencesActions {
  // General
  setUserId: (userId: string) => void;
  resetToDefaults: () => void;

  // Direction 1: Community Wisdom
  setShowConsensusBadges: (show: boolean) => void;
  setConsensusOverlayEnabled: (enabled: boolean) => void;
  setConsensusOverlayOpacity: (opacity: number) => void;

  // Direction 2: Smart Seeding
  setDefaultSeedingStrategy: (strategy: SeedingStrategy) => void;
  setDefaultArrangeMode: (mode: ArrangeMode) => void;
  setPreservePodium: (preserve: boolean) => void;

  // Direction 3: AI Results
  setDefaultAIStyle: (style: string) => void;
  setAIHistoryEnabled: (enabled: boolean) => void;
  setPreferredAIProvider: (provider: 'leonardo' | 'replicate' | 'openai' | 'mock') => void;

  // General UI
  setDefaultViewMode: (mode: ViewMode) => void;
  setShowTutorialHints: (show: boolean) => void;
  setItemsPerPage: (count: number) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;

  // Feature flags
  setFeatureFlag: (flag: string, enabled: boolean) => void;
  isFeatureEnabled: (flag: string) => boolean;

  // Sync
  loadFromServer: () => Promise<void>;
  saveToServer: () => Promise<void>;

  // Bulk update
  updatePreferences: (updates: Partial<UserPreferencesClient>) => void;
}

/**
 * Full store type
 */
type UserPreferencesStore = UserPreferencesState & UserPreferencesActions;

/**
 * Initial state
 */
const initialState: UserPreferencesState = {
  ...DEFAULT_USER_PREFERENCES,
  isLoading: false,
  isSyncing: false,
  lastSyncedAt: null,
  error: null,
};

/**
 * Create user preferences store with persistence
 */
export const useUserPreferencesStore = create<UserPreferencesStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // General
      setUserId: (userId) => set({ userId }),

      resetToDefaults: () => set({
        ...DEFAULT_USER_PREFERENCES,
        userId: get().userId, // Preserve user ID
        isLoading: false,
        isSyncing: false,
        error: null,
      }),

      // Direction 1: Community Wisdom
      setShowConsensusBadges: (show) => set({ showConsensusBadges: show }),
      setConsensusOverlayEnabled: (enabled) => set({ consensusOverlayEnabled: enabled }),
      setConsensusOverlayOpacity: (opacity) => set({
        consensusOverlayOpacity: Math.max(0, Math.min(1, opacity)),
      }),

      // Direction 2: Smart Seeding
      setDefaultSeedingStrategy: (strategy) => set({ defaultSeedingStrategy: strategy }),
      setDefaultArrangeMode: (mode) => set({ defaultArrangeMode: mode }),
      setPreservePodium: (preserve) => set({ preservePodium: preserve }),

      // Direction 3: AI Results
      setDefaultAIStyle: (style) => set({ defaultAIStyle: style }),
      setAIHistoryEnabled: (enabled) => set({ aiHistoryEnabled: enabled }),
      setPreferredAIProvider: (provider) => set({ preferredAIProvider: provider }),

      // General UI
      setDefaultViewMode: (mode) => set({ defaultViewMode: mode }),
      setShowTutorialHints: (show) => set({ showTutorialHints: show }),
      setItemsPerPage: (count) => set({ itemsPerPage: Math.max(10, Math.min(100, count)) }),
      setTheme: (theme) => set({ theme }),

      // Feature flags
      setFeatureFlag: (flag, enabled) => set((state) => ({
        featureFlags: { ...state.featureFlags, [flag]: enabled },
      })),

      isFeatureEnabled: (flag) => {
        const { featureFlags } = get();
        return featureFlags[flag] ?? false;
      },

      // Sync from server
      loadFromServer: async () => {
        const { userId } = get();
        if (!userId) return;

        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`/api/user/preferences?userId=${userId}`);

          if (!response.ok) {
            if (response.status === 404) {
              // No preferences saved yet, use defaults
              set({ isLoading: false, lastSyncedAt: Date.now() });
              return;
            }
            throw new Error('Failed to load preferences');
          }

          const data = await response.json();

          if (data.success && data.data) {
            const clientPrefs = toClientPreferences(data.data);
            set({
              ...clientPrefs,
              isLoading: false,
              lastSyncedAt: Date.now(),
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      // Save to server
      saveToServer: async () => {
        const state = get();
        if (!state.userId) return;

        set({ isSyncing: true, error: null });

        try {
          const dbPrefs = toDatabasePreferences(state);

          const response = await fetch('/api/user/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dbPrefs),
          });

          if (!response.ok) {
            throw new Error('Failed to save preferences');
          }

          set({ isSyncing: false, lastSyncedAt: Date.now() });
        } catch (error) {
          set({
            isSyncing: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      // Bulk update
      updatePreferences: (updates) => set((state) => ({
        ...state,
        ...updates,
      })),
    }),
    {
      name: 'goat-user-preferences',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist preference values, not loading/sync state
        userId: state.userId,
        showConsensusBadges: state.showConsensusBadges,
        consensusOverlayEnabled: state.consensusOverlayEnabled,
        consensusOverlayOpacity: state.consensusOverlayOpacity,
        defaultSeedingStrategy: state.defaultSeedingStrategy,
        defaultArrangeMode: state.defaultArrangeMode,
        preservePodium: state.preservePodium,
        defaultAIStyle: state.defaultAIStyle,
        aiHistoryEnabled: state.aiHistoryEnabled,
        preferredAIProvider: state.preferredAIProvider,
        defaultViewMode: state.defaultViewMode,
        showTutorialHints: state.showTutorialHints,
        itemsPerPage: state.itemsPerPage,
        theme: state.theme,
        featureFlags: state.featureFlags,
      }),
    }
  )
);

// =============================================================================
// Selector Hooks (for optimized re-renders)
// =============================================================================

/**
 * Direction 1: Community Wisdom preferences
 */
export const useCommunityWisdomPreferences = () =>
  useUserPreferencesStore((state) => ({
    showConsensusBadges: state.showConsensusBadges,
    consensusOverlayEnabled: state.consensusOverlayEnabled,
    consensusOverlayOpacity: state.consensusOverlayOpacity,
    setShowConsensusBadges: state.setShowConsensusBadges,
    setConsensusOverlayEnabled: state.setConsensusOverlayEnabled,
    setConsensusOverlayOpacity: state.setConsensusOverlayOpacity,
  }));

/**
 * Direction 2: Smart Seeding preferences
 */
export const useSmartSeedingPreferences = () =>
  useUserPreferencesStore((state) => ({
    defaultSeedingStrategy: state.defaultSeedingStrategy,
    defaultArrangeMode: state.defaultArrangeMode,
    preservePodium: state.preservePodium,
    setDefaultSeedingStrategy: state.setDefaultSeedingStrategy,
    setDefaultArrangeMode: state.setDefaultArrangeMode,
    setPreservePodium: state.setPreservePodium,
  }));

/**
 * Direction 3: AI Results preferences
 */
export const useAIResultsPreferences = () =>
  useUserPreferencesStore((state) => ({
    defaultAIStyle: state.defaultAIStyle,
    aiHistoryEnabled: state.aiHistoryEnabled,
    preferredAIProvider: state.preferredAIProvider,
    setDefaultAIStyle: state.setDefaultAIStyle,
    setAIHistoryEnabled: state.setAIHistoryEnabled,
    setPreferredAIProvider: state.setPreferredAIProvider,
  }));

/**
 * General UI preferences
 */
export const useUIPreferences = () =>
  useUserPreferencesStore((state) => ({
    defaultViewMode: state.defaultViewMode,
    showTutorialHints: state.showTutorialHints,
    itemsPerPage: state.itemsPerPage,
    theme: state.theme,
    setDefaultViewMode: state.setDefaultViewMode,
    setShowTutorialHints: state.setShowTutorialHints,
    setItemsPerPage: state.setItemsPerPage,
    setTheme: state.setTheme,
  }));

/**
 * Sync state
 */
export const usePreferencesSync = () =>
  useUserPreferencesStore((state) => ({
    isLoading: state.isLoading,
    isSyncing: state.isSyncing,
    lastSyncedAt: state.lastSyncedAt,
    error: state.error,
    loadFromServer: state.loadFromServer,
    saveToServer: state.saveToServer,
  }));
