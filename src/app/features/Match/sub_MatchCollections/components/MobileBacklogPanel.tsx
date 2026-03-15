"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import { GripHorizontal, ChevronUp } from "lucide-react";
import { CollectionItem } from "@/app/features/Collection/types";
import { useGridStore, type MobileSelectedItem } from "@/stores/grid-store";
import { cn } from "@/lib/utils";
import Image from "next/image";

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
 * MobileBacklogPanel
 * A bottom sheet for browsing and selecting backlog items on mobile devices.
 * Three states: collapsed (peek bar), half-expanded, full-expanded.
 * Tapping an item selects it for tap-to-place, then auto-collapses the panel.
 */
export function MobileBacklogPanel({ items, totalCount }: MobileBacklogPanelProps) {
  const [panelState, setPanelState] = useState<PanelState>("collapsed");
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
  const y = useMotionValue(0);

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

      // Reset y motion value
      animate(y, 0, { type: "spring", stiffness: 300, damping: 30 });
    },
    [panelState, getHeight, halfHeight, fullHeight, y]
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
      className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.5)]"
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
        style={{ y }}
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
        </div>
      </motion.div>

      {/* Selected item indicator */}
      {mobileSelectedItem && (
        <div className="mx-3 mb-2 px-3 py-1.5 bg-brand-primary/20 border border-brand-primary/40 rounded-lg flex items-center gap-2 text-sm text-brand-primary">
          <span className="truncate">Tap a grid slot to place: <strong>{mobileSelectedItem.title}</strong></span>
          <button
            onClick={() => setMobileSelectedItem(null)}
            className="shrink-0 text-xs underline opacity-70 hover:opacity-100"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Scrollable content area */}
      {panelState !== "collapsed" && (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4"
          style={{ maxHeight: currentHeight - 70 }}
        >
          <div className="grid grid-cols-3 gap-2">
            {items.map((item) => {
              const isSelected = mobileSelectedItem?.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemTap(item)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                    "bg-white/5 hover:bg-white/10 active:scale-95",
                    isSelected && "ring-2 ring-brand-primary scale-105 bg-brand-primary/10"
                  )}
                >
                  <div className="w-12 h-12 rounded-md overflow-hidden bg-white/10 shrink-0">
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
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
