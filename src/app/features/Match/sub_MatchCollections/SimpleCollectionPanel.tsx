"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { GripHorizontal } from "lucide-react";
import { CollectionGroup, CollectionItem } from "@/app/features/Collection/types";
import { useQuickSelect } from "@/app/features/Collection/hooks/useQuickSelect";
import { cn } from "@/lib/utils";
import {
  CollectionHeader,
  CollectionSidebar,
  CollectionHorizontalBar,
  VirtualizedCollectionGrid,
  CollectionToggleButton,
  GroupViewMode,
  filterItemsByQuery,
  QuickSelectStatusBar,
  useGridDimensions,
} from "./components";

interface SimpleCollectionPanelProps {
  groups: CollectionGroup[];
  /** Optional callback when an item is clicked (for click-to-assign) */
  onItemClick?: (item: CollectionItem) => void;
  /** ID of the currently selected item (for click-to-assign highlighting) */
  selectedItemId?: string;
}

// Default and constraints for panel height
const DEFAULT_PANEL_HEIGHT = 400;
const MIN_PANEL_HEIGHT = 200;
const MAX_PANEL_HEIGHT_VH = 80; // Max 80% of viewport height

// Animation states for CSS-based transitions
type AnimationState = 'hidden' | 'entering' | 'visible' | 'exiting';

/**
 * "Glass Dock" Collection Panel
 * A premium, floating dock for managing collection items.
 *
 * Features:
 * - Fixed at bottom of viewport via React Portal
 * - Resizable via drag handle
 * - Switchable group navigation (sidebar vs horizontal bar)
 * - Filters out items already placed in the grid
 * - Hides groups with 0 available items
 * - Responsive grid layout with larger items
 */
export function SimpleCollectionPanel({ groups, onItemClick, selectedItemId }: SimpleCollectionPanelProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<string | 'all'>('all');
  const [groupViewMode, setGroupViewMode] = useState<GroupViewMode>('sidebar');
  const [searchQuery, setSearchQuery] = useState('');

  // SSR safety - only render portal on client
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Animation state machine for CSS-based transitions
  const [animState, setAnimState] = useState<AnimationState>('visible');

  // Handle visibility changes with animation states
  useEffect(() => {
    if (isVisible && animState === 'hidden') {
      setAnimState('entering');
    } else if (!isVisible && animState === 'visible') {
      setAnimState('exiting');
    }
  }, [isVisible, animState]);

  // Handle animation end events
  const handleAnimationEnd = useCallback((e: React.AnimationEvent) => {
    // Only handle animations on the panel itself, not child elements
    if (e.target !== e.currentTarget) return;

    if (animState === 'entering') {
      setAnimState('visible');
    } else if (animState === 'exiting') {
      setAnimState('hidden');
    }
  }, [animState]);

  // Panel height state (resizable)
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Ref for the grid container to calculate responsive columns
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Calculate responsive grid dimensions matching ItemCard's 4:5 aspect ratio
  // Larger items (112px min) for better visibility and readability
  const gridDimensions = useGridDimensions(gridContainerRef, {
    minColumns: 3,
    maxColumns: 10,
    minItemWidth: 112, // Doubled size for better visibility
    gap: 8,
    aspectRatio: 4 / 5, // Match ItemCard's aspect-[4/5]
  });

  // Calculate dynamic grid height based on panel height
  // Subtract header (~52px), quick-select bar (~40px), horizontal bar if visible (~48px), padding (~32px)
  const headerHeight = 52;
  const quickSelectHeight = 40;
  const horizontalBarHeight = groupViewMode === 'horizontal' ? 48 : 0;
  const paddingHeight = 32;
  const gridHeight = Math.max(
    150,
    panelHeight - headerHeight - quickSelectHeight - horizontalBarHeight - paddingHeight
  );

  // Handle resize drag
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startHeight = panelHeight;
    const maxHeight = window.innerHeight * (MAX_PANEL_HEIGHT_VH / 100);

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentY = 'touches' in moveEvent
        ? (moveEvent as TouchEvent).touches[0].clientY
        : (moveEvent as MouseEvent).clientY;
      const delta = startY - currentY; // Dragging up increases height
      const newHeight = Math.min(maxHeight, Math.max(MIN_PANEL_HEIGHT, startHeight + delta));
      setPanelHeight(newHeight);
    };

    const handleEnd = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  }, [panelHeight]);

  // CENTRALIZED FILTERING: All used-item filtering happens once here.
  // Child components receive pre-filtered data and don't re-filter.
  const {
    // Groups with used items already filtered out (for sidebar/horizontal bar counts)
    availableGroups,
    // Per-group available counts (pre-calculated for sidebar/horizontal bar)
    groupAvailableCounts,
    // Total available items across all groups
    totalItemCount,
    // Display groups: filtered by active tab + search query (already excludes used items)
    displayGroups,
    // Count of items after search filter
    filteredItemCount,
    // Flat array of filtered items for quick-select
    flatFilteredItems,
  } = useMemo(() => {
    // Step 1: Filter out used items from ALL groups ONCE
    const groupsWithAvailable = groups.map(group => {
      const availableItems = (group.items || []).filter(item => !item.used);
      return {
        ...group,
        items: availableItems,
      };
    });

    // Step 2: Calculate per-group counts (for sidebar/horizontal bar)
    const countsMap: Record<string, number> = {};
    let total = 0;
    groupsWithAvailable.forEach(group => {
      const count = group.items?.length || 0;
      countsMap[group.id] = count;
      total += count;
    });

    // Step 3: Filter by active tab
    const selectedGroups = activeTab === 'all'
      ? groupsWithAvailable
      : groupsWithAvailable.filter(g => g.id === activeTab);

    // Step 4: Apply search filter (items are already filtered for used)
    const searchFilteredGroups = selectedGroups.map(group => {
      const matchingItems = searchQuery
        ? filterItemsByQuery(group.items || [], searchQuery)
        : group.items || [];
      return {
        ...group,
        items: matchingItems,
      };
    });

    // Step 5: Calculate filtered item count
    const filtered = searchFilteredGroups.reduce((sum, g) => sum + (g.items?.length || 0), 0);

    // Step 6: Flatten all filtered items for quick-select (order matches display order)
    const flatItems: CollectionItem[] = [];
    searchFilteredGroups.forEach(group => {
      if (group.items) {
        flatItems.push(...group.items);
      }
    });

    return {
      availableGroups: groupsWithAvailable,
      groupAvailableCounts: countsMap,
      totalItemCount: total,
      displayGroups: searchFilteredGroups,
      filteredItemCount: filtered,
      flatFilteredItems: flatItems,
    };
  }, [groups, activeTab, searchQuery]);

  // Initialize quick-select hook with visible items
  const quickSelect = useQuickSelect({
    visibleItems: flatFilteredItems,
    enabled: isVisible,
  });

  // Reset to 'all' if the currently selected group becomes empty
  // Uses pre-calculated counts from centralized filtering
  useEffect(() => {
    if (activeTab !== 'all') {
      const availableCount = groupAvailableCounts[activeTab] ?? 0;
      if (availableCount === 0) {
        setActiveTab('all');
      }
    }
  }, [groupAvailableCounts, activeTab]);

  // Toggle panel visibility
  const togglePanel = () => setIsVisible(prev => !prev);

  // Handle search query changes
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Clear search and deactivate quick-select when panel is hidden
  useEffect(() => {
    if (!isVisible) {
      if (searchQuery) {
        setSearchQuery('');
      }
      if (quickSelect.state.isActive) {
        quickSelect.deactivateQuickSelect();
      }
    }
  }, [isVisible, searchQuery, quickSelect]);

  // Global keyboard listener for quick-select
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in input fields (except for Escape and number keys in quick-select)
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Toggle quick-select with 'q' key (only when not in input)
      if (e.key === 'q' && !isInInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        quickSelect.toggleQuickSelect();
        return;
      }

      // Handle quick-select keys when active
      if (quickSelect.state.isActive) {
        // Allow Escape to work even in inputs
        if (e.key === 'Escape') {
          e.preventDefault();
          quickSelect.deactivateQuickSelect();
          return;
        }

        // Number keys for quick-select (only when not in input, or when specifically selecting)
        if (!isInInput) {
          const handled = quickSelect.handleKeyPress(e.key);
          if (handled) {
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, quickSelect]);

  // Don't render on server (SSR safety)
  if (!mounted) {
    return null;
  }

  // Determine if panel should be rendered (visible or animating)
  const shouldRenderPanel = animState !== 'hidden';

  const panelContent = (
    <>
      {/* Toggle Button (When Hidden) */}
      <CollectionToggleButton
        isVisible={isVisible}
        onToggle={togglePanel}
      />

      {/* Main Dock Panel - Fixed at bottom of viewport */}
      {shouldRenderPanel && (
        <div
          ref={panelRef}
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50",
            // CSS animation classes
            animState === 'entering' && "animate-[collection-panel-slide-in_0.3s_ease-out_forwards]",
            animState === 'exiting' && "animate-[collection-panel-slide-out_0.25s_ease-in_forwards]"
          )}
          style={{ height: panelHeight }}
          onAnimationEnd={handleAnimationEnd}
          data-testid="collection-panel"
        >
          {/* Resize Handle */}
          <div
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
            className={cn(
              "absolute -top-3 left-0 right-0 h-6 cursor-ns-resize z-10",
              "flex items-center justify-center transition-colors",
              isResizing ? 'bg-cyan-500/20' : 'hover:bg-white/5'
            )}
            data-testid="panel-resize-handle"
          >
            <div className="flex items-center gap-1 px-4 py-1 rounded-full bg-gray-800/80 border border-white/10">
              <GripHorizontal className="w-4 h-4 text-gray-400" />
              <span className="text-[10px] text-gray-500 hidden sm:inline">Drag to resize</span>
            </div>
          </div>

          <div className="w-full h-full bg-gray-900/95 dark:bg-gray-950/95 backdrop-blur-2xl border-t border-white/10 dark:border-white/5 shadow-[0_-8px_32px_rgba(0,0,0,0.4)] dark:shadow-[0_-8px_48px_rgba(0,0,0,0.6)] flex flex-col">

            {/* Header Bar */}
            <CollectionHeader
              totalItems={totalItemCount}
              isVisible={isVisible}
              onTogglePanel={togglePanel}
              groupViewMode={groupViewMode}
              onGroupViewModeChange={setGroupViewMode}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              filteredItemCount={filteredItemCount}
            />

            {/* Quick-Select Status Bar */}
            <div className="px-4 py-1 flex-shrink-0">
              <QuickSelectStatusBar
                isActive={quickSelect.state.isActive}
                mode={quickSelect.state.mode}
                selectedItemTitle={
                  quickSelect.state.selectedItemId
                    ? flatFilteredItems.find(i => i.id === quickSelect.state.selectedItemId)?.title
                    : undefined
                }
                statusMessage={quickSelect.state.statusMessage}
                onToggle={quickSelect.toggleQuickSelect}
                onClear={quickSelect.clearSelection}
              />
            </div>

            {/* Horizontal Group Bar (if in horizontal mode) */}
            {groupViewMode === 'horizontal' && (
              <div className="flex-shrink-0">
                <CollectionHorizontalBar
                  groups={availableGroups}
                  groupAvailableCounts={groupAvailableCounts}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  totalItemCount={totalItemCount}
                />
              </div>
            )}

            {/* Content Area - fills remaining space */}
            <div className="flex flex-1 min-h-0">

              {/* Sidebar (if in sidebar mode) */}
              {groupViewMode === 'sidebar' && (
                <CollectionSidebar
                  groups={availableGroups}
                  groupAvailableCounts={groupAvailableCounts}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  totalItemCount={totalItemCount}
                />
              )}

              {/* Main Grid - Virtualized for performance */}
              <div
                ref={gridContainerRef}
                className="flex-1 p-3 bg-gradient-to-b from-transparent to-black/20 dark:to-black/40 min-h-0"
                data-testid="collection-grid-container"
              >
                <VirtualizedCollectionGrid
                  displayGroups={displayGroups}
                  showGroupHeaders={activeTab === 'all'}
                  searchQuery={searchQuery}
                  getQuickSelectNumber={quickSelect.state.isActive ? quickSelect.getQuickSelectNumber : undefined}
                  isItemSelected={quickSelect.state.isActive ? quickSelect.isItemSelected : undefined}
                  columnCount={gridDimensions.columnCount}
                  containerHeight={gridHeight}
                  rowHeight={gridDimensions.rowHeight}
                  itemWidth={gridDimensions.itemWidth}
                  onItemClick={onItemClick}
                  selectedItemId={selectedItemId}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Render via portal to document.body to escape any CSS transforms
  return createPortal(panelContent, document.body);
}
