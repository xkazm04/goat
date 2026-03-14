"use client";

import { motion } from "framer-motion";
import { Keyboard } from "lucide-react";

interface QuickSelectBadgeProps {
  /** The quick-select number (1-9) */
  number: number;
  /** Whether this item is currently selected */
  isSelected?: boolean;
  /** Size variant */
  size?: "sm" | "md";
  /** Position of the badge */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

/**
 * Visual badge showing quick-select keyboard shortcut number
 *
 * Displays a numbered badge (1-9) on collection items when in quick-select mode.
 * Provides clear visual feedback for keyboard-driven item selection.
 */
export function QuickSelectBadge({
  number,
  isSelected = false,
  size = "sm",
  position = "top-left",
}: QuickSelectBadgeProps) {
  const sizeClasses = {
    sm: "w-5 h-5 text-[10px]",
    md: "w-6 h-6 text-xs",
  };

  const positionClasses = {
    "top-left": "top-0.5 left-0.5",
    "top-right": "top-0.5 right-0.5",
    "bottom-left": "bottom-0.5 left-0.5",
    "bottom-right": "bottom-0.5 right-0.5",
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        transition: {
          type: "spring",
          stiffness: 500,
          damping: 25,
          delay: number * 0.02,
        },
      }}
      exit={{
        scale: 0,
        opacity: 0,
        transition: { duration: 0.15 },
      }}
      className={`
        absolute ${positionClasses[position]} z-20
        ${sizeClasses[size]}
        flex items-center justify-center
        rounded-md font-bold
        shadow-lg shadow-black/30
        ${
          isSelected
            ? "bg-gradient-to-br from-cyan-400 to-cyan-600 text-white ring-2 ring-cyan-400/50"
            : "bg-gradient-to-br from-gray-700 to-gray-900 text-gray-200 border border-gray-600/50"
        }
        transition-all duration-150
      `}
      data-testid={`quick-select-badge-${number}`}
    >
      <span className="drop-shadow-sm">{number}</span>
    </motion.div>
  );
}

interface QuickSelectStatusBarProps {
  /** Whether quick-select is active */
  isActive: boolean;
  /** Current mode */
  mode: "off" | "item-selection" | "position-assignment";
  /** Selected item title (if any) */
  selectedItemTitle?: string;
  /** Status message */
  statusMessage?: string;
  /** Callback to toggle quick-select */
  onToggle?: () => void;
  /** Callback to clear selection */
  onClear?: () => void;
}

/**
 * Status bar showing quick-select mode and instructions
 *
 * Provides clear guidance for keyboard-driven workflow:
 * - Press Q to toggle quick-select mode
 * - Press 1-9 to select items
 * - Press 1-0 to assign to grid positions
 */
export function QuickSelectStatusBar({
  isActive,
  mode,
  selectedItemTitle,
  statusMessage,
  onToggle,
  onClear,
}: QuickSelectStatusBarProps) {
  if (!isActive && !statusMessage) return null;

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg
        ${
          isActive
            ? "bg-gradient-to-r from-cyan-500/15 to-purple-500/15 border border-cyan-500/30"
            : "bg-gray-800/50 border border-gray-700/50"
        }
        transition-colors duration-200
      `}
      data-testid="quick-select-status-bar"
    >
      {/* Keyboard icon */}
      <div
        className={`
          flex items-center justify-center w-6 h-6 rounded
          ${isActive ? "bg-cyan-500/20 text-cyan-400" : "bg-gray-700/50 text-gray-500"}
        `}
      >
        <Keyboard className="w-4 h-4" />
      </div>

      {/* Mode and instructions */}
      <div className="flex-1 min-w-0">
        {mode === "off" && (
          <p className="text-xs text-gray-400">
            Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 font-mono">Q</kbd> for
            quick-select
          </p>
        )}

        {mode === "item-selection" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-cyan-400 font-medium">Quick-select active</span>
            <span className="text-[10px] text-gray-400">
              Press <kbd className="px-1 py-0.5 bg-gray-700/80 rounded text-gray-300 font-mono">1-9</kbd>{" "}
              to select
            </span>
          </div>
        )}

        {mode === "position-assignment" && selectedItemTitle && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-cyan-400 font-medium truncate max-w-[150px]">
              "{selectedItemTitle}"
            </span>
            <span className="text-[10px] text-gray-400">
              → <kbd className="px-1 py-0.5 bg-gray-700/80 rounded text-gray-300 font-mono">1-0</kbd> or{" "}
              <kbd className="px-1 py-0.5 bg-gray-700/80 rounded text-gray-300 font-mono">Enter</kbd>
            </span>
          </div>
        )}

        {/* Status message */}
        {statusMessage && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] text-gray-400 mt-0.5"
          >
            {statusMessage}
          </motion.p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {mode === "position-assignment" && onClear && (
          <button
            onClick={onClear}
            className="px-2 py-1 text-[10px] text-gray-400 hover:text-gray-200 bg-gray-700/50 hover:bg-gray-600/50 rounded transition-colors"
            data-testid="quick-select-clear-btn"
          >
            Clear
          </button>
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            className={`
              px-2 py-1 text-[10px] rounded transition-colors
              ${
                isActive
                  ? "text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20"
                  : "text-gray-400 hover:text-gray-200 bg-gray-700/50 hover:bg-gray-600/50"
              }
            `}
            data-testid="quick-select-toggle-btn"
          >
            {isActive ? "Exit (Esc)" : "Quick-select (Q)"}
          </button>
        )}
      </div>
    </motion.div>
  );
}
