"use client";

import { memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Home, Compass, MousePointer2, Move, ZoomIn } from "lucide-react";
import type { GalaxyCategory, Card3D } from "../types";
import { GALAXY_THEMES } from "../types";

interface NavigationUIProps {
  focusedGalaxy: GalaxyCategory | null;
  selectedCard: Card3D | null;
  zoomLevel: number;
  isTransitioning: boolean;
  onNavigateToOverview: () => void;
  onNavigateToGalaxy: (category: GalaxyCategory) => void;
  onClearSelection: () => void;
}

const galaxyCategories: GalaxyCategory[] = ["Sports", "Music", "Games", "Stories"];

/**
 * NavigationUI - Overlay controls for navigating the 3D universe
 */
export const NavigationUI = memo(function NavigationUI({
  focusedGalaxy,
  selectedCard,
  zoomLevel,
  isTransitioning,
  onNavigateToOverview,
  onNavigateToGalaxy,
  onClearSelection,
}: NavigationUIProps) {
  const handleGalaxySelect = useCallback(
    (category: GalaxyCategory) => {
      if (!isTransitioning) {
        onNavigateToGalaxy(category);
      }
    },
    [isTransitioning, onNavigateToGalaxy]
  );

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20"
      data-testid="universe-navigation-ui"
    >
      {/* Top navigation bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        {/* Back/Home button */}
        <AnimatePresence mode="wait">
          {(focusedGalaxy || selectedCard) && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl
                bg-black/40 backdrop-blur-md border border-white/10
                text-white/80 hover:text-white hover:bg-black/60
                transition-colors duration-200"
              onClick={selectedCard ? onClearSelection : onNavigateToOverview}
              disabled={isTransitioning}
              data-testid="universe-nav-back-btn"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-medium">
                {selectedCard ? "Back to Galaxy" : "Overview"}
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Current location indicator */}
        <motion.div
          className="flex items-center gap-2 px-4 py-2 rounded-xl
            bg-black/40 backdrop-blur-md border border-white/10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="text-sm text-white/80">
            {selectedCard
              ? selectedCard.title
              : focusedGalaxy
              ? `${focusedGalaxy} Galaxy`
              : "Universe Overview"}
          </span>
        </motion.div>

        {/* Home button (always visible) */}
        <motion.button
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl
            bg-black/40 backdrop-blur-md border border-white/10
            text-white/80 hover:text-white hover:bg-black/60
            transition-colors duration-200"
          onClick={onNavigateToOverview}
          disabled={isTransitioning}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          data-testid="universe-nav-home-btn"
        >
          <Home className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Galaxy quick navigation (bottom) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <motion.div
          className="pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-2xl
            bg-black/40 backdrop-blur-md border border-white/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {galaxyCategories.map((category) => {
            const theme = GALAXY_THEMES[category];
            const isActive = focusedGalaxy === category;

            return (
              <button
                key={category}
                onClick={() => handleGalaxySelect(category)}
                disabled={isTransitioning}
                className={`
                  relative px-4 py-2 rounded-xl text-sm font-medium
                  transition-all duration-300
                  ${isActive
                    ? "text-white scale-105"
                    : "text-white/60 hover:text-white/90"
                  }
                `}
                style={{
                  backgroundColor: isActive ? `${theme.primary}30` : "transparent",
                  borderColor: isActive ? theme.primary : "transparent",
                  borderWidth: 1,
                }}
                data-testid={`universe-nav-galaxy-${category.toLowerCase()}`}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <motion.div
                    layoutId="activeGalaxyIndicator"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                    style={{ backgroundColor: theme.glow }}
                  />
                )}
                {category}
              </button>
            );
          })}
        </motion.div>
      </div>

      {/* Controls hint (bottom right) */}
      <motion.div
        className="absolute bottom-4 right-4 flex flex-col gap-2 text-xs text-white/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-2">
          <Move className="w-3 h-3" />
          <span>Drag to pan</span>
        </div>
        <div className="flex items-center gap-2">
          <ZoomIn className="w-3 h-3" />
          <span>Scroll to zoom</span>
        </div>
        <div className="flex items-center gap-2">
          <MousePointer2 className="w-3 h-3" />
          <span>Click cards to select</span>
        </div>
      </motion.div>

      {/* Zoom indicator */}
      <div className="absolute left-4 bottom-1/2 translate-y-1/2">
        <motion.div
          className="w-1 h-24 rounded-full bg-white/10 overflow-hidden"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.div
            className="w-full bg-cyan-400/60 rounded-full"
            style={{
              height: `${zoomLevel * 100}%`,
              marginTop: `${(1 - zoomLevel) * 100}%`,
            }}
          />
        </motion.div>
      </div>

      {/* Transition overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 pointer-events-auto"
          />
        )}
      </AnimatePresence>
    </div>
  );
});
