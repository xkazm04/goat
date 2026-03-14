"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitCompare,
  X,
  Plus,
  Check,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { useComparison } from "@/hooks/use-comparison";
import type { BacklogItemType } from "@/types/match";

interface ComparisonSelectorProps {
  onCompare?: () => void;
  className?: string;
}

/**
 * ComparisonSelector - Floating bar showing selected items for comparison
 */
export const ComparisonSelector = memo(function ComparisonSelector({
  onCompare,
  className = "",
}: ComparisonSelectorProps) {
  const {
    selectedItems,
    selectedIds,
    canCompare,
    canAddMore,
    clearSelection,
    selectionStatusText,
    MIN_ITEMS,
    MAX_ITEMS,
  } = useComparison();

  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-expand when items are selected
  useEffect(() => {
    if (selectedIds.length > 0) {
      setIsExpanded(true);
    }
  }, [selectedIds.length]);

  // Hide when no selection
  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 ${className}`}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <div
          className="relative bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/50
            shadow-2xl shadow-black/40 overflow-hidden"
        >
          {/* Glow effect */}
          <div
            className="absolute inset-0 rounded-2xl opacity-50 pointer-events-none"
            style={{
              background: canCompare
                ? "radial-gradient(ellipse at center, rgba(34, 197, 94, 0.15) 0%, transparent 70%)"
                : "radial-gradient(ellipse at center, rgba(99, 102, 241, 0.1) 0%, transparent 70%)",
            }}
          />

          <div className="relative p-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-medium text-white">
                  Compare Items
                </span>
                <span className="text-xs text-slate-500">
                  {selectedIds.length}/{MAX_ITEMS}
                </span>
              </div>

              <button
                onClick={clearSelection}
                className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400
                  hover:text-slate-300 transition-colors"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selected items */}
            <div className="flex items-center gap-2 mb-4">
              {selectedItems.map((item, index) => (
                <ComparisonItemChip
                  key={item.id}
                  item={item}
                  index={index}
                />
              ))}

              {/* Empty slots */}
              {canAddMore &&
                Array.from({ length: MAX_ITEMS - selectedIds.length }).map((_, i) => (
                  <motion.div
                    key={`empty-${i}`}
                    className="w-12 h-12 rounded-lg border-2 border-dashed border-slate-700/50
                      flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.5, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Plus className="w-4 h-4 text-slate-600" />
                  </motion.div>
                ))}
            </div>

            {/* Status & Actions */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500">{selectionStatusText}</span>

              <div className="flex items-center gap-2">
                <button
                  onClick={clearSelection}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400
                    hover:text-white hover:bg-slate-700/50 transition-all"
                >
                  Clear
                </button>

                <motion.button
                  onClick={onCompare}
                  disabled={!canCompare}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2
                    transition-all
                    ${canCompare
                      ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"}
                  `}
                  whileHover={canCompare ? { scale: 1.02 } : {}}
                  whileTap={canCompare ? { scale: 0.98 } : {}}
                >
                  <GitCompare className="w-4 h-4" />
                  Compare
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

/**
 * ComparisonItemChip - Individual selected item display
 */
interface ComparisonItemChipProps {
  item: BacklogItemType;
  index: number;
}

const ComparisonItemChip = memo(function ComparisonItemChip({
  item,
  index,
}: ComparisonItemChipProps) {
  const { toggleSelection } = useComparison();

  return (
    <motion.div
      className="relative group"
      initial={{ opacity: 0, scale: 0.8, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ delay: index * 0.05 }}
    >
      <div
        className="w-12 h-12 rounded-lg overflow-hidden border-2 border-indigo-500/50
          shadow-lg shadow-indigo-500/20 cursor-pointer hover:border-indigo-400 transition-colors"
        onClick={() => toggleSelection(item)}
        title={item.title}
      >
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20
            flex items-center justify-center">
            <span className="text-lg font-bold text-indigo-400">
              {item.title.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Index badge */}
      <div
        className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-indigo-500
          flex items-center justify-center text-xs font-bold text-white shadow-md"
      >
        {index + 1}
      </div>

      {/* Remove button on hover */}
      <motion.button
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500
          flex items-center justify-center opacity-0 group-hover:opacity-100
          transition-opacity shadow-md"
        onClick={(e) => {
          e.stopPropagation();
          toggleSelection(item);
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <X className="w-3 h-3 text-white" />
      </motion.button>
    </motion.div>
  );
});

/**
 * SelectionCheckbox - Checkbox indicator for collection items
 */
interface SelectionCheckboxProps {
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

export const SelectionCheckbox = memo(function SelectionCheckbox({
  isSelected,
  onClick,
  disabled = false,
  size = "md",
}: SelectionCheckboxProps) {
  const sizeClasses = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={`
        ${sizeClasses} rounded-md flex items-center justify-center
        transition-all
        ${isSelected
          ? "bg-indigo-500 border-indigo-500 shadow-lg shadow-indigo-500/30"
          : "bg-slate-800/80 border-slate-600 hover:border-indigo-400"}
        border-2
        ${disabled && !isSelected ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
      whileHover={!disabled ? { scale: 1.1 } : {}}
      whileTap={!disabled ? { scale: 0.9 } : {}}
    >
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <Check className={`${iconSize} text-white`} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
});

export type { ComparisonSelectorProps, SelectionCheckboxProps };
