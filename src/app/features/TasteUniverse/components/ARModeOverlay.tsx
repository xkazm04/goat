"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  Move,
  RotateCw,
  Maximize2,
  X,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import type { ARState } from "../types";

interface ARModeOverlayProps {
  arState: ARState;
  onClose: () => void;
  onAnchorStar?: () => void;
  onClearAnchors?: () => void;
}

/**
 * ARModeOverlay - Instructions and controls for AR mode
 * Guides users through the AR experience
 */
export const ARModeOverlay = memo(function ARModeOverlay({
  arState,
  onClose,
  onAnchorStar,
  onClearAnchors,
}: ARModeOverlayProps) {
  if (!arState.isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 pointer-events-none"
        data-testid="ar-mode-overlay"
      >
        {/* AR Active indicator */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 backdrop-blur-xl border border-cyan-500/30">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-300 text-sm font-medium">AR Mode Active</span>
          </div>
        </motion.div>

        {/* Instructions panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-auto"
        >
          <div className="bg-black/70 backdrop-blur-xl rounded-2xl border border-white/10 p-4 w-64">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-semibold">AR Controls</span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Move className="w-4 h-4 text-white/60 mt-0.5" />
                <div>
                  <p className="text-white">Move device</p>
                  <p className="text-white/40 text-xs">
                    Navigate around your space
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <RotateCw className="w-4 h-4 text-white/60 mt-0.5" />
                <div>
                  <p className="text-white">Rotate</p>
                  <p className="text-white/40 text-xs">
                    Turn to see different constellations
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Maximize2 className="w-4 h-4 text-white/60 mt-0.5" />
                <div>
                  <p className="text-white">Pinch to zoom</p>
                  <p className="text-white/40 text-xs">
                    Get closer to stars
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ChevronDown className="w-4 h-4 text-white/60 mt-0.5" />
                <div>
                  <p className="text-white">Tap to anchor</p>
                  <p className="text-white/40 text-xs">
                    Place stars in your room
                  </p>
                </div>
              </div>
            </div>

            {/* Anchored stars count */}
            {arState.anchors.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-white/60 text-sm">
                      {arState.anchors.length} star{arState.anchors.length !== 1 ? "s" : ""} anchored
                    </span>
                  </div>
                  <button
                    onClick={onClearAnchors}
                    className="text-xs text-red-400 hover:text-red-300"
                    data-testid="ar-clear-anchors-btn"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Exit AR button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          onClick={onClose}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto
            flex items-center gap-2 px-6 py-3 rounded-full
            bg-black/60 backdrop-blur-xl border border-white/20
            text-white hover:bg-black/80 transition-colors"
          data-testid="ar-exit-btn"
        >
          <X className="w-4 h-4" />
          <span>Exit AR Mode</span>
        </motion.button>

        {/* Corner guides for AR placement */}
        <div className="absolute inset-8 pointer-events-none">
          {/* Top-left corner */}
          <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-cyan-500/30 rounded-tl-lg" />
          {/* Top-right corner */}
          <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-cyan-500/30 rounded-tr-lg" />
          {/* Bottom-left corner */}
          <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2 border-cyan-500/30 rounded-bl-lg" />
          {/* Bottom-right corner */}
          <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-cyan-500/30 rounded-br-lg" />
        </div>

        {/* Center crosshair for anchor placement */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="relative w-16 h-16">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-500/50" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-500/50" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-cyan-500/50" />
          </div>
        </div>

        {/* Tap to anchor hint */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, repeat: Infinity, repeatType: "reverse", duration: 2 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-12 pointer-events-none"
        >
          <p className="text-cyan-300/60 text-sm">Tap crosshair to anchor a star</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});
