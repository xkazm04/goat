"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { QuickAssignModalProps, FilledPositionInfo } from "@/types/modal-props";
import { isQuickAssignModalOpen } from "@/types/modal-props";
import { getPositionBadgeStyles } from "./PositionBadge";

// Re-export FilledPositionInfo for external use
export type { FilledPositionInfo };

/**
 * Quick Assign Modal for positions 11-50
 * Allows fast keyboard-based assignment to any position
 *
 * Uses discriminated union props: when isOpen=true, onAssign and maxPosition are required
 */
export function QuickAssignModal(props: QuickAssignModalProps) {
  const { isOpen, onClose } = props;

  // Use type guard to safely access required props when modal is open
  const isOpenState = isQuickAssignModalOpen(props);
  const onAssign = isOpenState ? props.onAssign : () => {};
  const maxPosition = isOpenState ? props.maxPosition : 0;
  const currentFilledPositions = props.currentFilledPositions ?? new Set<number>();
  const filledPositionDetails = props.filledPositionDetails ?? new Map<number, FilledPositionInfo>();
  const [inputValue, setInputValue] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);

  // Track recently assigned positions (last 3) and newly filled positions for animations
  const [recentlyAssigned, setRecentlyAssigned] = useState<number[]>([]);
  const [newlyFilledPosition, setNewlyFilledPosition] = useState<number | null>(null);
  const prevFilledPositionsRef = useRef<Set<number>>(new Set());

  // Refs to hold latest values to avoid stale closures in keyboard handler
  const selectedPositionRef = useRef<number | null>(null);
  const inputValueRef = useRef("");
  const isAssigningRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    selectedPositionRef.current = selectedPosition;
  }, [selectedPosition]);

  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  useEffect(() => {
    if (isOpen) {
      setInputValue("");
      setSelectedPosition(null);
      inputValueRef.current = "";
      selectedPositionRef.current = null;
      isAssigningRef.current = false;
      // Initialize previous filled positions when modal opens
      prevFilledPositionsRef.current = new Set(currentFilledPositions);
    }
  }, [isOpen, currentFilledPositions]);

  // Detect newly filled positions and trigger pulse animation
  useEffect(() => {
    if (!isOpen) return;

    const prevFilled = prevFilledPositionsRef.current;
    const newPositions: number[] = [];

    currentFilledPositions.forEach((pos) => {
      if (!prevFilled.has(pos)) {
        newPositions.push(pos);
      }
    });

    if (newPositions.length > 0) {
      // Trigger pulse animation for newly filled positions
      const newPos = newPositions[0]; // Use the first newly filled position
      setNewlyFilledPosition(newPos);

      // Add to recently assigned (keep last 3)
      setRecentlyAssigned((prev) => {
        const updated = [newPos, ...prev.filter((p) => p !== newPos)].slice(0, 3);
        return updated;
      });

      // Clear pulse animation after it completes
      const timer = setTimeout(() => {
        setNewlyFilledPosition(null);
      }, 600);

      prevFilledPositionsRef.current = new Set(currentFilledPositions);

      return () => clearTimeout(timer);
    }
  }, [isOpen, currentFilledPositions]);

  // Stable handleAssign using useCallback with ref to prevent double-assigns
  const handleAssign = useCallback((position: number) => {
    // Guard against double-assigns during rapid input
    if (isAssigningRef.current) return;

    if (position > 0 && position <= maxPosition) {
      isAssigningRef.current = true;
      onAssign(position - 1); // Convert to 0-based
      onClose();
    }
  }, [maxPosition, onAssign, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter") {
        // Use ref for latest value to avoid stale closure
        const currentPosition = selectedPositionRef.current;
        if (currentPosition !== null) {
          handleAssign(currentPosition);
        }
      } else if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        // Use ref for latest value to avoid stale closure
        const newValue = inputValueRef.current + e.key;
        const numValue = parseInt(newValue);

        if (numValue <= maxPosition && numValue > 0) {
          setInputValue(newValue);
          setSelectedPosition(numValue);
          // Update refs immediately for fast sequential input
          inputValueRef.current = newValue;
          selectedPositionRef.current = numValue;
        }
      } else if (e.key === "Backspace") {
        e.preventDefault();
        // Use ref for latest value to avoid stale closure
        const newValue = inputValueRef.current.slice(0, -1);
        const newPosition = newValue ? parseInt(newValue) : null;
        setInputValue(newValue);
        setSelectedPosition(newPosition);
        // Update refs immediately
        inputValueRef.current = newValue;
        selectedPositionRef.current = newPosition;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, maxPosition, onClose, handleAssign]);

  const handlePositionClick = (position: number) => {
    setSelectedPosition(position);
    handleAssign(position);
  };

  // Generate position groups (11-20, 21-30, etc.)
  const positionGroups: number[][] = [];
  for (let i = 11; i <= maxPosition; i += 10) {
    const group: number[] = [];
    for (let j = i; j < Math.min(i + 10, maxPosition + 1); j++) {
      group.push(j);
    }
    if (group.length > 0) {
      positionGroups.push(group);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-full max-w-2xl"
            data-testid="quick-assign-modal"
          >
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Quick Assign Position
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Type a number (11-{maxPosition}) or click a position
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                  data-testid="quick-assign-close-btn"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Input Display */}
              <div className="mb-6">
                <div className="bg-gray-800 border-2 border-cyan-500 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-400 mb-1">Position #</div>
                  <div className="text-4xl font-bold text-white" data-testid="quick-assign-input-display">
                    {inputValue || "_"}
                  </div>
                  {selectedPosition !== null && (
                    <div className="mt-2 text-sm text-cyan-400">
                      Press Enter to assign
                    </div>
                  )}
                </div>
              </div>

              {/* Position Grid */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {positionGroups.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    <div className="text-xs text-gray-500 mb-2 font-semibold">
                      Positions {group[0]}-{group[group.length - 1]}
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {group.map((position) => {
                        const isFilled = currentFilledPositions.has(position - 1);
                        const isSelected = selectedPosition === position;
                        const isHovered = hoveredPosition === position;
                        const filledInfo = filledPositionDetails.get(position - 1);
                        const isNewlyFilled = newlyFilledPosition === position - 1;
                        const isRecentlyAssigned = recentlyAssigned.includes(position - 1);

                        return (
                          <div key={position} className="relative group">
                            <motion.button
                              layoutId={`quick-assign-position-${position}`}
                              data-testid={`quick-assign-position-${position}`}
                              onClick={() => handlePositionClick(position)}
                              onMouseEnter={() => setHoveredPosition(position)}
                              onMouseLeave={() => setHoveredPosition(null)}
                              animate={{
                                scale: isSelected ? 1.1 : 1,
                                boxShadow: isNewlyFilled
                                  ? "0 0 20px 4px rgba(34, 197, 94, 0.6)"
                                  : isSelected
                                  ? "0 0 12px 2px rgba(6, 182, 212, 0.4)"
                                  : "none",
                              }}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 25,
                                mass: 0.8,
                              }}
                              className={`
                                relative w-full p-3 rounded-lg border-2 transition-colors
                                ${
                                  isSelected
                                    ? "border-cyan-500 bg-cyan-500/20"
                                    : isFilled
                                    ? "border-green-600/50 bg-gray-800 hover:border-green-500"
                                    : "border-gray-700 bg-gray-800/50 hover:border-cyan-500/50 hover:bg-gray-800"
                                }
                                ${isRecentlyAssigned && !isSelected ? "ring-2 ring-cyan-400/30" : ""}
                              `}
                            >
                              {/* Pulse animation overlay for newly filled positions */}
                              <AnimatePresence>
                                {isNewlyFilled && (
                                  <motion.div
                                    initial={{ scale: 0.8, opacity: 1 }}
                                    animate={{ scale: 1.5, opacity: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className="absolute inset-0 rounded-lg bg-green-500/40 pointer-events-none"
                                  />
                                )}
                              </AnimatePresence>

                              {(() => {
                                // Convert 1-indexed position to 0-indexed for styling
                                const { containerClassName, textClassName, style } = getPositionBadgeStyles(position - 1);
                                return (
                                  <div
                                    className={`${containerClassName} text-lg font-bold`}
                                    style={style}
                                  >
                                    <span className={textClassName}>#{position}</span>
                                  </div>
                                );
                              })()}
                              {isFilled && (
                                <motion.div
                                  className="absolute top-1 right-1"
                                  initial={isNewlyFilled ? { scale: 0 } : { scale: 1 }}
                                  animate={{ scale: 1 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 20,
                                  }}
                                >
                                  <motion.div
                                    className="w-2 h-2 bg-green-500 rounded-full"
                                    animate={isNewlyFilled ? {
                                      boxShadow: [
                                        "0 0 0 0 rgba(34, 197, 94, 0.7)",
                                        "0 0 0 6px rgba(34, 197, 94, 0)",
                                      ],
                                    } : {}}
                                    transition={{
                                      duration: 0.6,
                                      ease: "easeOut",
                                    }}
                                  />
                                </motion.div>
                              )}
                              {/* Filled item name preview below position number */}
                              {isFilled && filledInfo && (
                                <motion.div
                                  className="mt-1 text-[10px] text-gray-400 truncate max-w-full"
                                  initial={isNewlyFilled ? { opacity: 0, y: 4 } : { opacity: 1, y: 0 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.1, duration: 0.2 }}
                                >
                                  {filledInfo.title}
                                </motion.div>
                              )}
                            </motion.button>
                            {/* Tooltip for filled positions on hover */}
                            {isFilled && filledInfo && isHovered && (
                              <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                className="absolute z-[210] left-1/2 -translate-x-1/2 bottom-full mb-2 pointer-events-none"
                                data-testid={`quick-assign-tooltip-${position}`}
                              >
                                <div className="bg-gray-950 border border-gray-600 rounded-lg p-2 shadow-xl min-w-[160px] max-w-[220px]">
                                  <div className="flex items-center gap-2">
                                    {filledInfo.image_url && (
                                      <img
                                        src={filledInfo.image_url}
                                        alt={filledInfo.title}
                                        className="w-8 h-8 rounded object-cover flex-shrink-0"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium text-white truncate">
                                        {filledInfo.title}
                                      </div>
                                      <div className="text-[10px] text-amber-400">
                                        Will replace this item
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {/* Tooltip arrow */}
                                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-600" />
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-500">
                  <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded">
                    ESC
                  </kbd>{" "}
                  to close
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  data-testid="quick-assign-cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
