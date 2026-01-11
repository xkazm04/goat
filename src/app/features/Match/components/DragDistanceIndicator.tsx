"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { FeedbackParticles, FeedbackProgress } from "@/lib/feedback-pipeline";
import type { ParticleConfig } from "@/lib/feedback-pipeline";

interface DragDistanceIndicatorProps {
  distance: number;
  isActive: boolean;
  targetPosition?: number | null;
  cursorPosition?: { x: number; y: number };
}

/**
 * Visual indicator showing drag distance and target position
 * Shows warning when drag exceeds 500px
 * Uses the unified FeedbackPipeline for consistent visual feedback
 */
export function DragDistanceIndicator({
  distance,
  isActive,
  targetPosition,
  cursorPosition
}: DragDistanceIndicatorProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [sparkles, setSparkles] = useState<ParticleConfig[]>([]);
  const sparkleIdRef = useRef(0);
  const lastSparkleTimeRef = useRef(0);

  useEffect(() => {
    setShowWarning(distance > 500);
  }, [distance]);

  // Generate sparkles at 60fps (every ~16ms) when dragging
  useEffect(() => {
    if (!isActive || !cursorPosition) {
      setSparkles([]);
      return;
    }

    const sparkleInterval = 1000 / 60; // 60fps
    const now = Date.now();

    // Only create sparkle if enough time has passed
    if (now - lastSparkleTimeRef.current >= sparkleInterval) {
      const newSparkle: ParticleConfig = {
        id: sparkleIdRef.current++,
        x: cursorPosition.x,
        y: cursorPosition.y,
        timestamp: now,
        size: 12,
        duration: 0.3
      };

      setSparkles(prev => [...prev, newSparkle]);
      lastSparkleTimeRef.current = now;
    }

    // Clean up old sparkles (older than 300ms)
    const cleanupTimer = setInterval(() => {
      const currentTime = Date.now();
      setSparkles(prev =>
        prev.filter(sparkle => sparkle.timestamp && currentTime - sparkle.timestamp < 300)
      );
    }, 50);

    return () => clearInterval(cleanupTimer);
  }, [isActive, cursorPosition]);

  if (!isActive) return null;

  const warningThreshold = 500;
  const percentage = Math.min((distance / warningThreshold) * 100, 100);

  return (
    <>
      {/* Sparkle Trail - using unified FeedbackParticles */}
      <FeedbackParticles particles={sparkles} variant="sparkle" />

      {/* Distance Indicator */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
            data-testid="drag-distance-indicator"
          >
          <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-lg px-4 py-3 shadow-2xl">
            <div className="flex items-center gap-3">
              {/* Distance meter - using unified FeedbackProgress */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Drag distance:</span>
                  <span className="text-sm font-semibold text-white">
                    {Math.round(distance)}px
                  </span>
                </div>

                {/* Progress bar using FeedbackProgress */}
                <div className="w-32">
                  <FeedbackProgress
                    progress={{ value: percentage }}
                    size="sm"
                    variant={showWarning ? 'warning' : 'cyan'}
                  />
                </div>
              </div>

              {/* Target position indicator */}
              {targetPosition !== null && targetPosition !== undefined && (
                <>
                  <div className="w-px h-8 bg-gray-700" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Target:</span>
                    <span className="text-sm font-bold text-cyan-400">
                      #{targetPosition + 1}
                    </span>
                  </div>
                </>
              )}

              {/* Warning icon */}
              {showWarning && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, -10, 10, -10, 0] }}
                  transition={{
                    scale: { duration: 0.2 },
                    rotate: { duration: 0.5, repeat: Infinity, repeatDelay: 2 }
                  }}
                  className="flex items-center gap-1 text-orange-400"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span className="text-xs font-medium">Long drag</span>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
