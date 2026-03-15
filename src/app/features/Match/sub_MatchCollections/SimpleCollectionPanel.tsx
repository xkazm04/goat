"use client";

import { useState, useEffect, useCallback, useRef, useDeferredValue } from "react";
import { createPortal } from "react-dom";
import { CollectionGroup, CollectionItem } from "@/app/features/Collection/types";
import { useQuickSelect } from "@/app/features/Collection/hooks/useQuickSelect";
import { cn } from "@/lib/utils";
import {
  CollectionSidebar,
  VirtualizedCollectionGrid,
  CollectionToggleButton,
  QuickSelectStatusBar,
  useGridDimensions,
} from "./components";
import { CompactCollectionHeader } from "./components/CompactCollectionHeader";
import { PanelResizeHandle } from "./components/PanelResizeHandle";
import { AddCustomItemForm } from "./components/AddCustomItemForm";
import { MobileBacklogPanel } from "./components/MobileBacklogPanel";
import { useCollectionFiltering } from "./hooks/useCollectionFiltering";
import { usePanelResize } from "./hooks/usePanelResize";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface SimpleCollectionPanelProps {
  groups: CollectionGroup[];
  onItemClick?: (item: CollectionItem) => void;
  selectedItemId?: string;
}

type AnimationState = 'hidden' | 'entering' | 'visible' | 'exiting';

/**
 * "Glass Dock" Collection Panel - A floating dock for managing collection items.
 */
export function SimpleCollectionPanel({ groups, onItemClick, selectedItemId }: SimpleCollectionPanelProps) {
  const isMobileBreakpoint = useMediaQuery('(max-width: 767px)');
  const [isVisible, setIsVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [animState, setAnimState] = useState<AnimationState>('visible');

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Custom hooks
  const { panelHeight, isResizing, handleResizeStart } = usePanelResize();
  const gridDimensions = useGridDimensions(gridContainerRef, {
    minColumns: 3, maxColumns: 10, minItemWidth: 120, gap: 8, aspectRatio: 4 / 5,
  });

  const {
    availableGroups, groupAvailableCounts, totalItemCount,
    displayGroups, filteredItemCount, flatFilteredItems,
    groupMatchCounts, groupNameMatches,
  } = useCollectionFiltering(groups, activeTab, deferredSearchQuery);

  const quickSelect = useQuickSelect({ visibleItems: flatFilteredItems, enabled: isVisible });

  // SSR safety
  useEffect(() => { setMounted(true); }, []);

  // Animation state machine
  useEffect(() => {
    if (isVisible && animState === 'hidden') setAnimState('entering');
    else if (!isVisible && animState === 'visible') setAnimState('exiting');
  }, [isVisible, animState]);

  const handleAnimationEnd = useCallback((e: React.AnimationEvent) => {
    if (e.target !== e.currentTarget) return;
    if (animState === 'entering') setAnimState('visible');
    else if (animState === 'exiting') setAnimState('hidden');
  }, [animState]);

  // Layout calculations
  const isCompactMode = panelHeight < 300;
  const gridHeight = Math.max(150, panelHeight - 36 - (quickSelect.state.isActive ? 32 : 0) -
    (isCompactMode ? 8 : 16));

  // Reset to 'all' if selected group becomes empty
  useEffect(() => {
    if (activeTab !== 'all' && (groupAvailableCounts[activeTab] ?? 0) === 0) {
      setActiveTab('all');
    }
  }, [groupAvailableCounts, activeTab]);

  // Clear search when panel hides
  useEffect(() => {
    if (!isVisible) {
      if (searchQuery) setSearchQuery('');
      if (quickSelect.state.isActive) quickSelect.deactivateQuickSelect();
    }
  }, [isVisible, searchQuery, quickSelect]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.key === 'q' && !isInInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        quickSelect.toggleQuickSelect();
        return;
      }
      if (quickSelect.state.isActive) {
        if (e.key === 'Escape') { e.preventDefault(); quickSelect.deactivateQuickSelect(); return; }
        if (!isInInput && quickSelect.handleKeyPress(e.key)) e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, quickSelect]);

  if (!mounted) return null;

  // On mobile (< 768px), render the bottom sheet panel instead of the desktop sidebar
  if (isMobileBreakpoint) {
    return createPortal(
      <MobileBacklogPanel
        items={flatFilteredItems}
        totalCount={totalItemCount}
      />,
      document.body
    );
  }

  const shouldRenderPanel = animState !== 'hidden';

  return createPortal(
    <>
      <CollectionToggleButton isVisible={isVisible} onToggle={() => setIsVisible(v => !v)} />

      {shouldRenderPanel && (
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50",
            animState === 'entering' && "animate-[collection-panel-slide-in_0.3s_ease-out_forwards]",
            animState === 'exiting' && "animate-[collection-panel-slide-out_0.25s_ease-in_forwards]"
          )}
          style={{ height: panelHeight }}
          onAnimationEnd={handleAnimationEnd}
          data-testid="collection-panel"
        >
          <PanelResizeHandle isResizing={isResizing} onResizeStart={handleResizeStart} />

          <div className="w-full h-full glass-dock-panel flex flex-col overflow-hidden rounded-t-xl">
            <CompactCollectionHeader
              totalItems={totalItemCount}
              filteredItemCount={filteredItemCount}
              isVisible={isVisible}
              onTogglePanel={() => setIsVisible(v => !v)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeCategory={activeTab === 'all' ? 'all' : (availableGroups.find(g => g.id === activeTab)?.name || activeTab)}
              searchableItems={flatFilteredItems}
            />

            {quickSelect.state.isActive && (
              <div className="px-3 py-1 shrink-0 border-b border-white/5">
                <QuickSelectStatusBar
                  isActive={quickSelect.state.isActive}
                  mode={quickSelect.state.mode}
                  selectedItemTitle={quickSelect.state.selectedItemId ? flatFilteredItems.find(i => i.id === quickSelect.state.selectedItemId)?.title : undefined}
                  statusMessage={quickSelect.state.statusMessage}
                  onToggle={quickSelect.toggleQuickSelect}
                  onClear={quickSelect.clearSelection}
                />
              </div>
            )}

            {/* Add Custom Item Form */}
            {(() => {
              const targetGroup = activeTab !== 'all'
                ? availableGroups.find(g => g.id === activeTab)
                : availableGroups[0];
              if (!targetGroup) return null;
              return (
                <AddCustomItemForm
                  category={targetGroup.category || ''}
                  subcategory={targetGroup.subcategory || undefined}
                  groupId={targetGroup.id}
                />
              );
            })()}

            <div className={cn("flex flex-1 min-h-0 overflow-hidden", isCompactMode && "gap-0.5")}>
              <CollectionSidebar groups={availableGroups} groupAvailableCounts={groupAvailableCounts}
                activeTab={activeTab} onTabChange={setActiveTab} totalItemCount={totalItemCount}
                searchQuery={deferredSearchQuery} groupMatchCounts={groupMatchCounts}
                groupNameMatches={groupNameMatches} />

              <div className={cn("flex-1 min-h-0 overflow-hidden", isCompactMode ? "p-1" : "p-2")}>
                <div ref={gridContainerRef} className="w-full h-full" data-testid="collection-grid-container">
                  <VirtualizedCollectionGrid
                    displayGroups={displayGroups} searchQuery={deferredSearchQuery}
                    getQuickSelectNumber={quickSelect.state.isActive ? quickSelect.getQuickSelectNumber : undefined}
                    isItemSelected={quickSelect.state.isActive ? quickSelect.isItemSelected : undefined}
                    columnCount={gridDimensions.columnCount} containerHeight={gridHeight}
                    rowHeight={gridDimensions.rowHeight} itemWidth={gridDimensions.itemWidth}
                    onItemClick={onItemClick} selectedItemId={selectedItemId}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
