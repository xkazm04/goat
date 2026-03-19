"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, animate, PanInfo } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import { GripHorizontal, ChevronUp, LayoutGrid, List } from "lucide-react";
import { CollectionItem } from "@/app/features/Collection/types";
import { useGridStore, type MobileSelectedItem } from "@/stores/grid-store";
import { useBacklogStore } from "@/stores/backlog-store";
import { createCollectionDragData } from "@/lib/dnd";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { SwipeableBacklogItem } from "./SwipeableBacklogItem";
import { triggerHaptic } from "@/app/features/Match/sub_MatchGrid/lib/hapticFeedback";

/** Panel snap states */
type PanelState = "collapsed" | "half" | "full";

/** Heights for each panel state */
const COLLAPSED_HEIGHT = 80;
const HALF_HEIGHT_RATIO = 0.5; // 50vh
const FULL_HEIGHT_RATIO = 0.85; // 85vh

interface MobileBacklogPanelProps {
  items: CollectionItem[];
  totalCount: number;
}

/**
 * Draggable mobile backlog item.
 * Supports both drag-and-drop and tap-to-place workflows.
 */
function DraggableMobileItem({
  item,
  isSelected,
  onTap,
}: {
  item: CollectionItem;
  isSelected: boolean;
  onTap: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `mobile-backlog-${item.id}`,
    data: createCollectionDragData(item, 'mobile-backlog'),
  });

  return (
    <button
      ref={setNodeRef}
      onClick={onTap}
      {...attributes}
      {...listeners}
      className={cn(
        "flex flex-col items-center gap-1 p-2 rounded-card transition-all touch-manipulation",
        "bg-white/5 hover:bg-white/10 active:scale-95",
        isSelected && "ring-2 ring-brand-primary scale-105 bg-brand-primary/10",
        isDragging && "opacity-50 scale-95"
      )}
    >
      <div className="w-12 h-12 rounded-control overflow-hidden bg-white/10 shrink-0">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.title}
            width={48}
            height={48}
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
            ?
          </div>
        )}
      </div>
      <span className="text-xs text-white/70 truncate w-full text-center leading-tight">
        {item.title}
      </span>
    </button>
  );
}

/**
 * MobileBacklogPanel
 * A bottom sheet for browsing and selecting backlog items on mobile devices.
 * Three states: collapsed (peek bar), half-expanded, full-expanded.
 * Supports both drag-and-drop and tap-to-place workflows.
 */
/** View mode for the panel: grid (default drag-drop) or swipe (Tinder-style) */
type BacklogViewMode = "grid" | "swipe";

export function MobileBacklogPanel({ items, totalCount }: MobileBacklogPanelProps) {
  const [panelState, setPanelState] = useState<PanelState>("collapsed");
  const [viewMode, setViewMode] = useState<BacklogViewMode>("swipe");
  const mobileSelectedItem = useGridStore((s) => s.mobileSelectedItem);
  const setMobileSelectedItem = useGridStore((s) => s.setMobileSelectedItem);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Calculate heights based on viewport
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 800
  );

  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const halfHeight = Math.round(viewportHeight * HALF_HEIGHT_RATIO);
  const fullHeight = Math.round(viewportHeight * FULL_HEIGHT_RATIO);

  // Motion value for the panel y offset (0 = current snap position)
  const y = useRef(0);

  // Get current height based on panel state
  const getHeight = useCallback(
    (state: PanelState) => {
      switch (state) {
        case "collapsed":
          return COLLAPSED_HEIGHT;
        case "half":
          return halfHeight;
        case "full":
          return fullHeight;
      }
    },
    [halfHeight, fullHeight]
  );

  const currentHeight = getHeight(panelState);

  // Lock body scroll when panel is expanded past half
  useEffect(() => {
    if (panelState === "full") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [panelState]);

  // Handle drag end with snap logic
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const velocity = info.velocity.y;
      const offset = info.offset.y;

      // Velocity-based snapping
      if (velocity > 500) {
        // Fast downward swipe: collapse
        setPanelState("collapsed");
      } else if (velocity < -500) {
        // Fast upward swipe: expand to half (or full if already half)
        setPanelState(panelState === "half" ? "full" : "half");
      } else {
        // Position-based snapping: snap to nearest state
        const currentH = getHeight(panelState);
        const newH = currentH - offset;

        const distances = {
          collapsed: Math.abs(newH - COLLAPSED_HEIGHT),
          half: Math.abs(newH - halfHeight),
          full: Math.abs(newH - fullHeight),
        };

        const nearest = Object.entries(distances).reduce((a, b) =>
          a[1] < b[1] ? a : b
        )[0] as PanelState;

        setPanelState(nearest);
      }
    },
    [panelState, getHeight, halfHeight, fullHeight]
  );

  // Handle item tap for selection
  const handleItemTap = useCallback(
    (item: CollectionItem) => {
      if (mobileSelectedItem?.id === item.id) {
        // Deselect if tapping same item
        setMobileSelectedItem(null);
      } else {
        // Select item and auto-collapse panel
        const selected: MobileSelectedItem = {
          id: item.id,
          title: item.title,
          image_url: item.image_url ?? undefined,
        };
        setMobileSelectedItem(selected);
        setPanelState("collapsed");
      }
    },
    [mobileSelectedItem, setMobileSelectedItem]
  );

  // Swipe-to-rank: assign item to next open slot
  const handleSwipeAssign = useCallback((item: CollectionItem): boolean => {
    const { gridItems, maxGridSize, assignItemToGrid } = useGridStore.getState();
    const backlogState = useBacklogStore.getState();

    // Resolve to BacklogItem (required by assignItemToGrid)
    const backlogItem = backlogState.getItemById(item.id);
    if (!backlogItem) return false;

    // Find next empty slot
    let position: number | null = null;
    for (let i = 0; i < maxGridSize; i++) {
      if (!gridItems[i]?.matched) {
        position = i;
        break;
      }
    }
    if (position === null) return false;

    assignItemToGrid(backlogItem, position);
    backlogState.markItemAsUsed(item.id, true);
    triggerHaptic(position < 3 ? "dropPosition3" : "dropPositionRegular");
    return true;
  }, []);

  // Swipe-to-dismiss: just skip (no permanent action)
  const handleSwipeDismiss = useCallback((_item: CollectionItem) => {
    triggerHaptic("buttonPress");
  }, []);

  // Toggle panel state on handle tap
  const handleToggle = useCallback(() => {
    setPanelState((prev) => {
      if (prev === "collapsed") return "half";
      if (prev === "half") return "full";
      return "collapsed";
    });
  }, []);

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-sticky bg-gray-900 rounded-t-container shadow-[0_-4px_20px_rgba(0,0,0,0.5)]"
      style={{ height: currentHeight }}
      animate={{ height: currentHeight }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Drag handle */}
      <motion.div
        className="flex flex-col items-center justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
        drag="y"
        dragConstraints={{ top: -(fullHeight - COLLAPSED_HEIGHT), bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        onClick={handleToggle}
      >
        <div className="w-12 h-1 rounded-full bg-white/30 mb-1" />
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <GripHorizontal className="w-4 h-4" />
          <span>Backlog ({totalCount} items)</span>
          <ChevronUp
            className={cn(
              "w-4 h-4 transition-transform",
              panelState !== "collapsed" && "rotate-180"
            )}
          />
          {/* View mode toggle */}
          {panelState !== "collapsed" && (
            <div className="flex ml-auto gap-0.5 bg-white/5 rounded-control p-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); setViewMode("swipe"); }}
                className={cn(
                  "p-1 rounded transition-colors",
                  viewMode === "swipe" ? "bg-white/15 text-white" : "text-white/40"
                )}
                aria-label="Swipe view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setViewMode("grid"); }}
                className={cn(
                  "p-1 rounded transition-colors",
                  viewMode === "grid" ? "bg-white/15 text-white" : "text-white/40"
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Selected item indicator */}
      {mobileSelectedItem && (
        <div className="mx-3 mb-2 px-3 py-1.5 bg-brand-primary/20 border border-brand-primary/40 rounded-card flex items-center gap-2 text-sm text-brand-primary">
          <span className="truncate">Tap a grid slot to place: <strong>{mobileSelectedItem.title}</strong></span>
          <button
            onClick={() => setMobileSelectedItem(null)}
            className="shrink-0 text-xs underline opacity-70 hover:opacity-100"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Swipe hint banner (shown once in swipe mode) */}
      {panelState !== "collapsed" && viewMode === "swipe" && (
        <div className="mx-3 mb-1 px-3 py-1 bg-white/5 rounded-control text-xs text-white/40 text-center">
          ← Swipe left to rank · Swipe right to skip →
        </div>
      )}

      {/* Scrollable content area */}
      {panelState !== "collapsed" && (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4"
          style={{ maxHeight: currentHeight - 70 }}
        >
          {viewMode === "swipe" ? (
            /* Swipe list view — vertical list with swipe gestures */
            <div className="flex flex-col gap-1.5">
              {items.map((item) => (
                <SwipeableBacklogItem
                  key={item.id}
                  item={item}
                  isSelected={mobileSelectedItem?.id === item.id}
                  isUsed={false}
                  onTap={() => handleItemTap(item)}
                  onSwipeLeft={handleSwipeAssign}
                  onSwipeRight={handleSwipeDismiss}
                />
              ))}
            </div>
          ) : (
            /* Grid view — original drag-and-drop grid */
            <div className="grid grid-cols-3 gap-2">
              {items.map((item) => (
                <DraggableMobileItem
                  key={item.id}
                  item={item}
                  isSelected={mobileSelectedItem?.id === item.id}
                  onTap={() => handleItemTap(item)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
