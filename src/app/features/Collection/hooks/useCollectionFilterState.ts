/**
 * useCollectionFilterState
 *
 * Local hook that manages quick filter toggles, preset persistence,
 * and filter config for collection components. Replaces the global
 * filter-store with component-scoped state + localStorage for presets.
 *
 * ## Ownership note
 *
 * This hook owns a **component-local** FilterConfig used exclusively by
 * the Collection panel's quick-filter UI (CollectionFilterIntegration
 * component in `src/app/features/Collection/components/`). It is
 * independent of the visual FilterBuilder store and the
 * FilterIntegrationProvider context.
 *
 * If you need the canonical runtime filter state shared across the
 * component tree, use the FilterIntegrationProvider and its hooks
 * (useFilterIntegration, useFilterActions, etc.) instead.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import type {
  FilterConfig,
  FilterCondition,
  FilterGroup,
  FilterCombinator,
  FilterPreset,
  FilterStatistics,
  FilterResult,
  QuickFilter,
  SortConfig,
} from '@/lib/filters/types';
import { EMPTY_FILTER_CONFIG } from '@/lib/filters/constants';
import { FilterEngine } from '@/lib/filters/FilterEngine';

/**
 * Storage key for persisted presets
 */
const PRESETS_STORAGE_KEY = 'goat_filter_presets';

/**
 * Generate unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Load presets from localStorage
 */
function loadPresets(): FilterPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored).map((p: FilterPreset) => ({
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
    }));
  } catch {
    return [];
  }
}

/**
 * Save presets to localStorage
 */
function savePresets(presets: FilterPreset[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Return type matching the FilterStore interface from types.ts
 * so consumers can use it as a drop-in replacement.
 */
export interface CollectionFilterState {
  config: FilterConfig;
  presets: FilterPreset[];
  activePresetId: string | null;
  quickFilters: QuickFilter[];
  statistics: FilterStatistics | null;
  sortConfig: SortConfig | null;

  // Condition management
  addCondition: (condition: Omit<FilterCondition, 'id'> | FilterCondition) => void;
  updateCondition: (id: string, updates: Partial<FilterCondition>) => void;
  removeCondition: (id: string) => void;
  toggleCondition: (id: string) => void;

  // Group management
  addGroup: (parentId?: string) => void;
  updateGroup: (id: string, updates: Partial<FilterGroup>) => void;
  removeGroup: (id: string) => void;
  toggleGroup: (id: string) => void;

  // Preset management
  savePreset: (name: string, description?: string) => void;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  updatePreset: (presetId: string, updates: Partial<FilterPreset>) => void;

  // Quick filters
  setQuickFilters: (filters: QuickFilter[]) => void;
  toggleQuickFilter: (id: string) => void;

  // Sort
  setSortConfig: (sort: SortConfig | null) => void;

  // Global actions
  setCombinator: (combinator: FilterCombinator) => void;
  clearAll: () => void;
  reset: () => void;

  // Apply
  applyFilters: <T>(items: T[]) => FilterResult<T>;
}

/**
 * Hook providing collection filter state management.
 * Replaces the global useFilterStore with local component state.
 */
export function useCollectionFilterState(): CollectionFilterState {
  const filterEngineRef = useRef<FilterEngine<Record<string, unknown>> | null>(null);
  if (!filterEngineRef.current) {
    filterEngineRef.current = new FilterEngine<Record<string, unknown>>();
  }

  const [config, setConfig] = useState<FilterConfig>(EMPTY_FILTER_CONFIG);
  const [presets, setPresets] = useState<FilterPreset[]>(() => loadPresets());
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [quickFilters, setQuickFiltersState] = useState<QuickFilter[]>([]);
  const [statistics, setStatistics] = useState<FilterStatistics | null>(null);
  const [sortConfig, setSortConfigState] = useState<SortConfig | null>(null);

  // Condition management
  const addCondition = useCallback((conditionData: Omit<FilterCondition, 'id'> | FilterCondition) => {
    const condition: FilterCondition = {
      ...conditionData,
      id: ('id' in conditionData && conditionData.id) ? conditionData.id : generateId('condition'),
    };
    setConfig((prev) => ({
      ...prev,
      conditions: [...prev.conditions, condition],
    }));
    setActivePresetId(null);
  }, []);

  const updateCondition = useCallback((id: string, updates: Partial<FilterCondition>) => {
    setConfig((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
    setActivePresetId(null);
  }, []);

  const removeCondition = useCallback((id: string) => {
    setConfig((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((c) => c.id !== id),
    }));
    setActivePresetId(null);
  }, []);

  const toggleCondition = useCallback((id: string) => {
    setConfig((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c) =>
        c.id === id ? { ...c, enabled: !c.enabled } : c
      ),
    }));
  }, []);

  // Group management
  const addGroup = useCallback((parentId?: string) => {
    const newGroup: FilterGroup = {
      id: generateId('group'),
      combinator: 'AND',
      conditions: [],
      groups: [],
      enabled: true,
    };

    setConfig((prev) => {
      if (!parentId) {
        return { ...prev, groups: [...prev.groups, newGroup] };
      }
      const addToGroup = (groups: FilterGroup[]): FilterGroup[] =>
        groups.map((g) =>
          g.id === parentId
            ? { ...g, groups: [...g.groups, newGroup] }
            : { ...g, groups: addToGroup(g.groups) }
        );
      return { ...prev, groups: addToGroup(prev.groups) };
    });
    setActivePresetId(null);
  }, []);

  const updateGroup = useCallback((id: string, updates: Partial<FilterGroup>) => {
    setConfig((prev) => {
      const updateInGroups = (groups: FilterGroup[]): FilterGroup[] =>
        groups.map((g) =>
          g.id === id ? { ...g, ...updates } : { ...g, groups: updateInGroups(g.groups) }
        );
      return { ...prev, groups: updateInGroups(prev.groups) };
    });
    setActivePresetId(null);
  }, []);

  const removeGroup = useCallback((id: string) => {
    setConfig((prev) => {
      const removeFromGroups = (groups: FilterGroup[]): FilterGroup[] =>
        groups
          .filter((g) => g.id !== id)
          .map((g) => ({ ...g, groups: removeFromGroups(g.groups) }));
      return { ...prev, groups: removeFromGroups(prev.groups) };
    });
    setActivePresetId(null);
  }, []);

  const toggleGroup = useCallback((id: string) => {
    setConfig((prev) => {
      const toggleInGroups = (groups: FilterGroup[]): FilterGroup[] =>
        groups.map((g) =>
          g.id === id
            ? { ...g, enabled: !g.enabled }
            : { ...g, groups: toggleInGroups(g.groups) }
        );
      return { ...prev, groups: toggleInGroups(prev.groups) };
    });
  }, []);

  // Preset management
  const savePreset = useCallback((name: string, description?: string) => {
    const newPreset: FilterPreset = {
      id: generateId('preset'),
      name,
      description,
      config: JSON.parse(JSON.stringify(config)),
      sortConfig: sortConfig ? { ...sortConfig } : null,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
    };
    setPresets((prev) => {
      const updated = [...prev, newPreset];
      savePresets(updated);
      return updated;
    });
    setActivePresetId(newPreset.id);
  }, [config, sortConfig]);

  const loadPreset = useCallback((presetId: string) => {
    setPresets((prev) => {
      const preset = prev.find((p) => p.id === presetId);
      if (!preset) return prev;

      setConfig(JSON.parse(JSON.stringify(preset.config)));
      setSortConfigState(preset.sortConfig ? { ...preset.sortConfig } : null);
      setActivePresetId(presetId);

      const updated = prev.map((p) =>
        p.id === presetId
          ? { ...p, usageCount: p.usageCount + 1, updatedAt: new Date() }
          : p
      );
      savePresets(updated);
      return updated;
    });
  }, []);

  const deletePreset = useCallback((presetId: string) => {
    setPresets((prev) => {
      const updated = prev.filter((p) => p.id !== presetId);
      savePresets(updated);
      return updated;
    });
    setActivePresetId((prev) => (prev === presetId ? null : prev));
  }, []);

  const updatePreset = useCallback((presetId: string, updates: Partial<FilterPreset>) => {
    setPresets((prev) => {
      const updated = prev.map((p) =>
        p.id === presetId ? { ...p, ...updates, updatedAt: new Date() } : p
      );
      savePresets(updated);
      return updated;
    });
  }, []);

  // Quick filters
  const setQuickFilters = useCallback((filters: QuickFilter[]) => {
    setQuickFiltersState(filters);
  }, []);

  const toggleQuickFilter = useCallback((id: string) => {
    setQuickFiltersState((prev) => {
      const quickFilter = prev.find((f) => f.id === id);
      if (!quickFilter) return prev;

      const isActive = quickFilter.isActive;

      if (isActive) {
        // Remove quick filter conditions
        const quickConditionIds = quickFilter.config.conditions.map((c) => c.id);
        setConfig((prevConfig) => ({
          ...prevConfig,
          conditions: prevConfig.conditions.filter(
            (c) => !quickConditionIds.includes(c.id)
          ),
        }));
      } else {
        // Apply quick filter conditions
        setConfig((prevConfig) => ({
          ...prevConfig,
          conditions: [...prevConfig.conditions, ...quickFilter.config.conditions],
        }));
      }

      return prev.map((f) =>
        f.id === id ? { ...f, isActive: !isActive } : f
      );
    });
  }, []);

  // Sort
  const setSortConfig = useCallback((sort: SortConfig | null) => {
    setSortConfigState(sort);
  }, []);

  // Global actions
  const setCombinator = useCallback((combinator: FilterCombinator) => {
    setConfig((prev) => ({ ...prev, rootCombinator: combinator }));
    setActivePresetId(null);
  }, []);

  const clearAll = useCallback(() => {
    setConfig(EMPTY_FILTER_CONFIG);
    setActivePresetId(null);
    setSortConfigState(null);
    setQuickFiltersState((prev) => prev.map((f) => ({ ...f, isActive: false })));
  }, []);

  const reset = useCallback(() => {
    setConfig(EMPTY_FILTER_CONFIG);
    setActivePresetId(null);
    setSortConfigState(null);
    setQuickFiltersState((prev) => prev.map((f) => ({ ...f, isActive: false })));
  }, []);

  // Apply filters
  const applyFilters = useCallback(<T,>(items: T[]): FilterResult<T> => {
    const result = filterEngineRef.current!.apply(
      items as Record<string, unknown>[],
      config,
      sortConfig
    ) as FilterResult<T>;

    const stats = filterEngineRef.current!.calculateStatistics(
      items as Record<string, unknown>[],
      result.items as Record<string, unknown>[],
      []
    );
    stats.activeFilters = result.appliedFilters.length;
    setStatistics(stats);

    return result;
  }, [config, sortConfig]);

  return {
    config,
    presets,
    activePresetId,
    quickFilters,
    statistics,
    sortConfig,
    addCondition,
    updateCondition,
    removeCondition,
    toggleCondition,
    addGroup,
    updateGroup,
    removeGroup,
    toggleGroup,
    savePreset,
    loadPreset,
    deletePreset,
    updatePreset,
    setQuickFilters,
    toggleQuickFilter,
    setSortConfig,
    setCombinator,
    clearAll,
    reset,
    applyFilters,
  };
}

/**
 * Derived selectors — helper functions for common derived state.
 */
export function getActiveFilterCount(config: FilterConfig): number {
  let count = config.conditions.filter((c) => c.enabled).length;
  const countInGroup = (group: FilterGroup): number => {
    let total = group.conditions.filter((c) => c.enabled).length;
    for (const g of group.groups) {
      total += countInGroup(g);
    }
    return total;
  };
  for (const group of config.groups) {
    if (group.enabled) {
      count += countInGroup(group);
    }
  }
  return count;
}

export function getHasActiveFilters(config: FilterConfig): boolean {
  return (
    config.conditions.some((c) => c.enabled) ||
    config.groups.some((g) => g.enabled)
  );
}
