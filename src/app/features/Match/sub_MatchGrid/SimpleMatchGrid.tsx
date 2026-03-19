"use client";

import { DndContext, DragEndEvent, DragMoveEvent, PointerSensor, TouchSensor, useSensor, useSensors, pointerWithin, type Announcements, type ScreenReaderInstructions } from "@dnd-kit/core";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";

import { CompletionModal } from "@/components/app/modals/completion/CompletionModal";
import { AudioPlayer } from "@/components/AudioPlayer";
import { AuthPrompt } from "@/components/auth";
import { RankingProgressLayer } from "@/components/visual/RankingProgressLayer";
import { useAuthUser } from "@/hooks/use-auth-user";
import { createStandardRouter, type OperationStoreContext } from "@/lib/dnd";
import { useBacklogStore } from "@/stores/backlog-store";
import { useGridStore } from "@/stores/grid-store";
import { BacklogItem } from "@/types/backlog-groups";
import { backlogGroupsToItemCategories } from "../../Collection";
import { CollectionItem } from "../../Collection/types";
import { SimpleCollectionPanel } from "../sub_MatchCollections/SimpleCollectionPanel";
import { useCurrentList } from "@/stores/use-list-store";
import { useMatchStore } from "@/stores/match-store";
import { useRankingStore } from "@/stores/ranking-store";

import { LazyShareModal } from "../components/LazyModals";


// Import modular components
import { DropZoneHighlightProvider, useDropZoneHighlight } from "./components/DropZoneHighlightContext";
import { ViewSelector } from "./components/GridRenderer";
import { GridSection } from "./components/GridSection";
import { MatchGridHeader } from "./components/MatchGridHeader";
import { PortalDragOverlay } from "./components/PortalDragOverlay";
import { TierListView } from "./components/TierListView";
import { ViewSwitcher, ViewMode } from "./components/ViewSwitcher";
import { BracketView } from "../sub_MatchBracket";
import { StandaloneAnnouncer } from "./components/ScreenReaderAnnouncer";


import { ComparisonDrawer } from "../components/ComparisonDrawer";
import { PositionHistoryProvider } from "../components/PositionHistoryContext";

import { useUndoKeyboard } from "@/hooks/use-undo-keyboard";

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
  const { setIsDragging, setHoveredPosition, emitDragError } = useDropZoneHighlight();

  // Screen reader error announcement state
  const [dragErrorMessage, setDragErrorMessage] = useState("");

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
  const clearGrid = useGridStore(state => state.clearGrid);
  const moveGridItem = useGridStore(state => state.moveGridItem);

  const groups = useBacklogStore(state => state.groups);
  const markItemAsUsed = useBacklogStore(state => state.markItemAsUsed);

  // Match store for share modal
  const setShowResultShareModal = useMatchStore(state => state.setShowResultShareModal);

  // Ranking store for tier mode operations
  const assignToTier = useRankingStore(state => state.assignToTier);
  const addToUnranked = useRankingStore(state => state.addToUnranked);
  const moveBetweenTiers = useRankingStore(state => state.moveBetweenTiers);
  const moveWithinTier = useRankingStore(state => state.moveWithinTier);
  const setRankingActiveMode = useRankingStore(state => state.setActiveMode);
  const setRankingDirectViewMode = useRankingStore(state => state.setDirectViewMode);
  const initializeRanking = useRankingStore(state => state.initializeRanking);
  const tierState = useRankingStore(state => state.tierState);
  const syncRankingFromTiers = useRankingStore(state => state.syncRankingFromTiers);

  // Backlog store functions for router
  const getItemById = useBacklogStore(state => state.getItemById);
  const isItemUsed = useBacklogStore(state => state.isItemUsed);
  const emitValidationError = useGridStore(state => state.emitValidationError);

  // Create the drag operation router with all operations (grid + tier)
  const dragRouter = useMemo(() => createStandardRouter({ debug: false }), []);

  // dnd-kit accessibility: announce drag operations to screen readers (WCAG 2.1 4.1.3)
  const dndAccessibility = useMemo(() => {
    const getItemName = (active: { data: { current?: Record<string, unknown> } }) => {
      const d = active.data.current;
      if (d?.item) {
        const item = d.item as { title?: string; name?: string };
        return item.title || item.name || 'item';
      }
      return 'item';
    };

    const getDropTarget = (over: { id: string | number; data: { current?: Record<string, unknown> } } | null) => {
      if (!over) return null;
      const d = over.data.current;
      if (d?.type === 'grid-slot') return `position ${(d.position as number) + 1}`;
      if (d?.type === 'tier-row') return `${(d.tierName as string) || 'tier'} tier`;
      if (d?.type === 'tier-item') return `${(d.tierName as string) || 'tier'} tier`;
      if (d?.type === 'unranked-pool') return 'unranked pool';
      return null;
    };

    const announcements: Announcements = {
      onDragStart({ active }) {
        return `Dragging ${getItemName(active)}`;
      },
      onDragOver({ active, over }) {
        const target = getDropTarget(over);
        if (target) return `Over ${target}`;
        return undefined;
      },
      onDragEnd({ active, over }) {
        const target = getDropTarget(over);
        if (target) return `Placed ${getItemName(active)} in ${target}`;
        return `Cancelled drag`;
      },
      onDragCancel() {
        return `Cancelled drag`;
      },
    };

    const screenReaderInstructions: ScreenReaderInstructions = {
      draggable: 'To pick up a draggable item, press Space or Enter. Use arrow keys to move. Press Space or Enter again to drop the item, or press Escape to cancel.',
    };

    return { announcements, screenReaderInstructions };
  }, []);

  // Memoize store context so the object identity only changes when grid data
  // actually changes. Action methods from Zustand selectors are stable refs,
  // so only gridItems and maxGridSize are meaningful deps.
  const storeContext = useMemo((): OperationStoreContext => ({
    grid: {
      gridItems,
      maxGridSize,
      assignItemToGrid,
      removeItemFromGrid,
      moveGridItem,
      emitValidationError,
    },
    backlog: {
      getItemById,
      isItemUsed,
      markItemAsUsed,
    },
    tier: {
      assignToTier,
      moveBetweenTiers,
      addToUnranked,
      moveWithinTier,
    },
  }), [gridItems, maxGridSize, assignItemToGrid, removeItemFromGrid, moveGridItem, emitValidationError, getItemById, isItemUsed, markItemAsUsed, assignToTier, moveBetweenTiers, addToUnranked, moveWithinTier]);

  // Ref keeps the latest memoized context accessible from stable callbacks
  // without adding storeContext to their dependency arrays.
  const storeContextRef = useRef(storeContext);
  storeContextRef.current = storeContext;

  const getStoreContext = useCallback(
    (): OperationStoreContext => storeContextRef.current,
    [],
  );

  // Undo/redo keyboard handler (Ctrl+Z / Ctrl+Shift+Z)
  useUndoKeyboard({ getStoreContext });

  // Drag state - simple: just track active item and target position
  // The activeItem is a simplified representation for the drag overlay
  const [activeItem, setActiveItem] = useState<{ id?: string; title: string; image_url?: string | null } | null>(null);
  const [activeType, setActiveType] = useState<'collection' | 'grid' | null>(null);
  const [targetPosition, setTargetPosition] = useState<number | null>(null);

  // Auth state for post-completion prompt
  const { isGuest } = useAuthUser();

  // Track if we've already shown the share modal for this session
  const hasShownShareModal = useRef(false);

  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [hasUserDismissedCompletion, setHasUserDismissedCompletion] = useState(false);

  // Get all backlog items from groups for bracket view
  const allBacklogItems = useMemo(() => {
    return groups.flatMap(group => group.items || []);
  }, [groups]);

  // Handle view mode change - sync with ranking store
  const handleViewModeChange = useCallback((newMode: ViewMode) => {
    const previousMode = viewMode;

    // When leaving tier list mode, sync tier state to grid
    if (previousMode === 'tierlist' && newMode !== 'tierlist') {
      // Single-pass: build lookup map and transferable map together
      const itemLookup = new Map<string, BacklogItem>();
      const transferableMap = new Map<string, { id: string; title: string; description?: string; image_url?: string | null; tags?: string[]; category?: string }>();
      for (const item of allBacklogItems) {
        itemLookup.set(item.id, item);
        transferableMap.set(item.id, {
          id: item.id,
          title: item.title || item.name || 'Untitled',
          description: item.description,
          image_url: item.image_url,
          tags: item.tags,
          category: item.category,
        });
      }

      // Sync tier state to ranking store
      syncRankingFromTiers(transferableMap);

      // Clear grid atomically in a single setState (avoids N individual re-renders)
      clearGrid();

      // Apply items from tiers to grid in order (O(1) lookups via Map)
      let gridPosition = 0;
      for (const tier of tierState.tiers) {
        for (const itemId of tier.itemIds) {
          if (gridPosition >= maxGridSize) break;
          const item = itemLookup.get(itemId);
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
  }, [viewMode, allBacklogItems, tierState.tiers, maxGridSize, syncRankingFromTiers, clearGrid, assignItemToGrid, markItemAsUsed, setRankingActiveMode, setRankingDirectViewMode]);

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

  // Show completion modal when ranking is complete
  useEffect(() => {
    if (isComplete && !hasUserDismissedCompletion && !hasShownShareModal.current) {
      // Small delay to let the last drop animation complete
      const timer = setTimeout(() => {
        hasShownShareModal.current = true;
        setShowCompletionModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, hasUserDismissedCompletion]);

  // Reset completion modal flag when list changes
  useEffect(() => {
    hasShownShareModal.current = false;
    setHasUserDismissedCompletion(false);
    setShowCompletionModal(false);
  }, [currentList?.id]);

  // Keep editing handler - dismisses modal and prevents re-show
  const handleKeepEditing = useCallback(() => {
    setShowCompletionModal(false);
    setHasUserDismissedCompletion(true);
  }, []);

  const handleCloseCompletionModal = useCallback(() => {
    setShowCompletionModal(false);
  }, []);

  // Switch grid store to new list when list changes
  useEffect(() => {
    if (currentList?.id && currentList?.size > 0) {
      // Only switch if we're actually changing lists
      if (currentListId !== currentList.id) {
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

  // Pointer sensor for desktop, touch sensor with long-press delay for mobile reorder
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2, // Low threshold for responsive drag initiation
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 350, // Long-press to pick up (iOS home screen UX)
        tolerance: 5, // Allow slight finger movement during hold
      },
    })
  );

  /**
   * Simple drag start handler
   */
  const handleDragStart = useCallback((event: { active: { id: string | number; data: { current: Record<string, unknown> | undefined } } }) => {
    const { active } = event;
    const itemData = active.data.current;

    // Extract item data for drag overlay
    let activeItemData: { id?: string; title: string; image_url?: string | null } | null = null;
    if (itemData?.type === 'collection-item' && itemData.item) {
      const item = itemData.item as { id: string; title?: string; name?: string; image_url?: string | null };
      activeItemData = {
        id: item.id,
        title: item.title || item.name || 'Untitled',
        image_url: item.image_url,
      };
      setActiveType('collection');
    } else if (itemData?.type === 'grid-item' && itemData.item) {
      const item = itemData.item as { id: string; title?: string; name?: string; image_url?: string | null };
      activeItemData = {
        id: item.id,
        title: item.title || item.name || 'Untitled',
        image_url: item.image_url,
      };
      setActiveType('grid');
    }

    setActiveItem(activeItemData);
    setTargetPosition(null);
    // Convert to ActiveItemData format (id is required string)
    const highlightData = activeItemData && activeItemData.id
      ? { id: activeItemData.id, title: activeItemData.title, image_url: activeItemData.image_url ?? undefined }
      : null;
    setIsDragging(true, String(active.id), highlightData);
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
   * Unified drag end handler - delegates to DragOperationRouter
   * The router handles all drag scenarios: grid slots, tier rows, unranked pool
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    // Capture target position before clearing state
    const overData = event.over?.data?.current;
    const errorPosition = overData?.type === 'grid-slot' ? (overData.position as number) : null;

    // Clear drag state first
    setActiveItem(null);
    setActiveType(null);
    setTargetPosition(null);
    setIsDragging(false);
    setHoveredPosition(null);

    // Early return if no drop target
    if (!event.over) return;

    // Delegate to the DragOperationRouter
    const storeContext = getStoreContext();
    const result = dragRouter.handleDragEnd(event, storeContext);

    // Emit error feedback for failed operations
    if (!result.success && result.operationType !== 'noop') {
      const errorMsg = result.errorMessage || 'Drop not allowed here';
      emitDragError(errorPosition, errorMsg);
      setDragErrorMessage(errorMsg);
    }

  }, [dragRouter, getStoreContext, setIsDragging, setHoveredPosition, emitDragError]);

  const handleRemove = useCallback((position: number) => {
    const item = useGridStore.getState().gridItems[position];

    if (item && item.backlogItemId) {
      removeItemFromGrid(position);
      markItemAsUsed(item.backlogItemId, false);
    }
  }, [removeItemFromGrid, markItemAsUsed]);

  // Click-to-place: selected backlog item state (shared for desktop + mobile)
  const mobileSelectedItem = useGridStore(state => state.mobileSelectedItem);
  const setMobileSelectedItem = useGridStore(state => state.setMobileSelectedItem);

  const handleCollectionItemClick = useCallback((item: CollectionItem) => {
    if (mobileSelectedItem?.id === item.id) {
      // Deselect if clicking the same item
      setMobileSelectedItem(null);
    } else {
      setMobileSelectedItem({
        id: item.id,
        title: item.title,
        image_url: item.image_url ?? undefined,
      });
    }
  }, [mobileSelectedItem, setMobileSelectedItem]);

  return (
    <>
      {/* Screen reader announcement for drag errors */}
      <StandaloneAnnouncer message={dragErrorMessage} priority="assertive" clearAfter={1000} />

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        accessibility={dndAccessibility}
      >
        <PositionHistoryProvider listId={currentList?.id ?? null} gridItems={gridItems}>
        <RankingProgressLayer>
        <div
          className="min-h-screen bg-[#050505] relative"
          style={{ paddingBottom: 'var(--collection-panel-height, 420px)' }}
          data-testid="match-grid-container"
        >

          {/* Animated Background - contained with overflow-hidden */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-brand-muted/20 via-[#050505] to-[#050505]" />
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
            <MatchGridHeader
              title={currentList?.title || "Neon Arena"}
            />

            <div className="max-w-7xl mx-auto px-8">
              <div className="flex justify-end pt-8">
                {/* View Switcher - Top Right */}
                <ViewSwitcher currentView={viewMode} onViewChange={handleViewModeChange} />
              </div>
            </div>
          </div>

          {/* Grid Area */}
          <div className="max-w-7xl mx-auto px-8 relative z-10">

            {/* Render the appropriate view (lazy-loaded via GridRenderer) */}
            <ViewSelector
              viewMode={viewMode}
              gridItems={gridItems}
              onRemove={handleRemove}
            />

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

            {/* Unified Grid - hidden in bracket and tierlist mode */}
            {viewMode !== 'bracket' && viewMode !== 'tierlist' && (
              <GridSection
                startPosition={viewMode === 'rushmore' ? 4 : 3}
                endPosition={gridItems.length}
                columns={10}
                gap={3}
                onRemove={handleRemove}
              />
            )}
          </div>
        </div>
        </RankingProgressLayer>
        </PositionHistoryProvider>

        {/* Collection Panel - Fixed at bottom, OUTSIDE scrollable container (hidden in bracket mode only) */}
        {viewMode !== 'bracket' && (
          <SimpleCollectionPanel
            groups={backlogGroupsToItemCategories(groups)}
            onItemClick={handleCollectionItemClick}
            selectedItemId={mobileSelectedItem?.id}
          />
        )}

        {/* Portal-based Drag Overlay - bypasses all CSS clipping/scroll issues */}
        <PortalDragOverlay item={activeItem} targetPosition={targetPosition} />
      </DndContext>

      {/* Completion Modal - auto-shown when all grid positions are filled */}
      <CompletionModal
        isOpen={showCompletionModal}
        onClose={handleCloseCompletionModal}
        onKeepEditing={handleKeepEditing}
        listTitle={currentList?.title || "My Ranking"}
        completionData={{
          totalItems: filledPositions,
          timeTaken: "",
          category: currentList?.category || "",
        }}
      />

      {/* Post-completion auth prompt for guests */}
      {isComplete && isGuest && !showCompletionModal && (
        <div className="fixed bottom-[440px] left-1/2 -translate-x-1/2 z-sticky w-full max-w-lg px-4">
          <AuthPrompt />
        </div>
      )}

      {/* Share Modal - shown when ranking is complete (lazy loaded) */}
      <LazyShareModal />

      {/* Audio Player for Music category */}
      <AudioPlayer />

      {/* Floating comparison drawer */}
      <ComparisonDrawer />
    </>
  );
}
