/**
 * Filter Store
 * Zustand store for advanced multi-filter system state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  FilterState,
  FilterActions,
  FilterConfig,
  FilterCondition,
  FilterGroup,
  FilterPreset,
  QuickFilter,
  FilterStatistics,
  SmartFilterSuggestion,
  FilterCombinator,
  FilterResult,
} from '@/lib/filters/types';
import {
  EMPTY_FILTER_CONFIG,
  DEFAULT_QUICK_FILTERS,
} from '@/lib/filters/constants';
import { FILTER_STORAGE_KEYS } from '@/lib/filters/types';
import { FilterEngine } from '@/lib/filters/FilterEngine';

/**
 * Generate unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Initial state
 */
const initialState: FilterState = {
  config: EMPTY_FILTER_CONFIG,
  presets: [],
  activePresetId: null,
  quickFilters: DEFAULT_QUICK_FILTERS,
  statistics: null,
  suggestions: [],
  isLoading: false,
  lastApplied: null,
  searchTerm: '',
  selectedFields: [],
};

/**
 * Filter store type
 */
type FilterStore = FilterState & FilterActions;

/**
 * Create filter engine instance
 */
const filterEngine = new FilterEngine();

/**
 * Create filter store with persistence
 */
export const useFilterStore = create<FilterStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Condition management
      addCondition: (conditionData) => {
        const condition: FilterCondition = {
          ...conditionData,
          id: generateId('condition'),
        };

        set((state) => ({
          config: {
            ...state.config,
            conditions: [...state.config.conditions, condition],
          },
          activePresetId: null, // Clear active preset when modifying
        }));
      },

      updateCondition: (id, updates) => {
        set((state) => ({
          config: {
            ...state.config,
            conditions: state.config.conditions.map((c) =>
              c.id === id ? { ...c, ...updates } : c
            ),
          },
          activePresetId: null,
        }));
      },

      removeCondition: (id) => {
        set((state) => ({
          config: {
            ...state.config,
            conditions: state.config.conditions.filter((c) => c.id !== id),
          },
          activePresetId: null,
        }));
      },

      toggleCondition: (id) => {
        set((state) => ({
          config: {
            ...state.config,
            conditions: state.config.conditions.map((c) =>
              c.id === id ? { ...c, enabled: !c.enabled } : c
            ),
          },
        }));
      },

      // Group management
      addGroup: (parentId) => {
        const newGroup: FilterGroup = {
          id: generateId('group'),
          combinator: 'AND',
          conditions: [],
          groups: [],
          enabled: true,
        };

        set((state) => {
          if (!parentId) {
            return {
              config: {
                ...state.config,
                groups: [...state.config.groups, newGroup],
              },
              activePresetId: null,
            };
          }

          // Add to nested group (recursive)
          const addToGroup = (groups: FilterGroup[]): FilterGroup[] => {
            return groups.map((g) => {
              if (g.id === parentId) {
                return { ...g, groups: [...g.groups, newGroup] };
              }
              return { ...g, groups: addToGroup(g.groups) };
            });
          };

          return {
            config: {
              ...state.config,
              groups: addToGroup(state.config.groups),
            },
            activePresetId: null,
          };
        });
      },

      updateGroup: (id, updates) => {
        set((state) => {
          const updateInGroups = (groups: FilterGroup[]): FilterGroup[] => {
            return groups.map((g) => {
              if (g.id === id) {
                return { ...g, ...updates };
              }
              return { ...g, groups: updateInGroups(g.groups) };
            });
          };

          return {
            config: {
              ...state.config,
              groups: updateInGroups(state.config.groups),
            },
            activePresetId: null,
          };
        });
      },

      removeGroup: (id) => {
        set((state) => {
          const removeFromGroups = (groups: FilterGroup[]): FilterGroup[] => {
            return groups
              .filter((g) => g.id !== id)
              .map((g) => ({
                ...g,
                groups: removeFromGroups(g.groups),
              }));
          };

          return {
            config: {
              ...state.config,
              groups: removeFromGroups(state.config.groups),
            },
            activePresetId: null,
          };
        });
      },

      toggleGroup: (id) => {
        set((state) => {
          const toggleInGroups = (groups: FilterGroup[]): FilterGroup[] => {
            return groups.map((g) => {
              if (g.id === id) {
                return { ...g, enabled: !g.enabled };
              }
              return { ...g, groups: toggleInGroups(g.groups) };
            });
          };

          return {
            config: {
              ...state.config,
              groups: toggleInGroups(state.config.groups),
            },
          };
        });
      },

      // Preset management
      savePreset: (name, description) => {
        const state = get();
        const newPreset: FilterPreset = {
          id: generateId('preset'),
          name,
          description,
          config: JSON.parse(JSON.stringify(state.config)), // Deep clone
          createdAt: new Date(),
          updatedAt: new Date(),
          usageCount: 0,
        };

        set((s) => ({
          presets: [...s.presets, newPreset],
          activePresetId: newPreset.id,
        }));
      },

      loadPreset: (presetId) => {
        const state = get();
        const preset = state.presets.find((p) => p.id === presetId);

        if (preset) {
          // Increment usage count
          const updatedPresets = state.presets.map((p) =>
            p.id === presetId
              ? { ...p, usageCount: p.usageCount + 1, updatedAt: new Date() }
              : p
          );

          set({
            config: JSON.parse(JSON.stringify(preset.config)), // Deep clone
            presets: updatedPresets,
            activePresetId: presetId,
          });
        }
      },

      deletePreset: (presetId) => {
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== presetId),
          activePresetId:
            state.activePresetId === presetId ? null : state.activePresetId,
        }));
      },

      updatePreset: (presetId, updates) => {
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === presetId ? { ...p, ...updates, updatedAt: new Date() } : p
          ),
        }));
      },

      // Quick filters
      setQuickFilters: (filters) => {
        set({ quickFilters: filters });
      },

      toggleQuickFilter: (id) => {
        const state = get();
        const quickFilter = state.quickFilters.find((f) => f.id === id);

        if (!quickFilter) return;

        // Check if already applied
        const isApplied = state.quickFilters.find((f) => f.id === id)?.isActive;

        if (isApplied) {
          // Remove quick filter conditions
          const quickConditionIds = quickFilter.config.conditions.map((c) => c.id);
          set((s) => ({
            config: {
              ...s.config,
              conditions: s.config.conditions.filter(
                (c) => !quickConditionIds.includes(c.id)
              ),
            },
            quickFilters: s.quickFilters.map((f) =>
              f.id === id ? { ...f, isActive: false } : f
            ),
          }));
        } else {
          // Apply quick filter conditions
          set((s) => ({
            config: {
              ...s.config,
              conditions: [...s.config.conditions, ...quickFilter.config.conditions],
            },
            quickFilters: s.quickFilters.map((f) =>
              f.id === id ? { ...f, isActive: true } : f
            ),
          }));
        }
      },

      // Global actions
      setCombinator: (combinator) => {
        set((state) => ({
          config: {
            ...state.config,
            rootCombinator: combinator,
          },
          activePresetId: null,
        }));
      },

      setSearchTerm: (term) => {
        set({ searchTerm: term });
      },

      clearAll: () => {
        set({
          config: EMPTY_FILTER_CONFIG,
          activePresetId: null,
          searchTerm: '',
          quickFilters: get().quickFilters.map((f) => ({ ...f, isActive: false })),
        });
      },

      reset: () => {
        set({
          ...initialState,
          presets: get().presets, // Keep presets
        });
      },

      // Apply filters
      applyFilters: <T>(items: T[]): FilterResult<T> => {
        const state = get();
        set({ isLoading: true });

        try {
          const result = filterEngine.apply(items as Record<string, unknown>[], state.config) as FilterResult<T>;

          // Update statistics
          const statistics = filterEngine.calculateStatistics(
            items as Record<string, unknown>[],
            result.items as Record<string, unknown>[],
            state.selectedFields
          );
          statistics.activeFilters = result.appliedFilters.length;

          set({
            statistics,
            lastApplied: new Date(),
            isLoading: false,
          });

          return result;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
    }),
    {
      name: FILTER_STORAGE_KEYS.PRESETS,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        presets: state.presets,
        quickFilters: state.quickFilters,
      }),
      // Handle date serialization
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<FilterState>;
        return {
          ...currentState,
          presets: (persisted.presets || []).map((p) => ({
            ...p,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
          })),
          quickFilters: persisted.quickFilters || currentState.quickFilters,
        };
      },
    }
  )
);

/**
 * Selectors
 */
export const useFilterConfig = () => useFilterStore((state) => state.config);

export const useFilterPresets = () => useFilterStore((state) => state.presets);

export const useActivePresetId = () =>
  useFilterStore((state) => state.activePresetId);

export const useQuickFilters = () =>
  useFilterStore((state) => state.quickFilters);

export const useFilterStatistics = () =>
  useFilterStore((state) => state.statistics);

export const useFilterSuggestions = () =>
  useFilterStore((state) => state.suggestions);

export const useIsFilterLoading = () =>
  useFilterStore((state) => state.isLoading);

export const useSearchTerm = () => useFilterStore((state) => state.searchTerm);

export const useActiveFilterCount = () =>
  useFilterStore((state) => {
    let count = state.config.conditions.filter((c) => c.enabled).length;
    const countInGroup = (group: FilterGroup): number => {
      let total = group.conditions.filter((c) => c.enabled).length;
      for (const g of group.groups) {
        total += countInGroup(g);
      }
      return total;
    };
    for (const group of state.config.groups) {
      if (group.enabled) {
        count += countInGroup(group);
      }
    }
    return count;
  });

export const useHasActiveFilters = () =>
  useFilterStore((state) => {
    return (
      state.config.conditions.some((c) => c.enabled) ||
      state.config.groups.some((g) => g.enabled)
    );
  });

/**
 * Hook to use filter with items
 */
export function useFilteredItems<T extends Record<string, unknown>>(
  items: T[]
): {
  filteredItems: T[];
  statistics: FilterStatistics | null;
  isLoading: boolean;
  activeCount: number;
} {
  const store = useFilterStore();
  const config = store.config;
  const isLoading = store.isLoading;

  // Memoized filtering
  const result = filterEngine.apply(items, config);

  return {
    filteredItems: result.items as T[],
    statistics: store.statistics,
    isLoading,
    activeCount: result.appliedFilters.length,
  };
}
