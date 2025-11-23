"use client";

import { useState, useCallback, useEffect } from "react";
import { DndContext, DragOverlay, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { backlogGroupsToCollectionGroups } from "../../Collection";
import { SimpleCollectionPanel } from "../sub_MatchCollections/SimpleCollectionPanel";
import { CollectionItem } from "../../Collection/types";
import { BacklogItem } from "@/types/backlog-groups";
import { GridItemType } from "@/types/match";
import { useGridStore } from "@/stores/grid-store";
import { useBacklogStore } from "@/stores/backlog-store";
import { MatchGridTutorial, useTutorialState } from "../sub_MatchCollections/MatchGridTutorial";
import { useMotionValue, useSpring } from "framer-motion";

// Import modular components
import { ViewSwitcher, ViewMode } from "./components/ViewSwitcher";
import { PodiumView } from "./components/PodiumView";
import { GoatView } from "./components/GoatView";
import { MountRushmoreView } from "./components/MountRushmoreView";
import { GridSection } from "./components/GridSection";
import { MatchGridHeader } from "./components/MatchGridHeader";
import { DragOverlayContent, CursorGlow } from "./components/DragComponents";
import { getItemTitle } from "./lib/helpers";
import { CoalescerMonitor } from "@/components/dev/CoalescerMonitor";

/**
 * "Neon Arena" Match Grid
 * The main stage for the matching experience.
 */
export function SimpleMatchGrid() {
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('podium');

  // Connect to stores
  const gridItems = useGridStore(state => state.gridItems);
  const maxGridSize = useGridStore(state => state.maxGridSize);
  const assignItemToGrid = useGridStore(state => state.assignItemToGrid);
  const removeItemFromGrid = useGridStore(state => state.removeItemFromGrid);
  const moveGridItem = useGridStore(state => state.moveGridItem);
  const loadTutorialData = useGridStore(state => state.loadTutorialData);

  const groups = useBacklogStore(state => state.groups);
  const markItemAsUsed = useBacklogStore(state => state.markItemAsUsed);

  const [activeItem, setActiveItem] = useState<CollectionItem | GridItemType | null>(null);
  const [activeType, setActiveType] = useState<'collection' | 'grid' | null>(null);

  // Cursor-following glow effect
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const glowX = useSpring(cursorX, { damping: 20, stiffness: 200 });
  const glowY = useSpring(cursorY, { damping: 20, stiffness: 200 });

  // Tutorial state
  const { showTutorial, completeTutorial } = useTutorialState();

  // Track mouse position during drag
  useEffect(() => {
    if (!activeItem) return;

    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [activeItem, cursorX, cursorY]);

  // Handle demo data from tutorial
  const handleDemoDataReady = useCallback((demoBacklog: BacklogItem[], demoGrid: GridItemType[]) => {
    console.log("🎓 Loading tutorial demo data", { demoBacklog, demoGrid });
    loadTutorialData(demoGrid);
  }, [loadTutorialData]);

  // Simple sensor - just pointer
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    const itemData = active.data.current;

    if (itemData?.type === 'collection-item') {
      setActiveItem(itemData.item);
      setActiveType('collection');
    } else if (itemData?.type === 'grid-item') {
      setActiveItem(itemData.item);
      setActiveType('grid');
    }
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    setActiveItem(null);
    setActiveType(null);

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

    // Case 2: Grid item dropped on another grid slot (SWAP)
    if (itemData?.type === 'grid-item' && dropData?.type === 'grid-slot') {
      const fromPosition = itemData.position;
      const toPosition = dropData.position;

      if (fromPosition === toPosition) return;

      console.log(`🔄 Swapping items: position ${fromPosition} ↔ position ${toPosition}`);

      moveGridItem(fromPosition, toPosition);
    }
  }, [assignItemToGrid, markItemAsUsed, moveGridItem]);

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
      {/* Tutorial Modal */}
      <MatchGridTutorial
        isOpen={showTutorial}
        onComplete={completeTutorial}
        onDemoDataReady={handleDemoDataReady}
      />
      <CoalescerMonitor />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="min-h-screen bg-[#050505] pb-72 relative overflow-hidden" data-testid="match-grid-container">

          {/* Animated Background */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-[#050505] to-[#050505]" />
            <div className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: 'linear-gradient(0deg, transparent 24%, #22d3ee 25%, #22d3ee 26%, transparent 27%, transparent 74%, #22d3ee 75%, #22d3ee 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #22d3ee 25%, #22d3ee 26%, transparent 27%, transparent 74%, #22d3ee 75%, #22d3ee 76%, transparent 77%, transparent)',
                backgroundSize: '60px 60px'
              }}
            />
          </div>

          {/* Header */}
          <MatchGridHeader />

          {/* Grid Area */}
          <div className="max-w-7xl mx-auto px-8 relative z-10">

            {/* View Switcher */}
            <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} />

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

            {/* Main Grid Sections */}
            <div className="space-y-12">
              {/* Positions 4-10 */}
              <GridSection
                title="Elite Tier"
                gridItems={gridItems}
                startPosition={viewMode === 'rushmore' ? 4 : 3}
                endPosition={10}
                columns={7}
                onRemove={handleRemove}
                getItemTitle={getItemTitle}
              />

              {/* Positions 11-20 */}
              {gridItems.length > 10 && (
                <GridSection
                  title="Core Roster"
                  gridItems={gridItems}
                  startPosition={10}
                  endPosition={20}
                  columns={10}
                  gap={3}
                  onRemove={handleRemove}
                  getItemTitle={getItemTitle}
                />
              )}

              {/* Remaining Positions */}
              {gridItems.length > 20 && (
                <GridSection
                  title="Reserves"
                  gridItems={gridItems}
                  startPosition={20}
                  endPosition={50}
                  columns={10}
                  gap={3}
                  onRemove={handleRemove}
                  getItemTitle={getItemTitle}
                />
              )}
            </div>
          </div>

          {/* Collection Panel - Fixed at bottom */}
          <SimpleCollectionPanel groups={backlogGroupsToCollectionGroups(groups)} />
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeItem && <DragOverlayContent activeItem={activeItem} />}
        </DragOverlay>

        {/* Cursor-following Glow Effect */}
        {activeItem && <CursorGlow glowX={glowX} glowY={glowY} />}
      </DndContext>
    </>
  );
}
