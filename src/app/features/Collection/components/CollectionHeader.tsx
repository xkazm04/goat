"use client";

import { ChevronDown, ChevronUp, Grid3x3, List, Plus } from "lucide-react";
import { CollectionStats } from "../types";

interface CollectionHeaderProps {
  stats: CollectionStats;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddItem?: () => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

/**
 * Collection panel header with controls and stats
 */
export function CollectionHeader({
  stats,
  isVisible,
  onToggleVisibility,
  onSelectAll,
  onDeselectAll,
  onAddItem,
  viewMode = 'grid',
  onViewModeChange
}: CollectionHeaderProps) {
  return (
    <>
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

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900/95 backdrop-blur-sm">
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
    </>
  );
}

