"use client";

import { ChevronDown, ChevronUp, Grid3x3, List, Plus, Search, X, EyeOff, Filter, Save, Bookmark, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useMemo } from "react";
import { ItemPanelStats, CollectionGroup, CollectionItem } from "../types";
import { useCollectionFiltersContext } from "../context/CollectionFiltersContext";
import { useCollectionFilterState, getActiveFilterCount, getHasActiveFilters } from "../hooks/useCollectionFilterState";
import { QuickFilterBar, type QuickFilter } from "@/lib/filters";
import type { SmartFilterSuggestion, FilterConfig, FilterPreset } from "@/lib/filters/types";
import type { CollectionFilterState } from "../hooks/useCollectionFilterState";
import { UnrankedIcon, InGridIcon, TopRatedIcon, RecentIcon } from "@/components/icons/MicroIllustrations";

/**
 * Collection-specific quick filters for common filtering patterns
 */
const COLLECTION_QUICK_FILTERS: QuickFilter[] = [
  {
    id: 'unranked',
    label: 'Unranked',
    icon: <UnrankedIcon size={14} />,
    config: {
      rootCombinator: 'AND',
      groups: [],
      conditions: [
        {
          id: 'unranked-condition',
          field: 'used',
          operator: 'equals',
          value: false,
          valueType: 'boolean',
          enabled: true,
        },
      ],
    },
  },
  {
    id: 'ranked',
    label: 'In Grid',
    icon: <InGridIcon size={14} />,
    config: {
      rootCombinator: 'AND',
      groups: [],
      conditions: [
        {
          id: 'ranked-condition',
          field: 'used',
          operator: 'equals',
          value: true,
          valueType: 'boolean',
          enabled: true,
        },
      ],
    },
  },
  {
    id: 'top-rated',
    label: 'Top Rated',
    icon: <TopRatedIcon size={14} />,
    config: {
      rootCombinator: 'AND',
      groups: [],
      conditions: [
        {
          id: 'top-rated-condition',
          field: 'ranking',
          operator: 'greater_equal',
          value: 4,
          valueType: 'number',
          enabled: true,
        },
      ],
    },
  },
  {
    id: 'recent',
    label: 'Recent',
    icon: <RecentIcon size={14} />,
    config: {
      rootCombinator: 'AND',
      groups: [],
      conditions: [
        {
          id: 'recent-condition',
          field: 'year',
          operator: 'greater_equal',
          value: new Date().getFullYear() - 2,
          valueType: 'number',
          enabled: true,
        },
      ],
    },
  },
];

/**
 * Generate smart filter suggestions based on collection composition
 */
function generateCollectionSuggestions(items: CollectionItem[]): SmartFilterSuggestion[] {
  if (!items || items.length < 5) return [];

  const suggestions: SmartFilterSuggestion[] = [];
  const currentYear = new Date().getFullYear();
  const itemRecords = items as unknown as Record<string, unknown>[];

  // Check for unranked items in recent years
  const recentUnranked = itemRecords.filter(
    (item) => item.used === false && typeof item.year === 'number' && item.year >= currentYear - 3
  );
  if (recentUnranked.length >= 3) {
    const decade = `${currentYear - 3}-${currentYear}`;
    suggestions.push({
      id: 'suggest-recent-unranked',
      type: 'narrow',
      label: `Unranked ${decade}`,
      description: `${recentUnranked.length} recent items not yet ranked`,
      estimatedMatches: recentUnranked.length,
      confidence: 0.9,
      config: {
        rootCombinator: 'AND',
        groups: [],
        conditions: [
          { id: 'su-1', field: 'used', operator: 'equals', value: false, valueType: 'boolean', enabled: true },
          { id: 'su-2', field: 'year', operator: 'greater_equal', value: currentYear - 3, valueType: 'number', enabled: true },
        ],
      },
    });
  }

  // Check for highly rated unranked items
  const topUnranked = itemRecords.filter(
    (item) => item.used === false && typeof item.ranking === 'number' && (item.ranking as number) >= 4
  );
  if (topUnranked.length >= 2) {
    suggestions.push({
      id: 'suggest-top-unranked',
      type: 'alternative',
      label: 'Top Rated Unranked',
      description: `${topUnranked.length} highly-rated items waiting to be placed`,
      estimatedMatches: topUnranked.length,
      confidence: 0.85,
      config: {
        rootCombinator: 'AND',
        groups: [],
        conditions: [
          { id: 'stu-1', field: 'used', operator: 'equals', value: false, valueType: 'boolean', enabled: true },
          { id: 'stu-2', field: 'ranking', operator: 'greater_equal', value: 4, valueType: 'number', enabled: true },
        ],
      },
    });
  }

  return suggestions.slice(0, 3);
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

interface CategoryBarProps {
  groups: CollectionGroup[];
  selectedGroupIds: Set<string>;
  onToggleGroup: (groupId: string) => void;
  isInitialLoad: boolean;
  highlightedGroups: Set<string>;
}

function CategoryBar({ groups, selectedGroupIds, onToggleGroup, isInitialLoad, highlightedGroups }: CategoryBarProps) {
  return (
    <div className="w-full overflow-x-auto border-b border-slate-700/50 bg-slate-900/50" data-testid="collection-toolbar-categorybar">
      <div className="flex items-center gap-2 px-4 py-2 min-h-[48px]">
        <AnimatePresence mode="popLayout">
          {groups.map((group, index) => {
            const isSelected = selectedGroupIds.has(group.id);
            const itemCount = group.items?.length || 0;
            const isHighlighted = highlightedGroups.has(group.id);

            return (
              <motion.button
                key={group.id}
                onClick={() => onToggleGroup(group.id)}
                initial={isInitialLoad ? {
                  opacity: 0,
                  y: -10,
                  scale: 0.9
                } : false}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1
                }}
                exit={{
                  opacity: 0,
                  scale: 0.9,
                  transition: { duration: 0.2 }
                }}
                transition={{
                  duration: 0.3,
                  delay: isInitialLoad ? index * 0.05 : 0,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                layout
                layoutId={group.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-testid={`category-${group.id}-btn`}
                aria-pressed={isSelected}
                className={`
                  shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
                  transition-all duration-200 whitespace-nowrap
                  ${isSelected
                    ? 'bg-brand/20 text-brand-hover border border-brand/40 shadow-lg shadow-brand/10'
                    : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-800 hover:text-slate-300'
                  }
                  ${isHighlighted ? 'ring-2 ring-brand-hover/50 ring-offset-2 ring-offset-slate-900' : ''}
                `}
                style={{
                  animation: isHighlighted ? 'highlight-pulse 0.8s cubic-bezier(0.4, 0, 0.2, 1)' : undefined
                }}
              >
                <span className="font-semibold">{group.name}</span>
                {itemCount > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                    isSelected
                      ? 'bg-brand/30 text-brand-hover'
                      : 'bg-slate-700/50 text-slate-500'
                  }`}>
                    {itemCount}
                  </span>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface FilterSuggestionsProps {
  suggestions: SmartFilterSuggestion[];
  hasActiveFilters: boolean;
  onApplySuggestion: (config: FilterConfig) => void;
}

function FilterSuggestions({ suggestions, hasActiveFilters, onApplySuggestion }: FilterSuggestionsProps) {
  if (suggestions.length === 0 || hasActiveFilters) return null;

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-slate-500 shrink-0">Suggested:</span>
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          onClick={() => onApplySuggestion(suggestion.config)}
          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors"
          title={suggestion.description}
        >
          <span>{suggestion.label}</span>
          <span className="text-[9px] font-mono text-amber-500/60">({suggestion.estimatedMatches})</span>
        </button>
      ))}
    </div>
  );
}

interface QuickFiltersSectionProps {
  items: CollectionItem[];
  activeQuickFilterIds: string[];
  onQuickFilterToggle: (filterId: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  filterStore: CollectionFilterState;
  presets: FilterPreset[];
  activePresetId: string | null;
  smartSuggestions: SmartFilterSuggestion[];
  onApplySuggestion: (config: FilterConfig) => void;
  onLoadPreset: (presetId: string) => void;
  onDeletePreset: (presetId: string) => void;
}

function QuickFiltersSection({
  items,
  activeQuickFilterIds,
  onQuickFilterToggle,
  onClearFilters,
  hasActiveFilters,
  activeFilterCount,
  filterStore,
  presets,
  activePresetId,
  smartSuggestions,
  onApplySuggestion,
  onLoadPreset,
  onDeletePreset,
}: QuickFiltersSectionProps) {
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');

  const filterCounts = useMemo(() => {
    if (!items || items.length === 0) return {};

    const counts: Record<string, number> = {};

    COLLECTION_QUICK_FILTERS.forEach((filter) => {
      const condition = filter.config.conditions[0];
      if (!condition) {
        counts[filter.id] = items.length;
        return;
      }

      counts[filter.id] = items.filter((item) => {
        const itemRecord = item as unknown as Record<string, unknown>;
        const value = itemRecord[condition.field];

        switch (condition.operator) {
          case 'equals':
            return value === condition.value;
          case 'greater_equal':
            return typeof value === 'number' && value >= (condition.value as number);
          case 'less_equal':
            return typeof value === 'number' && value <= (condition.value as number);
          default:
            return true;
        }
      }).length;
    });

    return counts;
  }, [items]);

  const handleToggleCombinator = useCallback(() => {
    filterStore.setCombinator(filterStore.config.rootCombinator === 'AND' ? 'OR' : 'AND');
  }, [filterStore]);

  const handleSavePreset = useCallback(() => {
    if (presetName.trim()) {
      filterStore.savePreset(presetName.trim());
      setPresetName('');
      setShowSavePreset(false);
    }
  }, [filterStore, presetName]);

  return (
    <div className="px-4 py-2 border-b border-slate-700/50 bg-slate-900/40" data-testid="collection-toolbar-quickfilters">
      {/* Quick Filters Row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>
        <QuickFilterBar
          filters={COLLECTION_QUICK_FILTERS}
          activeFilters={activeQuickFilterIds}
          onToggle={onQuickFilterToggle}
          onClear={onClearFilters}
          filterCounts={filterCounts}
          variant="default"
          showClearAll={hasActiveFilters}
          className="flex-1"
        />
        {/* AND/OR combinator toggle */}
        {activeFilterCount >= 2 && (
          <button
            onClick={handleToggleCombinator}
            className="shrink-0 px-2 py-1 text-xs font-bold rounded border border-slate-600 hover:border-brand/50 transition-colors bg-slate-800/60 text-slate-300 hover:text-brand-hover"
            title={filterStore.config.rootCombinator === 'AND' ? 'All conditions must match' : 'At least one condition must match'}
          >
            {filterStore.config.rootCombinator}
          </button>
        )}
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5">
            <motion.span
              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-brand/20 text-brand-hover border border-brand/30"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {activeFilterCount} active
            </motion.span>
            {/* Save current filter as preset */}
            <button
              onClick={() => setShowSavePreset(true)}
              className="p-1 text-slate-400 hover:text-brand-hover transition-colors"
              title="Save as preset"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Saved Presets Row */}
      {presets.length > 0 && (
        <div className="flex items-center gap-2 mt-2 overflow-x-auto scrollbar-hide">
          <Bookmark className="w-3 h-3 text-slate-500 shrink-0" />
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onLoadPreset(preset.id)}
              className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border transition-all ${
                preset.id === activePresetId
                  ? 'bg-brand/20 border-brand/40 text-brand-hover'
                  : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              <span>{preset.icon || '🎯'}</span>
              <span>{preset.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDeletePreset(preset.id); }}
                className="ml-1 text-slate-500 hover:text-red-400"
                title="Remove preset"
              >
                <X className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>
      )}

      {/* Smart Suggestions Row */}
      <FilterSuggestions
        suggestions={smartSuggestions}
        hasActiveFilters={hasActiveFilters}
        onApplySuggestion={onApplySuggestion}
      />

      {/* Save Preset Inline Dialog */}
      <AnimatePresence>
        {showSavePreset && (
          <motion.div
            className="flex items-center gap-2 mt-2"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name..."
              className="flex-1 px-2 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand/50"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSavePreset();
                if (e.key === 'Escape') setShowSavePreset(false);
              }}
            />
            <button
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
              className="px-3 py-1.5 text-xs bg-brand/20 text-brand-hover border border-brand/30 rounded hover:bg-brand/30 disabled:opacity-50 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setShowSavePreset(false)}
              className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-300"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

/** Maximum number of toolbar sections visible before "Show More" toggle */
const MAX_VISIBLE_SECTIONS = 3;

interface CollectionToolbarProps {
  // Header section
  stats: ItemPanelStats;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddItem?: () => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;

  // Category bar section (optional - uses context by default)
  groups?: CollectionGroup[];
  selectedGroupIds?: Set<string>;
  onToggleGroup?: (groupId: string) => void;

  // Search section (optional - uses context by default)
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  // Layout control
  showCategoryBar?: boolean;
  showSearch?: boolean;
  showQuickFilters?: boolean;

  // Items for filter facet counts (optional)
  items?: CollectionItem[];
}

/**
 * Unified Collection Toolbar Component
 *
 * Consolidates header controls, category bar, and search into a single component.
 * Delegates all actions upward through callbacks, keeping UI composition straightforward.
 *
 * Sections beyond the first 3 are collapsed behind a "Show More" toggle to prevent
 * the toolbar from consuming excessive vertical space.
 */
export function CollectionToolbar({
  stats,
  isVisible,
  onToggleVisibility,
  onSelectAll,
  onDeselectAll,
  onAddItem,
  viewMode = 'grid',
  onViewModeChange,
  groups: propGroups,
  selectedGroupIds: propSelectedGroupIds,
  onToggleGroup: propOnToggleGroup,
  searchValue: propSearchValue,
  onSearchChange: propOnSearchChange,
  searchPlaceholder = "Search items...",
  showCategoryBar = true,
  showSearch = true,
  showQuickFilters = true,
  items = []
}: CollectionToolbarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter state (local hook replacing global filter-store)
  const filterStore = useCollectionFilterState();
  const quickFilters = filterStore.quickFilters;
  const activeFilterCount = getActiveFilterCount(filterStore.config);
  const hasActiveFilters = getHasActiveFilters(filterStore.config);
  const presets = filterStore.presets;
  const activePresetId = filterStore.activePresetId;

  // Initialize quick filters on mount
  useEffect(() => {
    if (showQuickFilters) {
      filterStore.setQuickFilters(COLLECTION_QUICK_FILTERS);
    }
  }, [showQuickFilters]);

  // Compute active quick filter IDs
  const activeQuickFilterIds = useMemo(() => {
    return quickFilters.filter((f) => f.isActive).map((f) => f.id);
  }, [quickFilters]);

  // Quick filter handlers
  const handleQuickFilterToggle = useCallback((filterId: string) => {
    filterStore.toggleQuickFilter(filterId);
  }, [filterStore]);

  const handleClearFilters = useCallback(() => {
    filterStore.clearAll();
  }, [filterStore]);

  // Smart suggestions based on collection composition
  const smartSuggestions = useMemo(() => generateCollectionSuggestions(items), [items]);

  // Preset handlers
  const handleLoadPreset = useCallback((presetId: string) => {
    filterStore.loadPreset(presetId);
  }, [filterStore]);

  const handleDeletePreset = useCallback((presetId: string) => {
    filterStore.deletePreset(presetId);
  }, [filterStore]);

  const handleApplySuggestion = useCallback((config: FilterConfig) => {
    config.conditions.forEach((condition) => {
      filterStore.addCondition(condition);
    });
  }, [filterStore]);

  // Animation state for category bar
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [prevGroupIds, setPrevGroupIds] = useState<string[]>([]);
  const [highlightedGroups, setHighlightedGroups] = useState<Set<string>>(new Set());

  // Use context if available, otherwise fall back to props
  const context = useCollectionFiltersContext();

  const groups = propGroups ?? context.groups;
  const selectedGroupIds = propSelectedGroupIds ?? context.filter.selectedGroupIds;
  const onToggleGroup = propOnToggleGroup ?? context.toggleGroup;
  const searchValue = propSearchValue ?? context.filter.searchTerm;
  const onSearchChange = propOnSearchChange ?? context.setSearchTerm;

  // Detect group reordering and trigger highlight effect
  useEffect(() => {
    const currentGroupIds = groups.map(g => g.id);

    if (prevGroupIds.length > 0 && prevGroupIds.length === currentGroupIds.length) {
      const orderChanged = prevGroupIds.some((id, index) => id !== currentGroupIds[index]);

      if (orderChanged) {
        setHighlightedGroups(new Set(currentGroupIds));
        setTimeout(() => {
          setHighlightedGroups(new Set());
        }, 800);
      }
    }

    setPrevGroupIds(currentGroupIds);
  }, [groups, prevGroupIds]);

  // Clear initial load flag after first render
  useEffect(() => {
    if (isInitialLoad && groups.length > 0) {
      const timer = setTimeout(() => setIsInitialLoad(false), groups.length * 50 + 500);
      return () => clearTimeout(timer);
    }
  }, [isInitialLoad, groups.length]);

  // Build ordered list of sections to render
  const sections: { key: string; element: React.ReactNode }[] = [];

  // Section 1: Header (always present, always visible)
  sections.push({
    key: 'header',
    element: (
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900/95 backdrop-blur-xs" data-testid="collection-toolbar-header">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Grid3x3 className="w-4 h-4" />
              Collection
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-400">
                {stats.selectedItems} of {stats.totalItems} items
              </span>
              {stats.visibleGroups > 0 && (
                <span className="text-xs text-slate-500">
                  &bull; {stats.visibleGroups} groups
                </span>
              )}
              {(stats.hiddenInGridCount ?? 0) > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  title={`${stats.hiddenInGridCount} items are hidden because they are already in your ranking grid`}
                  data-testid="hidden-items-badge"
                >
                  <EyeOff className="w-3 h-3" />
                  {stats.hiddenInGridCount} in grid
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onAddItem && (
            <button
              onClick={onAddItem}
              data-testid="collection-add-item-btn"
              aria-label="Add new item"
              className="p-2 bg-linear-to-r from-brand/20 to-blue-500/20 hover:from-brand/30 hover:to-blue-500/30 border border-brand/30 rounded-lg transition-all shadow-lg shadow-brand/10 flex items-center gap-1.5 text-brand-hover hover:text-brand-hover"
              title="Add new item"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          {onViewModeChange && (
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1" data-testid="view-mode-toggle">
              <button
                onClick={() => onViewModeChange('grid')}
                data-testid="view-mode-grid-btn"
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-brand/20 text-brand-hover'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Grid3x3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                data-testid="view-mode-list-btn"
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-brand/20 text-brand-hover'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex gap-1 border-l border-slate-700 pl-2">
            <button
              onClick={onSelectAll}
              data-testid="collection-select-all-btn"
              aria-label="Select all groups"
              className="px-2.5 py-1 text-xs text-brand-hover hover:text-brand-hover hover:bg-brand/10 rounded transition-colors"
            >
              Select All
            </button>
            <button
              onClick={onDeselectAll}
              data-testid="collection-deselect-all-btn"
              aria-label="Clear all selections"
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    ),
  });

  // Section 2: Category Bar
  if (showCategoryBar) {
    sections.push({
      key: 'category-bar',
      element: (
        <CategoryBar
          groups={groups}
          selectedGroupIds={selectedGroupIds}
          onToggleGroup={onToggleGroup}
          isInitialLoad={isInitialLoad}
          highlightedGroups={highlightedGroups}
        />
      ),
    });
  }

  // Section 3: Quick Filters
  if (showQuickFilters) {
    sections.push({
      key: 'quick-filters',
      element: (
        <QuickFiltersSection
          items={items}
          activeQuickFilterIds={activeQuickFilterIds}
          onQuickFilterToggle={handleQuickFilterToggle}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          filterStore={filterStore}
          presets={presets}
          activePresetId={activePresetId}
          smartSuggestions={smartSuggestions}
          onApplySuggestion={handleApplySuggestion}
          onLoadPreset={handleLoadPreset}
          onDeletePreset={handleDeletePreset}
        />
      ),
    });
  }

  // Section 4: Search
  if (showSearch) {
    sections.push({
      key: 'search',
      element: (
        <div className="px-4 py-2 border-b border-slate-700/50 bg-slate-900/30" data-testid="collection-toolbar-search">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors ${
              isSearchFocused ? 'text-brand-hover' : 'text-slate-500'
            }`} />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder={searchPlaceholder}
              data-testid="collection-search-input"
              aria-label="Search collection items"
              className="w-full pl-10 pr-10 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all"
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange('')}
                data-testid="collection-search-clear-btn"
                aria-label="Clear search"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ),
    });
  }

  const visibleSections = sections.slice(0, MAX_VISIBLE_SECTIONS);
  const collapsedSections = sections.slice(MAX_VISIBLE_SECTIONS);
  const hasCollapsedSections = collapsedSections.length > 0;

  return (
    <>
      {/* Hide/Show Toggle Button */}
      <button
        onClick={onToggleVisibility}
        data-testid="collection-toggle-visibility-btn"
        aria-expanded={isVisible}
        aria-label={isVisible ? "Hide collection panel" : "Show collection panel"}
        className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-4 py-1.5 rounded-t-lg border border-b-0 border-slate-700 transition-colors flex items-center gap-2 text-xs shadow-lg z-50"
      >
        {isVisible ? (
          <>
            <ChevronDown className="w-3 h-3" />
            Hide Collection
          </>
        ) : (
          <>
            <ChevronUp className="w-3 h-3" />
            Show Collection
          </>
        )}
      </button>

      {/* Always-visible sections */}
      {visibleSections.map((section) => (
        <div key={section.key}>{section.element}</div>
      ))}

      {/* Collapsed sections with Show More toggle */}
      {hasCollapsedSections && (
        <>
          <AnimatePresence initial={false}>
            {isExpanded && collapsedSections.map((section) => (
              <motion.div
                key={section.key}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {section.element}
              </motion.div>
            ))}
          </AnimatePresence>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid="collection-toolbar-show-more"
            className="w-full flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs text-slate-400 hover:text-slate-300 bg-slate-900/20 border-b border-slate-700/50 transition-colors hover:bg-slate-800/40"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
            {isExpanded ? 'Show Less' : `Show More (${collapsedSections.length})`}
          </button>
        </>
      )}
    </>
  );
}
