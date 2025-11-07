"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface QuickAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (position: number) => void;
  maxPosition: number;
  currentFilledPositions?: Set<number>;
}

/**
 * Quick Assign Modal for positions 11-50
 * Allows fast keyboard-based assignment to any position
 */
export function QuickAssignModal({
  isOpen,
  onClose,
  onAssign,
  maxPosition,
  currentFilledPositions = new Set()
}: QuickAssignModalProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue("");
      setSelectedPosition(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter" && selectedPosition !== null) {
        handleAssign(selectedPosition);
      } else if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        const newValue = inputValue + e.key;
        const numValue = parseInt(newValue);

        if (numValue <= maxPosition && numValue > 0) {
          setInputValue(newValue);
          setSelectedPosition(numValue);
        }
      } else if (e.key === "Backspace") {
        e.preventDefault();
        const newValue = inputValue.slice(0, -1);
        setInputValue(newValue);
        setSelectedPosition(newValue ? parseInt(newValue) : null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, inputValue, selectedPosition, maxPosition, onClose]);

  const handleAssign = (position: number) => {
    if (position > 0 && position <= maxPosition) {
      onAssign(position - 1); // Convert to 0-based
      onClose();
    }
  };

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
                  <div className="text-4xl font-bold text-white">
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

                        return (
                          <button
                            key={position}
                            onClick={() => handlePositionClick(position)}
                            className={`
                              relative p-3 rounded-lg border-2 transition-all
                              ${
                                isSelected
                                  ? "border-cyan-500 bg-cyan-500/20 scale-105"
                                  : isFilled
                                  ? "border-gray-600 bg-gray-800 opacity-60"
                                  : "border-gray-700 bg-gray-800/50 hover:border-cyan-500/50 hover:bg-gray-800"
                              }
                            `}
                          >
                            <div className="text-lg font-bold text-white">
                              #{position}
                            </div>
                            {isFilled && (
                              <div className="absolute top-1 right-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                              </div>
                            )}
                          </button>
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
