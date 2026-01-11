"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, ArrowUp, ArrowDown, Check, X } from "lucide-react";
import type { Star, SpatialRankingState } from "../types";

interface SpatialRankingOverlayProps {
  spatialRanking: SpatialRankingState;
  onConfirmRank: (newRank: number) => void;
  onCancel: () => void;
}

/**
 * SpatialRankingOverlay - UI overlay for spatial ranking mode
 * Shows when user is dragging a star to a new rank position
 */
export const SpatialRankingOverlay = memo(function SpatialRankingOverlay({
  spatialRanking,
  onConfirmRank,
  onCancel,
}: SpatialRankingOverlayProps) {
  const { isActive, selectedStar, draggedStar, targetRank } = spatialRanking;

  if (!isActive && !selectedStar) return null;

  return (
    <AnimatePresence>
      {/* Selection info panel */}
      {selectedStar && !draggedStar && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
          data-testid="spatial-ranking-selection-panel"
        >
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 p-4 min-w-[280px]">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedStar.color }}
              />
              <span className="text-white font-semibold truncate max-w-[200px]">
                {selectedStar.name}
              </span>
              <span className="text-white/50 text-sm">#{selectedStar.rank}</span>
            </div>

            <p className="text-white/60 text-sm mb-4">
              Drag to a new position to change ranking
            </p>

            <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
              <GripVertical className="w-4 h-4" />
              <span>Hold and drag in 3D space</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Dragging indicator */}
      {draggedStar && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
          data-testid="spatial-ranking-drag-indicator"
        >
          <div className="bg-black/90 backdrop-blur-xl rounded-2xl border-2 p-6"
            style={{ borderColor: draggedStar.color }}
          >
            <div className="flex flex-col items-center gap-2">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <ArrowUp className="w-6 h-6" style={{ color: draggedStar.color }} />
              </motion.div>

              <span className="text-white font-bold text-lg">
                {draggedStar.name}
              </span>

              <div className="flex items-center gap-2">
                <span className="text-white/50">From #{draggedStar.rank}</span>
                {targetRank !== null && targetRank !== draggedStar.rank && (
                  <>
                    <span className="text-white/30">→</span>
                    <span style={{ color: draggedStar.color }}>
                      #{targetRank}
                    </span>
                  </>
                )}
              </div>

              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0.5 }}
              >
                <ArrowDown className="w-6 h-6" style={{ color: draggedStar.color }} />
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Confirm/Cancel buttons (when drag ends with new rank) */}
      {targetRank !== null && !draggedStar && selectedStar && targetRank !== selectedStar.rank && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
          data-testid="spatial-ranking-confirm-panel"
        >
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
            <div className="text-center mb-4">
              <p className="text-white font-semibold mb-1">
                Move &quot;{selectedStar.name}&quot;
              </p>
              <p className="text-white/60 text-sm">
                From #{selectedStar.rank} to #{targetRank}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onCancel}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
                data-testid="spatial-ranking-cancel-btn"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={() => onConfirmRank(targetRank)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium transition-colors"
                style={{ backgroundColor: selectedStar.color }}
                data-testid="spatial-ranking-confirm-btn"
              >
                <Check className="w-4 h-4" />
                Confirm
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Instructions hint */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          data-testid="spatial-ranking-instructions"
        >
          <div className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 backdrop-blur-xl rounded-full px-6 py-2 border border-white/10">
            <p className="text-white/80 text-sm">
              <span className="text-cyan-400">Pull toward center</span> for #1 position
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
