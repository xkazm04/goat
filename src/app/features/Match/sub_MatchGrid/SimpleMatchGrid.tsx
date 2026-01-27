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
import { useRankingStore } from "@/stores/ranking-store";
import { LazyShareModal } from "../components/LazyModals";
import { isUnifiedDragData, isUnifiedDropData, determineTransferRoute } from "@/lib/dnd/unified-protocol";

// Import modular components
import { ViewSwitcher, ViewMode } from "./components/ViewSwitcher";
import { PodiumView } from "./components/PodiumView";
import { GoatView } from "./components/GoatView";
import { MountRushmoreView } from "./components/MountRushmoreView";
import { BracketView } from "../sub_MatchBracket";
import { TierListView } from "./components/TierListView";
import { GridSection } from "./components/GridSection";
import { MatchGridHeader } from "./components/MatchGridHeader";
import { PortalDragOverlay } from "./components/PortalDragOverlay";
import { DropZoneHighlightProvider, useDropZoneHighlight } from "./components/DropZoneHighlightContext";
import { getItemTitle } from "./lib/helpers";
import { AudioPlayer } from "@/components/AudioPlayer";

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
  const currentListId = useGridStore(state => state.currentListId);
  const switchList = useGridStore(state => state.switchList);
  const assignItemToGrid = useGridStore(state => state.assignItemToGrid);
  const removeItemFromGrid = useGridStore(state => state.removeItemFromGrid);
  const moveGridItem = useGridStore(state => state.moveGridItem);

  const groups = useBacklogStore(state => state.groups);
  const markItemAsUsed = useBacklogStore(state => state.markItemAsUsed);

  // Match store for share modal
  const setShowResultShareModal = useMatchStore(state => state.setShowResultShareModal);

  // Ranking store for tier mode operations
  const assignToTier = useRankingStore(state => state.assignToTier);
  const addToUnranked = useRankingStore(state => state.addToUnranked);
  const moveBetweenTiers = useRankingStore(state => state.moveBetweenTiers);
  const setRankingActiveMode = useRankingStore(state => state.setActiveMode);
  const setRankingDirectViewMode = useRankingStore(state => state.setDirectViewMode);
  const initializeRanking = useRankingStore(state => state.initializeRanking);
  const tierState = useRankingStore(state => state.tierState);
  const syncRankingFromTiers = useRankingStore(state => state.syncRankingFromTiers);

  // Drag state - simple: just track active item and target position
  const [activeItem, setActiveItem] = useState<CollectionItem | GridItemType | null>(null);
  const [activeType, setActiveType] = useState<'collection' | 'grid' | null>(null);
  const [targetPosition, setTargetPosition] = useState<number | null>(null);

  // Track if we've already shown the share modal for this session
  const hasShownShareModal = useRef(false);

  // Get all backlog items from groups for bracket view
  const allBacklogItems = useMemo(() => {
    return groups.flatMap(group => group.items || []);
  }, [groups]);

  // Handle view mode change - sync with ranking store
  const handleViewModeChange = useCallback((newMode: ViewMode) => {
    const previousMode = viewMode;

    // When leaving tier list mode, sync tier state to grid
    if (previousMode === 'tierlist' && newMode !== 'tierlist') {
      // Build items map for sync
      const transferableMap = new Map(
        allBacklogItems.map(item => [
          item.id,
          {
            id: item.id,
            title: item.title || item.name || 'Untitled',
            description: item.description,
            image_url: item.image_url,
            tags: item.tags,
            category: item.category,
          },
        ])
      );

      // Sync tier state to ranking store
      syncRankingFromTiers(transferableMap);

      // Apply tier items to grid in order (top-left to bottom-right)
      // Clear grid first, then apply tier items
      gridItems.forEach((_, index) => {
        if (gridItems[index].matched) {
          removeItemFromGrid(index);
        }
      });

      // Apply items from tiers to grid in order
      let gridPosition = 0;
      for (const tier of tierState.tiers) {
        for (const itemId of tier.itemIds) {
          if (gridPosition >= maxGridSize) break;
          const item = allBacklogItems.find(i => i.id === itemId);
          if (item) {
            assignItemToGrid(item, gridPosition);
            markItemAsUsed(item.id, true);
            gridPosition++;
          }
        }
      }
    }

    setViewMode(newMode);

    // Map ViewMode to RankingMode for the store
    if (newMode === 'bracket') {
      setRankingActiveMode('bracket');
    } else if (newMode === 'tierlist') {
      setRankingActiveMode('tierlist');
    } else {
      // podium, goat, rushmore are all "direct" ranking modes
      setRankingActiveMode('direct');
      // Also set the direct view mode
      if (newMode === 'podium' || newMode === 'goat' || newMode === 'rushmore') {
        setRankingDirectViewMode(newMode);
      }
    }
  }, [viewMode, allBacklogItems, tierState.tiers, gridItems, maxGridSize, syncRankingFromTiers, removeItemFromGrid, assignItemToGrid, markItemAsUsed, setRankingActiveMode, setRankingDirectViewMode]);

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
    handleViewModeChange('podium');
  }, [assignItemToGrid, markItemAsUsed, maxGridSize, handleViewModeChange]);

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
    if (isComplete && !hasShownShareModal.current) {
      // Small delay to let the last drop animation complete
      const timer = setTimeout(() => {
        hasShownShareModal.current = true;
        setShowResultShareModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, setShowResultShareModal]);

  // Reset the share modal flag when list changes
  useEffect(() => {
    hasShownShareModal.current = false;
  }, [currentList?.id]);

  // Switch grid store to new list when list changes
  useEffect(() => {
    if (currentList?.id && currentList?.size > 0) {
      // Only switch if we're actually changing lists
      if (currentListId !== currentList.id) {
        console.log(`🔄 Switching grid to list: ${currentList.id} (size: ${currentList.size})`);
        switchList(currentList.id, currentList.size);
      }
    }
  }, [currentList?.id, currentList?.size, currentListId, switchList]);

  // Initialize ranking store when list size changes
  useEffect(() => {
    const size = currentList?.size || maxGridSize;
    if (size > 0) {
      initializeRanking(size);
    }
  }, [currentList?.size, maxGridSize, initializeRanking]);

  // Simple pointer sensor with minimal activation delay
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2, // Low threshold for responsive drag initiation
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
   * Unified drag move handler - track target position for all drop zones
   */
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const dropData = event.over?.data?.current;

    // Update target position based on drop target type
    if (dropData?.type === 'grid-slot') {
      const position = dropData.position;
      setTargetPosition(position);
      setHoveredPosition(position);
    } else if (dropData?.type === 'tier-row' || dropData?.type === 'tier-item') {
      // For tier drops, we don't track position (tiers don't have numeric positions)
      setTargetPosition(null);
      setHoveredPosition(null);
    } else {
      setTargetPosition(null);
      setHoveredPosition(null);
    }
  }, [setHoveredPosition]);

  /**
   * Unified drag end handler - handles drops across all ranking modes
   * Supports: grid slots, tier rows, unranked pool
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
    const overId = String(over.id);

    // === Case 1: Drop on grid slot ===
    if (dropData?.type === 'grid-slot') {
      const position = dropData.position;

      // Collection item → Grid
      if (itemData?.type === 'collection-item' && itemData.item) {
        const item: BacklogItem = itemData.item;
        console.log(`🎯 Dropping collection item ${item.id} at grid position ${position}`);
        assignItemToGrid(item, position);
        markItemAsUsed(item.id, true);
        return;
      }

      // Grid item → Grid (move/swap)
      if (itemData?.type === 'grid-item') {
        const fromPosition = itemData.position ?? itemData.source?.gridPosition;
        if (fromPosition !== undefined && fromPosition !== position) {
          console.log(`🔄 Moving grid item: position ${fromPosition} → ${position}`);
          moveGridItem(fromPosition, position);
        }
        return;
      }

      // Tier item → Grid (from tier mode to grid slot)
      if (itemData?.type === 'tier-item' && itemData.item) {
        const item = itemData.item;
        console.log(`🎯 Moving tier item ${item.id} to grid position ${position}`);
        assignItemToGrid(item, position);
        markItemAsUsed(item.id, true);
        return;
      }
    }

    // === Case 2: Drop on tier row ===
    if (dropData?.type === 'tier-row' || overId.startsWith('tier-')) {
      const tierId = dropData?.tierId || overId.replace('tier-', '');

      // Collection item → Tier
      if (itemData?.type === 'collection-item' && itemData.item) {
        const item = itemData.item;
        console.log(`🏷️ Assigning collection item ${item.id} to tier ${tierId}`);
        assignToTier(item.id, tierId, {
          id: item.id,
          title: item.title || item.name || 'Untitled',
          description: item.description,
          image_url: item.image_url,
          tags: item.tags,
          category: item.category,
        });
        markItemAsUsed(item.id, true);
        return;
      }

      // Tier item → Tier (move between tiers)
      if (itemData?.type === 'tier-item' && itemData.item) {
        const item = itemData.item;
        const sourceTierId = itemData.source?.tierId;
        if (sourceTierId && sourceTierId !== tierId) {
          console.log(`🔄 Moving tier item ${item.id} from tier ${sourceTierId} to ${tierId}`);
          moveBetweenTiers(item.id, sourceTierId, tierId);
        } else if (!sourceTierId) {
          // From unranked pool to tier
          console.log(`🏷️ Assigning unranked item ${item.id} to tier ${tierId}`);
          assignToTier(item.id, tierId);
        }
        return;
      }
    }

    // === Case 3: Drop on unranked pool ===
    if (dropData?.type === 'unranked-pool' || overId === 'unranked-pool') {
      // Tier item → Unranked
      if (itemData?.type === 'tier-item' && itemData.item) {
        const item = itemData.item;
        console.log(`📦 Moving tier item ${item.id} to unranked pool`);
        addToUnranked(item.id);
        return;
      }
    }

    // === Legacy fallback for backward compatibility ===
    // (Handles any remaining cases from old drag data format)
    if (itemData?.type === 'collection-item' && dropData?.type === 'grid-slot') {
      const position = dropData.position;
      const item: BacklogItem = itemData.item;
      console.log(`🎯 [Legacy] Dropping collection item ${item.id} at position ${position}`);
      assignItemToGrid(item, position);
      markItemAsUsed(item.id, true);
    }

    if (itemData?.type === 'grid-item' && dropData?.type === 'grid-slot') {
      const fromPosition = itemData.position;
      const toPosition = dropData.position;
      if (fromPosition !== toPosition) {
        console.log(`🔄 [Legacy] Moving item: position ${fromPosition} → ${toPosition}`);
        moveGridItem(fromPosition, toPosition);
      }
    }
  }, [assignItemToGrid, markItemAsUsed, moveGridItem, setIsDragging, setHoveredPosition, assignToTier, addToUnranked, moveBetweenTiers]);

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
            {/* Title - Absolute positioned top left */}
            <MatchGridHeader title={currentList?.title || "Neon Arena"} />

            <div className="max-w-7xl mx-auto px-8">
              <div className="flex justify-end pt-8">
                {/* View Switcher - Top Right */}
                <ViewSwitcher currentView={viewMode} onViewChange={handleViewModeChange} />
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
                onCancel={() => handleViewModeChange('podium')}
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
        </div>

        {/* Collection Panel - Fixed at bottom, OUTSIDE scrollable container (hidden in bracket mode only) */}
        {viewMode !== 'bracket' && (
          <SimpleCollectionPanel groups={backlogGroupsToCollectionGroups(groups)} />
        )}

        {/* Portal-based Drag Overlay - bypasses all CSS clipping/scroll issues */}
        <PortalDragOverlay item={activeItem} targetPosition={targetPosition} />
      </DndContext>

      {/* Share Modal - shown when ranking is complete (lazy loaded) */}
      <LazyShareModal />

      {/* Audio Player for Music category */}
      <AudioPlayer />
    </>
  );
}
