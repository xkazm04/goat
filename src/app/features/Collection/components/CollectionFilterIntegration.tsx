'use client';

/**
 * CollectionFilterIntegration
 *
 * Bridges the advanced FilterEngine infrastructure with the Collection panel UI.
 * Provides quick filters, filter panel, faceted counts, and preset management
 * specifically tailored for collection items.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronDown, Bookmark, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useFilterStore,
  useQuickFilters,
  useFilterPresets,
  useActivePresetId,
  useActiveFilterCount,
  useHasActiveFilters,
  useFilterStatistics,
} from '@/stores/filter-store';
import {
  QuickFilterBar,
  FilterPanel,
  FilterPresetManager,
  PresetQuickAccess,
  FilterStatistics as FilterStatsDisplay,
  type QuickFilter,
  type FilterConfig,
  type FilterFieldDefinition,
  FILTER_ANIMATIONS,
  DEFAULT_FILTER_FIELDS,
} from '@/lib/filters';
import type { CollectionItem } from '../types';

/**
 * Collection-specific quick filters
 */
const COLLECTION_QUICK_FILTERS: QuickFilter[] = [
  {
    id: 'unranked',
    label: 'Unranked',
    icon: '📋',
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
    icon: '📍',
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
    icon: '⭐',
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
    icon: '🆕',
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
  {
    id: 'classic',
    label: 'Classics',
    icon: '🏛️',
    config: {
      rootCombinator: 'AND',
      groups: [],
      conditions: [
        {
          id: 'classic-condition',
          field: 'year',
          operator: 'less_equal',
          value: 2000,
          valueType: 'number',
          enabled: true,
        },
      ],
    },
  },
];

/**
 * Collection-specific filter field definitions
 */
const COLLECTION_FILTER_FIELDS: FilterFieldDefinition[] = [
  {
    id: 'title',
    name: 'Title',
    field: 'title',
    type: 'string',
    operators: ['contains', 'equals', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
    defaultOperator: 'contains',
    placeholder: 'Search by title...',
    searchable: true,
    sortable: true,
    icon: '📝',
  },
  {
    id: 'year',
    name: 'Year',
    field: 'year',
    type: 'number',
    operators: ['equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between'],
    defaultOperator: 'equals',
    range: { min: 1900, max: new Date().getFullYear() + 1 },
    sortable: true,
    icon: '📅',
  },
  {
    id: 'ranking',
    name: 'Rating',
    field: 'ranking',
    type: 'number',
    operators: ['equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between'],
    defaultOperator: 'greater_equal',
    range: { min: 0, max: 10 },
    sortable: true,
    icon: '⭐',
  },
  {
    id: 'used',
    name: 'In Grid',
    field: 'used',
    type: 'boolean',
    operators: ['equals'],
    defaultOperator: 'equals',
    icon: '📍',
  },
  {
    id: 'description',
    name: 'Description',
    field: 'description',
    type: 'string',
    operators: ['contains', 'is_empty', 'is_not_empty'],
    defaultOperator: 'contains',
    placeholder: 'Search in description...',
    searchable: true,
    icon: '📄',
  },
];

interface CollectionFilterIntegrationProps {
  items: CollectionItem[];
  onFilteredItemsChange: (items: CollectionItem[]) => void;
  className?: string;
  showQuickFilters?: boolean;
  showFilterPanel?: boolean;
  showPresets?: boolean;
  showStatistics?: boolean;
  compact?: boolean;
}

/**
 * Main Collection Filter Integration Component
 */
export function CollectionFilterIntegration({
  items,
  onFilteredItemsChange,
  className,
  showQuickFilters = true,
  showFilterPanel = true,
  showPresets = true,
  showStatistics = true,
  compact = false,
}: CollectionFilterIntegrationProps) {
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [isPresetsExpanded, setIsPresetsExpanded] = useState(false);

  // Filter store state
  const filterStore = useFilterStore();
  const quickFilters = useQuickFilters();
  const presets = useFilterPresets();
  const activePresetId = useActivePresetId();
  const activeFilterCount = useActiveFilterCount();
  const hasActiveFilters = useHasActiveFilters();
  const statistics = useFilterStatistics();

  // Initialize quick filters on mount
  useEffect(() => {
    filterStore.setQuickFilters(COLLECTION_QUICK_FILTERS);
  }, []);

  // Compute active quick filter IDs
  const activeQuickFilterIds = useMemo(() => {
    return quickFilters.filter((f) => f.isActive).map((f) => f.id);
  }, [quickFilters]);

  // Compute facet counts for quick filters
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    // Calculate count for each quick filter
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

  // Apply filters and update parent
  useEffect(() => {
    if (!hasActiveFilters) {
      onFilteredItemsChange(items);
      return;
    }

    const itemsAsRecords = items as unknown as Record<string, unknown>[];
    const result = filterStore.applyFilters(itemsAsRecords);
    onFilteredItemsChange(result.items as unknown as CollectionItem[]);
  }, [items, filterStore.config, hasActiveFilters, onFilteredItemsChange]);

  // Handlers
  const handleQuickFilterToggle = useCallback(
    (filterId: string) => {
      filterStore.toggleQuickFilter(filterId);
    },
    [filterStore]
  );

  const handleClearFilters = useCallback(() => {
    filterStore.clearAll();
  }, [filterStore]);

  const handleConfigChange = useCallback(
    (config: FilterConfig) => {
      // Update conditions in store
      filterStore.clearAll();
      config.conditions.forEach((condition) => {
        filterStore.addCondition(condition);
      });
    },
    [filterStore]
  );

  const handleSavePreset = useCallback(
    (name: string, description?: string) => {
      filterStore.savePreset(name, description);
    },
    [filterStore]
  );

  const handleLoadPreset = useCallback(
    (preset: { id: string }) => {
      filterStore.loadPreset(preset.id);
    },
    [filterStore]
  );

  // Compact mode - just quick filter bar
  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        {showQuickFilters && (
          <QuickFilterBar
            filters={COLLECTION_QUICK_FILTERS}
            activeFilters={activeQuickFilterIds}
            onToggle={handleQuickFilterToggle}
            onClear={handleClearFilters}
            filterCounts={filterCounts}
            variant="default"
          />
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Quick Filters Bar */}
      {showQuickFilters && (
        <div className="flex items-center gap-3">
          <QuickFilterBar
            filters={COLLECTION_QUICK_FILTERS}
            activeFilters={activeQuickFilterIds}
            onToggle={handleQuickFilterToggle}
            onClear={handleClearFilters}
            filterCounts={filterCounts}
            variant="pills"
            className="flex-1"
          />

          {/* Filter Panel Toggle */}
          {showFilterPanel && (
            <button
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm',
                'border transition-all',
                isPanelExpanded
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-background border-border hover:border-primary/50'
              )}
              onClick={() => setIsPanelExpanded(!isPanelExpanded)}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown
                className={cn(
                  'w-3 h-3 transition-transform',
                  isPanelExpanded && 'rotate-180'
                )}
              />
            </button>
          )}

          {/* Presets Toggle */}
          {showPresets && presets.length > 0 && (
            <button
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm',
                'border transition-all',
                isPresetsExpanded
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-background border-border hover:border-primary/50'
              )}
              onClick={() => setIsPresetsExpanded(!isPresetsExpanded)}
            >
              <Bookmark className="w-4 h-4" />
              <span className="hidden sm:inline">Presets</span>
            </button>
          )}
        </div>
      )}

      {/* Expandable Filter Panel */}
      <AnimatePresence>
        {isPanelExpanded && showFilterPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={FILTER_ANIMATIONS.transition}
            className="overflow-hidden"
          >
            <FilterPanel
              config={filterStore.config}
              fields={COLLECTION_FILTER_FIELDS}
              onChange={handleConfigChange}
              onClear={handleClearFilters}
              showHeader={false}
              maxConditions={8}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expandable Presets Panel */}
      <AnimatePresence>
        {isPresetsExpanded && showPresets && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={FILTER_ANIMATIONS.transition}
            className="overflow-hidden"
          >
            <div className="border border-border rounded-lg p-4 bg-background">
              <FilterPresetManager
                presets={presets}
                activePresetId={activePresetId}
                currentConfig={filterStore.config}
                onLoadPreset={handleLoadPreset}
                onSavePreset={handleSavePreset}
                onDeletePreset={filterStore.deletePreset}
                onUpdatePreset={filterStore.updatePreset}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Statistics Summary */}
      {showStatistics && hasActiveFilters && statistics && (
        <div className="flex items-center justify-between p-2 rounded-lg bg-gray-900/50 border border-gray-700/50">
          <FilterStatsDisplay
            statistics={statistics}
            variant="inline"
          />
          <button
            onClick={handleClearFilters}
            className="text-xs text-gray-400 hover:text-cyan-400 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Standalone Quick Filter Bar for Collection
 * Use this when you only need quick filters without the full panel
 */
export function CollectionQuickFilters({
  items,
  onFilteredItemsChange,
  className,
}: {
  items: CollectionItem[];
  onFilteredItemsChange: (items: CollectionItem[]) => void;
  className?: string;
}) {
  return (
    <CollectionFilterIntegration
      items={items}
      onFilteredItemsChange={onFilteredItemsChange}
      className={className}
      showQuickFilters={true}
      showFilterPanel={false}
      showPresets={false}
      showStatistics={false}
      compact={true}
    />
  );
}

/**
 * Filter Badge - Shows active filter count
 */
export function CollectionFilterBadge({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  const activeCount = useActiveFilterCount();
  const hasActive = useHasActiveFilters();

  if (!hasActive) return null;

  return (
    <motion.button
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'text-xs font-medium',
        'bg-primary/10 text-primary border border-primary/30',
        'hover:bg-primary/20 transition-colors',
        className
      )}
      onClick={onClick}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
    >
      <Filter className="w-3 h-3" />
      <span>{activeCount} filter{activeCount !== 1 ? 's' : ''} active</span>
    </motion.button>
  );
}

/**
 * Smart Filter Suggestions for Collection
 * Shows AI-generated filter suggestions based on item distribution
 */
export function CollectionSmartSuggestions({
  items,
  onApplySuggestion,
  className,
}: {
  items: CollectionItem[];
  onApplySuggestion?: (config: FilterConfig) => void;
  className?: string;
}) {
  const hasFilters = useHasActiveFilters();

  // Generate suggestions based on item data
  const suggestions = useMemo(() => {
    if (items.length < 10) return [];

    const suggs: Array<{ label: string; icon: string; config: FilterConfig }> = [];

    // Check for highly rated items
    const highRated = items.filter(
      (i) => typeof i.ranking === 'number' && i.ranking >= 4
    ).length;
    if (highRated > 5 && highRated < items.length * 0.3) {
      suggs.push({
        label: `${highRated} highly rated`,
        icon: '⭐',
        config: {
          rootCombinator: 'AND',
          groups: [],
          conditions: [
            {
              id: 'suggestion-high-rated',
              field: 'ranking',
              operator: 'greater_equal',
              value: 4,
              valueType: 'number',
              enabled: true,
            },
          ],
        },
      });
    }

    // Check for unranked items
    const unranked = items.filter((i) => !i.used).length;
    if (unranked > 0 && unranked < items.length) {
      suggs.push({
        label: `${unranked} unranked`,
        icon: '📋',
        config: {
          rootCombinator: 'AND',
          groups: [],
          conditions: [
            {
              id: 'suggestion-unranked',
              field: 'used',
              operator: 'equals',
              value: false,
              valueType: 'boolean',
              enabled: true,
            },
          ],
        },
      });
    }

    return suggs.slice(0, 3);
  }, [items]);

  if (suggestions.length === 0 || hasFilters) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Sparkles className="w-4 h-4 text-amber-400" />
      <span className="text-xs text-muted-foreground">Try:</span>
      {suggestions.map((sug, i) => (
        <button
          key={i}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs',
            'bg-amber-500/10 text-amber-400 border border-amber-500/20',
            'hover:bg-amber-500/20 transition-colors'
          )}
          onClick={() => onApplySuggestion?.(sug.config)}
        >
          <span>{sug.icon}</span>
          <span>{sug.label}</span>
        </button>
      ))}
    </div>
  );
}
