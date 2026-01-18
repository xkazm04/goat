"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { DndContext, DragEndEvent, DragMoveEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { backlogGroupsToCollectionGroups } from "../../Collection";
import { SimpleCollectionPanel } from "../sub_MatchCollections/SimpleCollectionPanel";
import { CollectionItem } from "../../Collection/types";
import { BacklogItem } from "@/types/backlog-groups";
import { GridItemType } from "@/types/match";
import { useGridStore } from "@/stores/grid-store";
import { useBacklogStore } from "@/stores/backlog-store";
import { useCurrentList } from "@/stores/use-list-store";
import { useMatchStore } from "@/stores/match-store";
import { TutorialPanel, useTutorialPanel } from "../components/TutorialPanel";
import { LazyShareModal } from "../components/LazyModals";

// Import modular components
import { ViewSwitcher, ViewMode } from "./components/ViewSwitcher";
import { PodiumView } from "./components/PodiumView";
import { GoatView } from "./components/GoatView";
import { MountRushmoreView } from "./components/MountRushmoreView";
import { BracketView } from "./components/BracketView";
import { TierListView } from "./components/TierListView";
import { GridSection } from "./components/GridSection";
import { MatchGridHeader } from "./components/MatchGridHeader";
import { PortalDragOverlay } from "./components/PortalDragOverlay";
import { DropZoneHighlightProvider, useDropZoneHighlight } from "./components/DropZoneHighlightContext";
import { getItemTitle } from "./lib/helpers";

/**
 * "Neon Arena" Match Grid
 * The main stage for the matching experience.
 */
export function SimpleMatchGrid() {
  return (
    <DropZoneHighlightProvider>
      <SimpleMatchGridInner />
    </DropZoneHighlightProvider>
  );
}

/**
 * Inner component that uses the highlight context
 */
function SimpleMatchGridInner() {
  // Get the highlight context for drag state synchronization
  const { setIsDragging, setHoveredPosition } = useDropZoneHighlight();

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('podium');

  // Get current list from store (populated from API)
  const currentList = useCurrentList();

  // Connect to stores
  const gridItems = useGridStore(state => state.gridItems);
  const maxGridSize = useGridStore(state => state.maxGridSize);
  const assignItemToGrid = useGridStore(state => state.assignItemToGrid);
  const removeItemFromGrid = useGridStore(state => state.removeItemFromGrid);
  const moveGridItem = useGridStore(state => state.moveGridItem);

  const groups = useBacklogStore(state => state.groups);
  const markItemAsUsed = useBacklogStore(state => state.markItemAsUsed);

  // Match store for share modal
  const setShowResultShareModal = useMatchStore(state => state.setShowResultShareModal);

  // Drag state - simple: just track active item and target position
  const [activeItem, setActiveItem] = useState<CollectionItem | GridItemType | null>(null);
  const [activeType, setActiveType] = useState<'collection' | 'grid' | null>(null);
  const [targetPosition, setTargetPosition] = useState<number | null>(null);

  // Track if we've already shown the share modal for this session
  const hasShownShareModal = useRef(false);

  // Tutorial state - triggered by help icon only
  const { isOpen: showTutorial, showTutorial: openTutorial, hideTutorial } = useTutorialPanel();

  // Get all backlog items from groups for bracket view
  const allBacklogItems = useMemo(() => {
    return groups.flatMap(group => group.items || []);
  }, [groups]);

  // Handle bracket ranking completion - apply ranked items to grid
  const handleBracketRankingComplete = useCallback((rankedItems: BacklogItem[]) => {
    // Apply each ranked item to the grid in order
    rankedItems.forEach((item, index) => {
      if (index < maxGridSize) {
        assignItemToGrid(item, index);
        markItemAsUsed(item.id, true);
      }
    });

    // Switch back to podium view to show results
    setViewMode('podium');
  }, [assignItemToGrid, markItemAsUsed, maxGridSize]);

  // Calculate completion status
  const filledPositions = useMemo(() => {
    return gridItems.filter(item => item.matched).length;
  }, [gridItems]);

  const isComplete = useMemo(() => {
    const targetSize = currentList?.size || maxGridSize;
    return filledPositions >= targetSize && targetSize > 0;
  }, [filledPositions, currentList?.size, maxGridSize]);

  // Show share modal when ranking is complete
  useEffect(() => {
    if (isComplete && !hasShownShareModal.current && !showTutorial) {
      // Small delay to let the last drop animation complete
      const timer = setTimeout(() => {
        hasShownShareModal.current = true;
        setShowResultShareModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, showTutorial, setShowResultShareModal]);

  // Reset the share modal flag when list changes
  useEffect(() => {
    hasShownShareModal.current = false;
  }, [currentList?.id]);

  // Simple pointer sensor
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Slightly higher threshold to prevent accidental drags
      },
    })
  );

  /**
   * Simple drag start handler
   */
  const handleDragStart = useCallback((event: any) => {
    const { active } = event;
    const itemData = active.data.current;

    // Extract item data for drag overlay
    let activeItemData = null;
    if (itemData?.type === 'collection-item' && itemData.item) {
      activeItemData = {
        id: itemData.item.id,
        title: itemData.item.title || itemData.item.name,
        image_url: itemData.item.image_url,
      };
      setActiveType('collection');
    } else if (itemData?.type === 'grid-item' && itemData.item) {
      activeItemData = {
        id: itemData.item.id,
        title: itemData.item.title || itemData.item.name,
        image_url: itemData.item.image_url,
      };
      setActiveType('grid');
    }

    setActiveItem(activeItemData);
    setTargetPosition(null);
    setIsDragging(true, String(active.id), activeItemData);
  }, [setIsDragging]);

  /**
   * Simple drag move handler - just track target position
   */
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    // Update target position based on drop target
    if (event.over?.data?.current?.type === 'grid-slot') {
      const position = event.over.data.current.position;
      setTargetPosition(position);
      setHoveredPosition(position);
    } else {
      setTargetPosition(null);
      setHoveredPosition(null);
    }
  }, [setHoveredPosition]);

  /**
   * Simple drag end handler - perform the drop action
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    // Clear drag state
    setActiveItem(null);
    setActiveType(null);
    setTargetPosition(null);
    setIsDragging(false);
    setHoveredPosition(null);

    if (!over) return;

    const itemData = active.data.current;
    const dropData = over.data.current;

    // Case 1: Collection item dropped on grid slot
    if (itemData?.type === 'collection-item' && dropData?.type === 'grid-slot') {
      const position = dropData.position;
      const item: BacklogItem = itemData.item;

      console.log(`🎯 Dropping collection item ${item.id} at position ${position}`);
      assignItemToGrid(item, position);
      markItemAsUsed(item.id, true);
    }

    // Case 2: Grid item dropped on another grid slot (move/swap)
    if (itemData?.type === 'grid-item' && dropData?.type === 'grid-slot') {
      const fromPosition = itemData.position;
      const toPosition = dropData.position;

      if (fromPosition === toPosition) return;

      console.log(`🔄 Moving item: position ${fromPosition} → position ${toPosition}`);
      moveGridItem(fromPosition, toPosition);
    }
  }, [assignItemToGrid, markItemAsUsed, moveGridItem, setIsDragging, setHoveredPosition]);

  const handleRemove = useCallback((position: number) => {
    const item = gridItems[position];

    if (item && item.backlogItemId) {
      console.log(`🗑️ Removing item from position ${position}`);

      removeItemFromGrid(position);
      markItemAsUsed(item.backlogItemId, false);
    }
  }, [gridItems, removeItemFromGrid, markItemAsUsed]);

  return (
    <>
      {/* Tutorial Panel - triggered by help icon */}
      <TutorialPanel
        isOpen={showTutorial}
        onClose={hideTutorial}
      />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <div className="min-h-screen bg-[#050505] pb-[420px] relative" data-testid="match-grid-container">

          {/* Animated Background - contained with overflow-hidden */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-[#050505] to-[#050505]" />
            <div className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: 'linear-gradient(0deg, transparent 24%, #22d3ee 25%, #22d3ee 26%, transparent 27%, transparent 74%, #22d3ee 75%, #22d3ee 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #22d3ee 25%, #22d3ee 26%, transparent 27%, transparent 74%, #22d3ee 75%, #22d3ee 76%, transparent 77%, transparent)',
                backgroundSize: '60px 60px'
              }}
            />
          </div>

          {/* Header with ViewSwitcher */}
          <div className="relative z-10">
            <div className="max-w-7xl mx-auto px-8">
              <div className="flex items-start justify-between pt-8">
                {/* Header content */}
                <MatchGridHeader
                  title={currentList?.title || "Neon Arena"}
                  subtitle={currentList?.description || "Assemble Your Dream Team"}
                  onHelpClick={openTutorial}
                />
                
                {/* View Switcher - Top Right */}
                <div className="pt-4">
                  <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />
                </div>
              </div>
            </div>
          </div>

          {/* Grid Area */}
          <div className="max-w-7xl mx-auto px-8 relative z-10">

            {/* Render the appropriate view */}
            {viewMode === 'podium' && (
              <PodiumView
                gridItems={gridItems}
                onRemove={handleRemove}
                getItemTitle={getItemTitle}
              />
            )}

            {viewMode === 'goat' && (
              <GoatView
                gridItems={gridItems}
                onRemove={handleRemove}
                getItemTitle={getItemTitle}
              />
            )}

            {viewMode === 'rushmore' && (
              <MountRushmoreView
                gridItems={gridItems}
                onRemove={handleRemove}
                getItemTitle={getItemTitle}
              />
            )}

            {viewMode === 'bracket' && (
              <BracketView
                gridItems={gridItems}
                backlogItems={allBacklogItems}
                onRankingComplete={handleBracketRankingComplete}
                listSize={currentList?.size || maxGridSize}
              />
            )}

            {viewMode === 'tierlist' && (
              <TierListView
                gridItems={gridItems}
                backlogItems={allBacklogItems}
                onRankingComplete={handleBracketRankingComplete}
                listSize={currentList?.size || maxGridSize}
                listTitle={currentList?.title || "Tier List"}
              />
            )}

            {/* Main Grid Sections - hidden in bracket and tierlist mode */}
            {viewMode !== 'bracket' && viewMode !== 'tierlist' && (
              <div className="space-y-12">
                {/* Positions 4-10 (or 5-10 for rushmore) */}
                {gridItems.length > (viewMode === 'rushmore' ? 4 : 3) && (
                  <GridSection
                    title="Elite Tier"
                    gridItems={gridItems}
                    startPosition={viewMode === 'rushmore' ? 4 : 3}
                    endPosition={Math.min(10, gridItems.length)}
                    columns={7}
                    onRemove={handleRemove}
                    getItemTitle={getItemTitle}
                  />
                )}

                {/* Positions 11-20 */}
                {gridItems.length > 10 && (
                  <GridSection
                    title="Core Roster"
                    gridItems={gridItems}
                    startPosition={10}
                    endPosition={Math.min(20, gridItems.length)}
                    columns={10}
                    gap={3}
                    onRemove={handleRemove}
                    getItemTitle={getItemTitle}
                  />
                )}

                {/* Positions 21-35 */}
                {gridItems.length > 20 && (
                  <GridSection
                    title="Rising Stars"
                    gridItems={gridItems}
                    startPosition={20}
                    endPosition={Math.min(35, gridItems.length)}
                    columns={10}
                    gap={3}
                    onRemove={handleRemove}
                    getItemTitle={getItemTitle}
                  />
                )}

                {/* Positions 36-50 */}
                {gridItems.length > 35 && (
                  <GridSection
                    title="Reserves"
                    gridItems={gridItems}
                    startPosition={35}
                    endPosition={Math.min(50, gridItems.length)}
                    columns={10}
                    gap={3}
                    onRemove={handleRemove}
                    getItemTitle={getItemTitle}
                  />
                )}
              </div>
            )}
          </div>

          {/* Collection Panel - Fixed at bottom (hidden in bracket and tierlist mode) */}
          {viewMode !== 'bracket' && viewMode !== 'tierlist' && (
            <SimpleCollectionPanel groups={backlogGroupsToCollectionGroups(groups)} />
          )}
        </div>

        {/* Portal-based Drag Overlay - bypasses all CSS clipping/scroll issues */}
        <PortalDragOverlay item={activeItem} targetPosition={targetPosition} />
      </DndContext>

      {/* Share Modal - shown when ranking is complete (lazy loaded) */}
      <LazyShareModal />
    </>
  );
}
