"use client";

import { useState, useMemo, useEffect, useCallback, useRef, useDeferredValue } from "react";
import { createPortal } from "react-dom";
import { GripHorizontal } from "lucide-react";
import { CollectionGroup, CollectionItem } from "@/app/features/Collection/types";
import { useQuickSelect } from "@/app/features/Collection/hooks/useQuickSelect";
import { cn } from "@/lib/utils";
import {
  CollectionSidebar,
  CollectionHorizontalBar,
  VirtualizedCollectionGrid,
  CollectionToggleButton,
  GroupViewMode,
  filterItemsByQuery,
  QuickSelectStatusBar,
  useGridDimensions,
} from "./components";
import { CompactCollectionHeader } from "./components/CompactCollectionHeader";
import { VerticalCategoryNav } from "./components/VerticalCategoryNav";

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

  // Performance: Defer search to keep UI responsive during typing
  const deferredSearchQuery = useDeferredValue(searchQuery);

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

    // Step 4: Apply search filter using deferred query for performance
    const searchFilteredGroups = selectedGroups.map(group => {
      const matchingItems = deferredSearchQuery
        ? filterItemsByQuery(group.items || [], deferredSearchQuery)
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
  }, [groups, activeTab, deferredSearchQuery]);

  // Initialize quick-select hook with visible items
  const quickSelect = useQuickSelect({
    visibleItems: flatFilteredItems,
    enabled: isVisible,
  });

  // Compact mode detection - tighter spacing when panel is short
  const COMPACT_THRESHOLD = 300;
  const isCompactMode = panelHeight < COMPACT_THRESHOLD;

  // Calculate dynamic grid height based on panel height
  const headerHeight = 36;
  const quickSelectHeight = 32;
  const horizontalBarHeight = groupViewMode === 'horizontal' ? 40 : 0;
  const paddingHeight = isCompactMode ? 8 : 16; // SPACE-03: Tighter when compact

  // SPACE-01: Only subtract quick-select height when active
  const quickSelectSubtraction = quickSelect.state.isActive ? quickSelectHeight : 0;

  // Note: Sidebar actual width is responsive (140px tablet, 176px desktop via CSS)
  // This uses desktop width for calculations; grid flexes to fill remaining space
  const navWidth = groupViewMode === 'minimal' ? 44 : (groupViewMode === 'sidebar' ? 176 : 0);

  const gridHeight = Math.max(
    150,
    panelHeight - headerHeight - quickSelectSubtraction - horizontalBarHeight - paddingHeight
  );

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
          {/* Resize Handle - Styled grip */}
          <div
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
            className={cn(
              "absolute -top-3 left-0 right-0 h-6 cursor-ns-resize z-10",
              "flex items-center justify-center group",
              isResizing && 'bg-gradient-to-b from-cyan-500/10 to-transparent'
            )}
            data-testid="panel-resize-handle"
          >
            <div className={cn(
              "flex items-center gap-1 px-3 py-1 rounded-full transition-all duration-200",
              isResizing
                ? "bg-cyan-500/20 border border-cyan-500/30"
                : "bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15"
            )}>
              <div className={cn(
                "w-8 h-0.5 rounded-full transition-all",
                isResizing ? "bg-cyan-400" : "bg-white/30 group-hover:bg-white/50"
              )} />
            </div>
          </div>

          <div className="w-full h-full glass-dock-panel flex flex-col overflow-hidden rounded-t-xl">
            {/* Compact Header with integrated search */}
            <CompactCollectionHeader
              totalItems={totalItemCount}
              filteredItemCount={filteredItemCount}
              isVisible={isVisible}
              onTogglePanel={togglePanel}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              activeCategory={activeTab === 'all' ? 'all' : (availableGroups.find(g => g.id === activeTab)?.name || activeTab)}
              searchableItems={flatFilteredItems}
            />

            {/* Quick-Select Status Bar - more compact */}
            {quickSelect.state.isActive && (
              <div className="px-3 py-1 flex-shrink-0 border-b border-white/5">
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
            )}

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
            <div className={cn(
              "flex flex-1 min-h-0 overflow-hidden",
              isCompactMode && "gap-0.5"
            )}>
              {/* Minimal Vertical Nav (default, most space efficient) */}
              {groupViewMode === 'minimal' && (
                <VerticalCategoryNav
                  groups={availableGroups}
                  groupAvailableCounts={groupAvailableCounts}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  totalItemCount={totalItemCount}
                />
              )}

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
                className={cn(
                  "flex-1 min-h-0 overflow-hidden",
                  isCompactMode ? "p-1" : "p-2"
                )}
                data-testid="collection-grid-container"
              >
                <VirtualizedCollectionGrid
                  displayGroups={displayGroups}
                  searchQuery={deferredSearchQuery}
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
