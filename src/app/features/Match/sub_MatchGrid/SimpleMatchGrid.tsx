"use client";

import { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from "react";
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
import { useMatchStore } from "@/stores/match-store";
import { MatchGridTutorial, useTutorialState } from "../sub_MatchCollections/MatchGridTutorial";
import { LazyShareModal } from "../components/LazyModals";
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
import { DropZoneHighlightProvider, useDropZoneHighlight } from "./components/DropZoneHighlightContext";
import { DropZoneConnectors } from "./components/DropZoneConnectors";

// Import physics components
import { PhysicsDragOverlay, PhysicsTrail, GravityWellConnector } from "./components/PhysicsDragOverlay";
import { SwapAnimation } from "./components/SwapAnimation";
import {
  triggerHaptic,
  triggerBounceSequence,
  triggerSwapSequence,
  getDropPositionPattern,
  getFlickPattern,
  isHapticSupported,
} from "./lib/hapticFeedback";

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
  const {
    setIsDragging,
    setHoveredPosition,
    updateCursorPosition,
  } = useDropZoneHighlight();
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

  // Match store for share modal
  const showResultShareModal = useMatchStore(state => state.showResultShareModal);
  const setShowResultShareModal = useMatchStore(state => state.setShowResultShareModal);

  const [activeItem, setActiveItem] = useState<CollectionItem | GridItemType | null>(null);
  const [activeType, setActiveType] = useState<'collection' | 'grid' | null>(null);

  // Track if we've already shown the share modal for this session
  const hasShownShareModal = useRef(false);

  // Inertia-driven drag state
  const [previewPosition, setPreviewPosition] = useState<number | null>(null);
  const [isSnapping, setIsSnapping] = useState(false);

  // Physics state for enhanced interactions
  const [activeGravityWell, setActiveGravityWell] = useState<number | null>(null);
  const [physicsEnabled] = useState(true);
  const [swapState, setSwapState] = useState<{
    isSwapping: boolean;
    fromPosition: number;
    toPosition: number;
    fromItem: any;
    toItem: any;
    fromCenter: { x: number; y: number };
    toCenter: { x: number; y: number };
  } | null>(null);

  // Item tenure tracking for position resistance
  const itemTenuresRef = useRef<Map<string, number>>(new Map());

  // Grid slot refs for gravity well calculations
  const gridSlotRefs = useRef<Map<number, HTMLElement>>(new Map());

  // Use the drag sync hook for event synchronization
  // Note: Velocity tracking is done inline with velocityRef for real-time performance
  // The hook provides handlers for consistent drag state cleanup
  const {
    handleDragStart: syncDragStart,
    handleDragMove: syncDragMove,
    handleDragEnd: syncDragEnd,
  } = useDragSync({
    onPositionChange: setPreviewPosition,
  });

  // Velocity tracking ref for real-time updates
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastPositionRef = useRef({ x: 0, y: 0, time: Date.now() });

  // Register grid slot for physics calculations
  const registerGridSlot = useCallback((position: number, element: HTMLElement | null) => {
    if (element) {
      gridSlotRefs.current.set(position, element);
    } else {
      gridSlotRefs.current.delete(position);
    }
  }, []);

  // Track item tenure when items are placed
  useEffect(() => {
    gridItems.forEach((item, position) => {
      if (item.matched && item.backlogItemId) {
        const key = `${position}-${item.backlogItemId}`;
        if (!itemTenuresRef.current.has(key)) {
          itemTenuresRef.current.set(key, Date.now());
        }
      }
    });
  }, [gridItems]);

  // Check gravity wells
  const checkGravityWells = useCallback((position: { x: number; y: number }): number | null => {
    // Top 5 positions have gravity wells
    const gravityWells = [
      { position: 0, radius: 200, strength: 1.0 },
      { position: 1, radius: 180, strength: 0.8 },
      { position: 2, radius: 160, strength: 0.6 },
      { position: 3, radius: 120, strength: 0.3 },
      { position: 4, radius: 100, strength: 0.2 },
    ];

    for (const well of gravityWells) {
      const element = gridSlotRefs.current.get(well.position);
      if (!element) continue;

      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = centerX - position.x;
      const dy = centerY - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < well.radius) {
        return well.position;
      }
    }
    return null;
  }, []);

  // Cursor-following glow effect with spring physics
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const glowX = useSpring(cursorX, { damping: 15, stiffness: 150, mass: 0.5 });
  const glowY = useSpring(cursorY, { damping: 15, stiffness: 150, mass: 0.5 });

  // Trail positions for visual effect
  const [dragTrail, setDragTrail] = useState<Array<{ x: number; y: number; timestamp: number }>>([]);

  // Tutorial state
  const { showTutorial, completeTutorial } = useTutorialState();

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
    setActiveGravityWell(null);

    // Sync with drag sync hook
    syncDragStart(event);

    // Extract item data for optimistic preview
    let activeItemPreviewData = null;
    if (itemData?.type === 'collection-item' && itemData.item) {
      activeItemPreviewData = {
        id: itemData.item.id,
        title: itemData.item.title || itemData.item.name,
        image_url: itemData.item.image_url,
      };
    } else if (itemData?.type === 'grid-item' && itemData.item) {
      activeItemPreviewData = {
        id: itemData.item.id,
        title: itemData.item.title || itemData.item.name,
        image_url: itemData.item.image_url,
      };
    }

    // Notify the highlight context that dragging has started (with item data for optimistic preview)
    setIsDragging(true, String(active.id), activeItemPreviewData);

    // Physics: Haptic feedback for drag start
    if (physicsEnabled && isHapticSupported()) {
      triggerHaptic('dragStart');
    }

    if (itemData?.type === 'collection-item') {
      setActiveItem(itemData.item);
      setActiveType('collection');
    } else if (itemData?.type === 'grid-item') {
      setActiveItem(itemData.item);
      setActiveType('grid');

      // Physics: Check for position resistance
      if (physicsEnabled && itemData.item?.backlogItemId) {
        const tenureKey = `${itemData.position}-${itemData.item.backlogItemId}`;
        const tenure = itemTenuresRef.current.get(tenureKey);
        if (tenure && Date.now() - tenure > 10000) {
          // Item has been in position > 10s, show resistance feedback
          if (isHapticSupported()) {
            setTimeout(() => triggerHaptic('resistanceLight'), 50);
          }
        }
      }
    }
  };

  // Handle drag move for preview position calculation
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    syncDragMove(event);

    // Calculate preview position based on drop target
    if (event.over?.data?.current?.type === 'grid-slot') {
      const position = event.over.data.current.position;
      setPreviewPosition(position);
      setHoveredPosition(position);
    } else {
      setPreviewPosition(null);
      setHoveredPosition(null);
    }

    // Update cursor position for connector lines
    if (event.active.rect.current.translated) {
      const { left, top, width, height } = event.active.rect.current.translated;
      const cursorPos = { x: left + width / 2, y: top + height / 2 };
      updateCursorPosition(cursorPos.x, cursorPos.y);

      // Physics: Check gravity wells
      if (physicsEnabled) {
        const newGravityWell = checkGravityWells(cursorPos);

        // Haptic feedback when entering gravity well
        if (newGravityWell !== null && newGravityWell !== activeGravityWell) {
          setActiveGravityWell(newGravityWell);
          if (isHapticSupported()) {
            triggerHaptic('gravityWellEnter');
          }
        } else if (newGravityWell === null && activeGravityWell !== null) {
          setActiveGravityWell(null);
        }
      }
    }
  }, [syncDragMove, setHoveredPosition, updateCursorPosition, physicsEnabled, checkGravityWells, activeGravityWell]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    const speed = Math.sqrt(velocityRef.current.x ** 2 + velocityRef.current.y ** 2);

    // Trigger snap animation
    if (over?.data?.current?.type === 'grid-slot') {
      setIsSnapping(true);
      setTimeout(() => setIsSnapping(false), 300);
    }

    setActiveItem(null);
    setActiveType(null);
    setPreviewPosition(null);
    setActiveGravityWell(null);

    // Notify the highlight context that dragging has ended
    setIsDragging(false);
    setHoveredPosition(null);

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

      // Physics: Haptic feedback based on position
      if (physicsEnabled && isHapticSupported()) {
        const dropPattern = getDropPositionPattern(position);
        triggerHaptic(dropPattern);

        // Additional flick feedback for high-velocity drops
        if (speed > 300) {
          const flickPattern = getFlickPattern(velocityRef.current);
          setTimeout(() => triggerHaptic(flickPattern), 100);
        }

        // Bounce feedback for high-speed drops
        if (speed > 200) {
          const bounceCount = Math.min(Math.ceil(speed / 500), 3);
          triggerBounceSequence(bounceCount);
        }
      }
    }

    // Case 2: Grid item dropped on another grid slot (SWAP)
    if (itemData?.type === 'grid-item' && dropData?.type === 'grid-slot') {
      const fromPosition = itemData.position;
      const toPosition = dropData.position;

      if (fromPosition === toPosition) return;

      console.log(`🔄 Swapping items: position ${fromPosition} ↔ position ${toPosition}`);

      // Physics: Get positions for swap animation
      const fromElement = gridSlotRefs.current.get(fromPosition);
      const toElement = gridSlotRefs.current.get(toPosition);

      if (physicsEnabled && fromElement && toElement && gridItems[toPosition]?.matched) {
        // Both positions have items - show swap animation
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();

        setSwapState({
          isSwapping: true,
          fromPosition,
          toPosition,
          fromItem: gridItems[fromPosition],
          toItem: gridItems[toPosition],
          fromCenter: { x: fromRect.left + fromRect.width / 2, y: fromRect.top + fromRect.height / 2 },
          toCenter: { x: toRect.left + toRect.width / 2, y: toRect.top + toRect.height / 2 },
        });

        // Haptic feedback for swap
        if (isHapticSupported()) {
          triggerSwapSequence(350);
        }

        // Clear swap state after animation
        setTimeout(() => {
          setSwapState(null);
        }, 400);
      } else if (physicsEnabled && isHapticSupported()) {
        // Simple move (not a swap)
        const dropPattern = getDropPositionPattern(toPosition);
        triggerHaptic(dropPattern);
      }

      moveGridItem(fromPosition, toPosition);
    }
  }, [assignItemToGrid, markItemAsUsed, moveGridItem, syncDragEnd, setIsDragging, setHoveredPosition, physicsEnabled, gridItems]);

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

        {/* Drag Overlay - Enhanced with physics visuals */}
        <DragOverlay modifiers={[snapCenterToCursor]}>
          {activeItem && physicsEnabled && (
            <PhysicsDragOverlay
              activeItem={activeItem}
              velocity={velocityRef.current}
              isSnapping={isSnapping}
              previewPosition={previewPosition}
              gravityWellActive={activeGravityWell !== null}
              gravityWellPosition={activeGravityWell}
            />
          )}
          {activeItem && !physicsEnabled && (
            <DragOverlayContent
              activeItem={activeItem}
              velocity={velocityRef.current}
              isSnapping={isSnapping}
              previewPosition={previewPosition}
            />
          )}
        </DragOverlay>

        {/* Physics-enhanced Drag Trail Effect */}
        <AnimatePresence>
          {activeItem && dragTrail.length > 1 && physicsEnabled && (
            <PhysicsTrail
              positions={dragTrail}
              velocity={velocityRef.current}
              gravityWellActive={activeGravityWell !== null}
            />
          )}
          {activeItem && dragTrail.length > 1 && !physicsEnabled && (
            <DragTrail positions={dragTrail} />
          )}
        </AnimatePresence>

        {/* Gravity Well Connector - Shows pull toward top positions */}
        {activeItem && activeGravityWell !== null && physicsEnabled && (() => {
          const wellElement = gridSlotRefs.current.get(activeGravityWell);
          if (!wellElement) return null;
          const wellRect = wellElement.getBoundingClientRect();
          const gravityStrength = activeGravityWell < 3 ? 0.8 : activeGravityWell < 5 ? 0.5 : 0.3;

          return (
            <GravityWellConnector
              fromPosition={{ x: cursorX.get(), y: cursorY.get() }}
              toPosition={{
                x: wellRect.left + wellRect.width / 2,
                y: wellRect.top + wellRect.height / 2,
              }}
              strength={gravityStrength}
            />
          );
        })()}

        {/* Cursor-following Glow Effect - dot at cursor, glow trails behind */}
        {activeItem && <CursorGlow glowX={glowX} glowY={glowY} cursorX={cursorX} cursorY={cursorY} />}

        {/* Visual connector lines to valid drop zones during drag */}
        <DropZoneConnectors />
      </DndContext>

      {/* Swap Animation Overlay */}
      {swapState && physicsEnabled && (
        <SwapAnimation
          itemA={{
            id: swapState.fromItem.id,
            title: swapState.fromItem.title || swapState.fromItem.name || '',
            image_url: swapState.fromItem.image_url,
            position: swapState.fromPosition,
          }}
          itemB={{
            id: swapState.toItem.id,
            title: swapState.toItem.title || swapState.toItem.name || '',
            image_url: swapState.toItem.image_url,
            position: swapState.toPosition,
          }}
          positionA={swapState.fromCenter}
          positionB={swapState.toCenter}
          isActive={swapState.isSwapping}
          onComplete={() => setSwapState(null)}
        />
      )}

      {/* Share Modal - shown when ranking is complete (lazy loaded) */}
      <LazyShareModal />
    </>
  );
}
