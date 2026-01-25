"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BacklogItem } from "@/types/backlog-groups";
import { GridItemType } from "@/types/match";
import {
  getPlacementPredictor,
  PlacementPrediction,
  PositionPrediction,
} from "@/lib/placement/PlacementPredictor";
import { getDropZoneTailwindClasses } from "@/lib/placement/DropZoneScorer";

/**
 * Smart fill mode state
 */
export type SmartFillState = "idle" | "active" | "paused" | "completed";

/**
 * Props for SmartFillPanel
 */
interface SmartFillPanelProps {
  isActive: boolean;
  onToggle: () => void;
  gridItems: GridItemType[];
  availableItems: BacklogItem[];
  onPlaceItem: (item: BacklogItem, position: number) => void;
  onSkipItem: (item: BacklogItem) => void;
  targetSize: number;
}

/**
 * SmartFillPanel - Guided auto-ranking workflow
 *
 * Presents items sequentially with recommended positions,
 * allowing users to quickly fill their ranking with smart suggestions.
 */
export function SmartFillPanel({
  isActive,
  onToggle,
  gridItems,
  availableItems,
  onPlaceItem,
  onSkipItem,
  targetSize,
}: SmartFillPanelProps) {
  const predictor = useMemo(() => getPlacementPredictor(), []);

  // Current item index in the queue
  const [currentIndex, setCurrentIndex] = useState(0);
  const [skippedItems, setSkippedItems] = useState<Set<string>>(new Set());
  const [prediction, setPrediction] = useState<PlacementPrediction | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  // Get the queue of items to process (excluding already placed and skipped)
  const itemQueue = useMemo(() => {
    const placedIds = new Set(
      gridItems
        .filter(g => g.matched && g.backlogItemId)
        .map(g => g.backlogItemId!)
    );

    return availableItems.filter(
      item => !placedIds.has(item.id) && !skippedItems.has(item.id)
    );
  }, [availableItems, gridItems, skippedItems]);

  // Current item being suggested
  const currentItem = itemQueue[currentIndex] || null;

  // Calculate progress
  const filledCount = gridItems.filter(g => g.matched).length;
  const progress = Math.round((filledCount / targetSize) * 100);

  // Update prediction when current item changes
  useEffect(() => {
    if (!isActive || !currentItem) {
      setPrediction(null);
      return;
    }

    const pred = predictor.predict(currentItem, gridItems, { excludeOccupied: true });
    setPrediction(pred);

    // Auto-select top suggestion
    if (pred.topSuggestion) {
      setSelectedPosition(pred.topSuggestion.position);
    }
  }, [isActive, currentItem, gridItems, predictor]);

  // Handle placing the current item
  const handlePlace = useCallback(() => {
    if (!currentItem || selectedPosition === null) return;

    onPlaceItem(currentItem, selectedPosition);

    // Record the placement for learning
    predictor.recordPlacement(currentItem, selectedPosition);

    // Move to next item
    setCurrentIndex(prev => Math.min(prev, itemQueue.length - 1));
    setSelectedPosition(null);
  }, [currentItem, selectedPosition, onPlaceItem, predictor, itemQueue.length]);

  // Handle skipping the current item
  const handleSkip = useCallback(() => {
    if (!currentItem) return;

    setSkippedItems(prev => new Set(Array.from(prev).concat([currentItem.id])));
    onSkipItem(currentItem);
    setCurrentIndex(prev => Math.min(prev, itemQueue.length - 1));
    setSelectedPosition(null);
  }, [currentItem, onSkipItem, itemQueue.length]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Number keys 1-9 for quick position selection
      if (e.key >= "1" && e.key <= "9") {
        const index = parseInt(e.key) - 1;
        if (prediction?.predictions[index]) {
          setSelectedPosition(prediction.predictions[index].position);
        }
        return;
      }

      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          handlePlace();
          break;
        case "s":
        case "Escape":
          handleSkip();
          break;
        case "ArrowUp":
          e.preventDefault();
          // Select previous suggestion
          if (prediction?.predictions) {
            const currentIdx = prediction.predictions.findIndex(
              p => p.position === selectedPosition
            );
            if (currentIdx > 0) {
              setSelectedPosition(prediction.predictions[currentIdx - 1].position);
            }
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          // Select next suggestion
          if (prediction?.predictions) {
            const currentIdx = prediction.predictions.findIndex(
              p => p.position === selectedPosition
            );
            if (currentIdx < prediction.predictions.length - 1) {
              setSelectedPosition(prediction.predictions[currentIdx + 1].position);
            }
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, prediction, selectedPosition, handlePlace, handleSkip]);

  // Completed state
  const isCompleted = filledCount >= targetSize || itemQueue.length === 0;

  if (!isActive) {
    return (
      <SmartFillToggleButton
        onClick={onToggle}
        remainingItems={itemQueue.length}
        progress={progress}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg"
    >
      <div className="bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 text-cyan-400"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
              </svg>
            </motion.div>
            <div>
              <h3 className="font-semibold text-white">Smart Fill Mode</h3>
              <p className="text-xs text-gray-400">
                {itemQueue.length} items remaining
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Progress */}
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-green-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{progress}%</span>
            </div>

            {/* Close button */}
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {isCompleted ? (
            <CompletedState
              key="completed"
              filledCount={filledCount}
              targetSize={targetSize}
              onClose={onToggle}
            />
          ) : currentItem ? (
            <ItemSuggestionCard
              key={currentItem.id}
              item={currentItem}
              prediction={prediction}
              selectedPosition={selectedPosition}
              onSelectPosition={setSelectedPosition}
              onPlace={handlePlace}
              onSkip={handleSkip}
            />
          ) : (
            <EmptyState key="empty" />
          )}
        </AnimatePresence>

        {/* Footer with keyboard hints */}
        {!isCompleted && currentItem && (
          <div className="px-4 py-2 bg-gray-800/50 border-t border-gray-700 flex items-center justify-between text-[10px] text-gray-500">
            <div className="flex items-center gap-3">
              <span><kbd className="px-1 bg-gray-700 rounded">↑↓</kbd> Navigate</span>
              <span><kbd className="px-1 bg-gray-700 rounded">1-9</kbd> Quick select</span>
            </div>
            <div className="flex items-center gap-3">
              <span><kbd className="px-1 bg-gray-700 rounded">Enter</kbd> Place</span>
              <span><kbd className="px-1 bg-gray-700 rounded">S</kbd> Skip</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Toggle button when smart fill is not active
 */
function SmartFillToggleButton({
  onClick,
  remainingItems,
  progress,
}: {
  onClick: () => void;
  remainingItems: number;
  progress: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-24 right-8 z-50 flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full shadow-lg shadow-cyan-500/20 text-white font-medium text-sm hover:shadow-cyan-500/40 transition-shadow"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      <span>Smart Fill</span>
      {remainingItems > 0 && (
        <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
          {remainingItems}
        </span>
      )}
    </motion.button>
  );
}

/**
 * Card showing current item and suggestions
 */
function ItemSuggestionCard({
  item,
  prediction,
  selectedPosition,
  onSelectPosition,
  onPlace,
  onSkip,
}: {
  item: BacklogItem;
  prediction: PlacementPrediction | null;
  selectedPosition: number | null;
  onSelectPosition: (pos: number) => void;
  onPlace: () => void;
  onSkip: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4"
    >
      {/* Item preview */}
      <div className="flex gap-4 mb-4">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title || item.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center text-2xl">
            {(item.title || item.name || "?").charAt(0)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white truncate">
            {item.title || item.name}
          </h4>
          {item.item_year && (
            <p className="text-sm text-gray-400">{item.item_year}</p>
          )}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 bg-gray-700 rounded-full text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Position suggestions */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 font-medium">Suggested positions:</p>

        <div className="grid grid-cols-5 gap-2">
          {prediction?.predictions.slice(0, 5).map((pred, index) => (
            <PositionOption
              key={pred.position}
              prediction={pred}
              index={index}
              isSelected={selectedPosition === pred.position}
              onClick={() => onSelectPosition(pred.position)}
            />
          ))}
        </div>

        {/* Show reasoning for selected position */}
        {selectedPosition !== null && prediction?.predictions && (
          <SelectedPositionReasoning
            prediction={prediction.predictions.find(p => p.position === selectedPosition)}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={onSkip}
          className="flex-1 py-2 px-4 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors text-sm"
        >
          Skip for now
        </button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onPlace}
          disabled={selectedPosition === null}
          className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Place at #{selectedPosition !== null ? selectedPosition + 1 : "?"}
        </motion.button>
      </div>
    </motion.div>
  );
}

/**
 * Individual position option button
 */
function PositionOption({
  prediction,
  index,
  isSelected,
  onClick,
}: {
  prediction: PositionPrediction;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const color = prediction.confidence >= 0.7
    ? "green"
    : prediction.confidence >= 0.5
    ? "yellow"
    : prediction.confidence >= 0.3
    ? "orange"
    : "gray";

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        relative p-2 rounded-lg border-2 transition-all
        ${isSelected
          ? "border-cyan-400 bg-cyan-400/20 ring-2 ring-cyan-400/50"
          : getDropZoneTailwindClasses(color, prediction.confidence >= 0.7)
        }
      `}
    >
      <div className="text-center">
        <span className="text-lg font-bold">#{prediction.position + 1}</span>
        <div className="text-[10px] opacity-70">
          {Math.round(prediction.confidence * 100)}%
        </div>
      </div>

      {/* Keyboard hint */}
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-gray-700 rounded text-[10px] flex items-center justify-center">
        {index + 1}
      </span>
    </motion.button>
  );
}

/**
 * Show reasoning for the selected position
 */
function SelectedPositionReasoning({
  prediction,
}: {
  prediction: PositionPrediction | undefined;
}) {
  if (!prediction || prediction.reasons.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-2 p-2 bg-gray-800/50 rounded-lg"
    >
      <p className="text-[10px] text-gray-400 mb-1">Why this position:</p>
      <ul className="space-y-0.5">
        {prediction.reasons.slice(0, 2).map((reason, idx) => (
          <li key={idx} className="text-xs text-gray-300 flex items-start gap-1">
            <span className="text-cyan-400 mt-0.5">•</span>
            <span>{reason.description}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

/**
 * Completed state view
 */
function CompletedState({
  filledCount,
  targetSize,
  onClose,
}: {
  filledCount: number;
  targetSize: number;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 text-center"
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.5 }}
        className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500 to-cyan-500 flex items-center justify-center"
      >
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>

      <h3 className="text-xl font-bold text-white mb-2">
        {filledCount >= targetSize ? "Ranking Complete!" : "All Items Placed!"}
      </h3>
      <p className="text-gray-400 mb-4">
        You've filled {filledCount} of {targetSize} positions
      </p>

      <button
        onClick={onClose}
        className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg text-white font-medium"
      >
        Close Smart Fill
      </button>
    </motion.div>
  );
}

/**
 * Empty state when no items available
 */
function EmptyState() {
  return (
    <div className="p-6 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-700 flex items-center justify-center text-gray-400">
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <p className="text-gray-400">No more items to suggest</p>
    </div>
  );
}

export default SmartFillPanel;
