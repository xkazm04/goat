"use client";

import { ChevronDown, ChevronUp, Grid3x3, List, Plus, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { CollectionStats, CollectionGroup } from "../types";
import { useCollectionFiltersContext } from "../context/CollectionFiltersContext";
import { CuratorBadge } from "./CuratorBadge";

interface CollectionToolbarProps {
  // Header section
  stats: CollectionStats;
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
}

/**
 * Unified Collection Toolbar Component
 *
 * Consolidates header controls, category bar, and search into a single component.
 * Delegates all actions upward through callbacks, keeping UI composition straightforward.
 *
 * Features:
 * - Title and stats display
 * - Add button
 * - View mode toggle (grid/list)
 * - Selection controls (select all/clear)
 * - Category filtering bar
 * - Search input
 * - Visibility toggle
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
  showSearch = true
}: CollectionToolbarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Use context if available, otherwise fall back to props
  const context = useCollectionFiltersContext();

  const groups = propGroups ?? context.groups;
  const selectedGroupIds = propSelectedGroupIds ?? context.filter.selectedGroupIds;
  const onToggleGroup = propOnToggleGroup ?? context.toggleGroup;
  const searchValue = propSearchValue ?? context.filter.searchTerm;
  const onSearchChange = propOnSearchChange ?? context.setSearchTerm;

  return (
    <>
      {/* Curator Badge - Celebration on milestones */}
      <CuratorBadge itemCount={stats.totalItems} />

      {/* Hide/Show Toggle Button */}
      <button
        onClick={onToggleVisibility}
        data-testid="collection-toggle-visibility-btn"
        aria-expanded={isVisible}
        aria-label={isVisible ? "Hide collection panel" : "Show collection panel"}
        className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-4 py-1.5 rounded-t-lg border border-b-0 border-gray-700 transition-colors flex items-center gap-2 text-xs shadow-lg z-50"
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

      {/* Header Section */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900/95 backdrop-blur-sm" data-testid="collection-toolbar-header">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Grid3x3 className="w-4 h-4" />
              Collection
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-400">
                {stats.selectedItems} of {stats.totalItems} items
              </span>
              {stats.visibleGroups > 0 && (
                <span className="text-xs text-gray-500">
                  • {stats.visibleGroups} groups
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Item Button */}
          {onAddItem && (
            <button
              onClick={onAddItem}
              data-testid="collection-add-item-btn"
              aria-label="Add new item"
              className="p-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 rounded-lg transition-all shadow-lg shadow-cyan-500/10 flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300"
              title="Add new item"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          {/* View Mode Toggle */}
          {onViewModeChange && (
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1" data-testid="view-mode-toggle">
              <button
                onClick={() => onViewModeChange('grid')}
                data-testid="view-mode-grid-btn"
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-gray-500 hover:text-gray-300'
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
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Selection Controls */}
          <div className="flex gap-1 border-l border-gray-700 pl-2">
            <button
              onClick={onSelectAll}
              data-testid="collection-select-all-btn"
              aria-label="Select all groups"
              className="px-2.5 py-1 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-colors"
            >
              Select All
            </button>
            <button
              onClick={onDeselectAll}
              data-testid="collection-deselect-all-btn"
              aria-label="Clear all selections"
              className="px-2.5 py-1 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Category Bar Section */}
      {showCategoryBar && (
        <div className="w-full overflow-x-auto border-b border-gray-700/50 bg-gray-900/50" data-testid="collection-toolbar-categorybar">
          <div className="flex items-center gap-2 px-3 py-2 min-h-[48px]">
            {groups.map((group) => {
              const isSelected = selectedGroupIds.has(group.id);
              const itemCount = group.items?.length || 0;

              return (
                <motion.button
                  key={group.id}
                  onClick={() => onToggleGroup(group.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  data-testid={`category-${group.id}-btn`}
                  aria-pressed={isSelected}
                  className={`
                    flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
                    transition-all duration-200 whitespace-nowrap
                    ${isSelected
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                      : 'bg-gray-800/60 text-gray-400 border border-gray-700/50 hover:bg-gray-800 hover:text-gray-300'
                    }
                  `}
                >
                  <span className="font-semibold">{group.name}</span>
                  {itemCount > 0 && (
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                      isSelected
                        ? 'bg-cyan-500/30 text-cyan-300'
                        : 'bg-gray-700/50 text-gray-500'
                    }`}>
                      {itemCount}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Section */}
      {showSearch && (
        <div className="px-4 py-2 border-b border-gray-700/50 bg-gray-900/30" data-testid="collection-toolbar-search">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors ${
              isSearchFocused ? 'text-cyan-400' : 'text-gray-500'
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
              className="w-full pl-10 pr-10 py-2 bg-gray-800/60 border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange('')}
                data-testid="collection-search-clear-btn"
                aria-label="Clear search"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
