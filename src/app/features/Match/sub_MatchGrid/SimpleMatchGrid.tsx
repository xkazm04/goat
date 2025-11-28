"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { DndContext, DragOverlay, DragEndEvent, DragMoveEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { backlogGroupsToCollectionGroups } from "../../Collection";
import { SimpleCollectionPanel } from "../sub_MatchCollections/SimpleCollectionPanel";
import { CollectionItem } from "../../Collection/types";
import { BacklogItem } from "@/types/backlog-groups";
import { GridItemType } from "@/types/match";
import { useGridStore } from "@/stores/grid-store";
import { useBacklogStore } from "@/stores/backlog-store";
import { useCurrentList } from "@/stores/use-list-store";
import { MatchGridTutorial, useTutorialState } from "../sub_MatchCollections/MatchGridTutorial";
import { useMotionValue, useSpring, AnimatePresence } from "framer-motion";

// Import modular components
import { ViewSwitcher, ViewMode } from "./components/ViewSwitcher";
import { PodiumView } from "./components/PodiumView";
import { GoatView } from "./components/GoatView";
import { MountRushmoreView } from "./components/MountRushmoreView";
import { GridSection } from "./components/GridSection";
import { MatchGridHeader } from "./components/MatchGridHeader";
import { DragOverlayContent, CursorGlow, DragTrail } from "./components/DragComponents";
import { getItemTitle } from "./lib/helpers";
import { useDragSync } from "@/hooks/use-drag-sync";

/**
 * "Neon Arena" Match Grid
 * The main stage for the matching experience.
 */
export function SimpleMatchGrid() {
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
  const loadTutorialData = useGridStore(state => state.loadTutorialData);

  const groups = useBacklogStore(state => state.groups);
  const markItemAsUsed = useBacklogStore(state => state.markItemAsUsed);

  const [activeItem, setActiveItem] = useState<CollectionItem | GridItemType | null>(null);
  const [activeType, setActiveType] = useState<'collection' | 'grid' | null>(null);

  // Inertia-driven drag state
  const [previewPosition, setPreviewPosition] = useState<number | null>(null);
  const [isSnapping, setIsSnapping] = useState(false);

  // Use the drag sync hook for velocity tracking and trail
  const {
    velocity,
    trailPositions,
    handleDragStart: syncDragStart,
    handleDragMove: syncDragMove,
    handleDragEnd: syncDragEnd,
  } = useDragSync({
    onPositionChange: setPreviewPosition,
  });

  // Velocity tracking ref for real-time updates
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastPositionRef = useRef({ x: 0, y: 0, time: Date.now() });

  // Cursor-following glow effect with spring physics
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const glowX = useSpring(cursorX, { damping: 15, stiffness: 150, mass: 0.5 });
  const glowY = useSpring(cursorY, { damping: 15, stiffness: 150, mass: 0.5 });

  // Trail positions for visual effect
  const [dragTrail, setDragTrail] = useState<Array<{ x: number; y: number; timestamp: number }>>([]);

  // Tutorial state
  const { showTutorial, completeTutorial } = useTutorialState();

  // Track mouse position during drag with velocity calculation
  useEffect(() => {
    if (!activeItem) {
      setDragTrail([]);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      const deltaTime = (now - lastPositionRef.current.time) / 1000;

      // Calculate velocity
      if (deltaTime > 0) {
        velocityRef.current = {
          x: (e.clientX - lastPositionRef.current.x) / deltaTime,
          y: (e.clientY - lastPositionRef.current.y) / deltaTime,
        };
      }

      lastPositionRef.current = { x: e.clientX, y: e.clientY, time: now };

      cursorX.set(e.clientX);
      cursorY.set(e.clientY);

      // Update trail
      setDragTrail(prev => {
        const newTrail = [...prev, { x: e.clientX, y: e.clientY, timestamp: now }];
        // Keep only last 20 positions
        return newTrail.slice(-20);
      });
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

    // Reset velocity on drag start
    velocityRef.current = { x: 0, y: 0 };
    lastPositionRef.current = { x: 0, y: 0, time: Date.now() };
    setPreviewPosition(null);
    setIsSnapping(false);

    // Sync with drag sync hook
    syncDragStart(event);

    if (itemData?.type === 'collection-item') {
      setActiveItem(itemData.item);
      setActiveType('collection');
    } else if (itemData?.type === 'grid-item') {
      setActiveItem(itemData.item);
      setActiveType('grid');
    }
  };

  // Handle drag move for preview position calculation
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    syncDragMove(event);

    // Calculate preview position based on drop target
    if (event.over?.data?.current?.type === 'grid-slot') {
      setPreviewPosition(event.over.data.current.position);
    } else {
      setPreviewPosition(null);
    }
  }, [syncDragMove]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    // Trigger snap animation
    if (over?.data?.current?.type === 'grid-slot') {
      setIsSnapping(true);
      setTimeout(() => setIsSnapping(false), 300);
    }

    setActiveItem(null);
    setActiveType(null);
    setPreviewPosition(null);

    // Sync with drag sync hook
    syncDragEnd(event);

    if (!over) return;

    const itemData = active.data.current;
    const dropData = over.data.current;

    // Case 1: Collection item dropped on grid slot
    if (itemData?.type === 'collection-item' && dropData?.type === 'grid-slot') {
      const position = dropData.position;
      const item: BacklogItem = itemData.item;

      console.log(`🎯 Dropping collection item ${item.id} at position ${position} (velocity: ${velocityRef.current.x.toFixed(0)}, ${velocityRef.current.y.toFixed(0)})`);

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
  }, [assignItemToGrid, markItemAsUsed, moveGridItem, syncDragEnd]);

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

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <div className="min-h-screen bg-[#050505] pb-[420px] relative overflow-hidden" data-testid="match-grid-container">

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

          {/* Header with ViewSwitcher */}
          <div className="relative z-10">
            <div className="max-w-7xl mx-auto px-8">
              <div className="flex items-start justify-between pt-8">
                {/* Header content */}
                <MatchGridHeader 
                  title={currentList?.title || "Neon Arena"}
                  subtitle={currentList?.description || "Assemble Your Dream Team"}
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

            {/* Main Grid Sections */}
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
          </div>

          {/* Collection Panel - Fixed at bottom */}
          <SimpleCollectionPanel groups={backlogGroupsToCollectionGroups(groups)} />
        </div>

        {/* Drag Overlay - snaps center to cursor position with inertia */}
        <DragOverlay modifiers={[snapCenterToCursor]}>
          {activeItem && (
            <DragOverlayContent
              activeItem={activeItem}
              velocity={velocityRef.current}
              isSnapping={isSnapping}
              previewPosition={previewPosition}
            />
          )}
        </DragOverlay>

        {/* Drag Trail Effect */}
        <AnimatePresence>
          {activeItem && dragTrail.length > 1 && (
            <DragTrail positions={dragTrail} />
          )}
        </AnimatePresence>

        {/* Cursor-following Glow Effect - dot at cursor, glow trails behind */}
        {activeItem && <CursorGlow glowX={glowX} glowY={glowY} cursorX={cursorX} cursorY={cursorY} />}
      </DndContext>
    </>
  );
}
