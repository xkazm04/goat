"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  ChevronLeft,
  Users,
  Share2,
  Smartphone,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
} from "lucide-react";
import type { CameraState, Constellation, ConstellationCategory } from "../types";

interface UniverseNavigationUIProps {
  cameraState: CameraState;
  constellations: Constellation[];
  isVisiting?: boolean;
  visitingUserName?: string;
  onNavigateToOverview: () => void;
  onNavigateToConstellation: (id: string) => void;
  onZoom: (delta: number) => void;
  onShare?: () => void;
  onVisitUniverse?: () => void;
  onReturnToOwn?: () => void;
  onToggleAR?: () => void;
  isARSupported?: boolean;
  isARActive?: boolean;
}

// Category colors for quick nav
const CATEGORY_COLORS: Record<ConstellationCategory, string> = {
  Sports: "#f59e0b",
  Music: "#ef4444",
  Games: "#8b5cf6",
  Stories: "#06b6d4",
};

/**
 * UniverseNavigationUI - Navigation overlay for the Taste Universe
 */
export const UniverseNavigationUI = memo(function UniverseNavigationUI({
  cameraState,
  constellations,
  isVisiting = false,
  visitingUserName,
  onNavigateToOverview,
  onNavigateToConstellation,
  onZoom,
  onShare,
  onVisitUniverse,
  onReturnToOwn,
  onToggleAR,
  isARSupported = false,
  isARActive = false,
}: UniverseNavigationUIProps) {
  const { focusedConstellation, isTransitioning, zoom } = cameraState;

  // Find focused constellation
  const focusedConst = focusedConstellation
    ? constellations.find((c) => c.id === focusedConstellation)
    : null;

  return (
    <>
      {/* Top navigation bar */}
      <motion.div
        className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Left: Back/Home */}
        <div className="flex items-center gap-2">
          {focusedConstellation ? (
            <button
              onClick={onNavigateToOverview}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:bg-black/60 transition-colors"
              data-testid="universe-nav-back-btn"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Overview</span>
            </button>
          ) : (
            <button
              onClick={onNavigateToOverview}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:bg-black/60 transition-colors"
              data-testid="universe-nav-home-btn"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Home</span>
            </button>
          )}

          {/* Visiting indicator */}
          {isVisiting && visitingUserName && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">
                Visiting {visitingUserName}&apos;s Universe
              </span>
              <button
                onClick={onReturnToOwn}
                className="ml-2 text-xs text-white/60 hover:text-white underline"
                data-testid="universe-nav-return-btn"
              >
                Return
              </button>
            </div>
          )}
        </div>

        {/* Center: Location indicator */}
        <AnimatePresence mode="wait">
          {focusedConst && (
            <motion.div
              key={focusedConst.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: focusedConst.theme.primaryColor }}
              />
              <span className="text-white font-medium">{focusedConst.name}</span>
              <span className="text-white/50 text-sm">
                {focusedConst.stars.length} stars
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Share button */}
          {onShare && (
            <button
              onClick={onShare}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:bg-black/60 transition-colors"
              title="Share your universe"
              data-testid="universe-nav-share-btn"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {/* Visit other universes */}
          {onVisitUniverse && !isVisiting && (
            <button
              onClick={onVisitUniverse}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:bg-black/60 transition-colors"
              title="Visit other universes"
              data-testid="universe-nav-visit-btn"
            >
              <Users className="w-4 h-4" />
            </button>
          )}

          {/* AR mode toggle */}
          {isARSupported && onToggleAR && (
            <button
              onClick={onToggleAR}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md border transition-colors ${
                isARActive
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                  : "bg-black/40 border-white/10 text-white/80 hover:text-white hover:bg-black/60"
              }`}
              title={isARActive ? "Exit AR mode" : "Enter AR mode"}
              data-testid="universe-nav-ar-btn"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Left side: Zoom controls */}
      <motion.div
        className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
      >
        <button
          onClick={() => onZoom(0.1)}
          className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:bg-black/60 transition-colors"
          title="Zoom in"
          data-testid="universe-nav-zoom-in-btn"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        {/* Zoom indicator */}
        <div className="relative h-24 w-2 mx-auto bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-500 to-purple-500 rounded-full"
            style={{ height: `${zoom * 100}%` }}
            animate={{ height: `${zoom * 100}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>

        <button
          onClick={() => onZoom(-0.1)}
          className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:bg-black/60 transition-colors"
          title="Zoom out"
          data-testid="universe-nav-zoom-out-btn"
        >
          <ZoomOut className="w-5 h-5" />
        </button>

        <button
          onClick={onNavigateToOverview}
          className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:bg-black/60 transition-colors mt-2"
          title="Reset view"
          data-testid="universe-nav-reset-btn"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </motion.div>

      {/* Bottom: Constellation quick nav */}
      <motion.div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
          <Compass className="w-4 h-4 text-white/50 mr-2" />

          {constellations.map((constellation) => (
            <button
              key={constellation.id}
              onClick={() => onNavigateToConstellation(constellation.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                focusedConstellation === constellation.id
                  ? "bg-white/20"
                  : "hover:bg-white/10"
              }`}
              title={constellation.name}
              data-testid={`universe-nav-constellation-${constellation.id}`}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: constellation.theme.primaryColor }}
              />
              <span className="text-white/80 text-sm max-w-[100px] truncate">
                {constellation.name}
              </span>
              <span className="text-white/40 text-xs">
                {constellation.stars.length}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Bottom right: Controls hint */}
      <motion.div
        className="fixed bottom-4 right-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="text-white/40 text-xs space-y-1 text-right">
          <p>Scroll to zoom</p>
          <p>Drag to pan</p>
          <p>Click star to select</p>
        </div>
      </motion.div>

      {/* Transition overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center"
          >
            <div className="w-16 h-16 border-2 border-cyan-500/50 border-t-cyan-500 rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
