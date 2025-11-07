"use client";

import { motion, AnimatePresence } from "framer-motion";

interface StickyContextProps {
  isVisible: boolean;
  categoryName: string;
  itemCount: number;
  isDragging?: boolean;
  selectedGroupName?: string;
}

/**
 * Sticky context indicator that shows current category info
 * Appears when scrolling past category bar
 */
export function StickyContext({
  isVisible,
  categoryName,
  itemCount,
  isDragging = false,
  selectedGroupName
}: StickyContextProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-[620px] left-4 z-50 pointer-events-none"
        >
          <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-lg px-4 py-2 shadow-2xl">
            <div className="flex items-center gap-3">
              {/* Category icon */}
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-cyan-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>

              {/* Category info */}
              <div>
                <div className="text-xs text-gray-400">
                  {isDragging ? "Dragging from:" : "Viewing:"}
                </div>
                <div className="text-sm font-semibold text-white">
                  {selectedGroupName || categoryName}
                </div>
                <div className="text-xs text-gray-500">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                  {isDragging && " remaining"}
                </div>
              </div>

              {/* Dragging indicator */}
              {isDragging && (
                <div className="ml-2">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-2 h-2 bg-cyan-400 rounded-full"
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
