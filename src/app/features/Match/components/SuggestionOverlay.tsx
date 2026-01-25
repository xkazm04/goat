"use client";

import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropZoneIndicator,
  getDropZoneTailwindClasses,
} from "@/lib/placement/DropZoneScorer";

/**
 * Props for position suggestion badge
 */
interface SuggestionBadgeProps {
  indicator: DropZoneIndicator;
  size?: "small" | "medium" | "large";
  showReason?: boolean;
  onClick?: () => void;
}

/**
 * Individual suggestion badge shown on a grid slot
 */
export const SuggestionBadge = memo(function SuggestionBadge({
  indicator,
  size = "medium",
  showReason = false,
  onClick,
}: SuggestionBadgeProps) {
  const sizeClasses = {
    small: "text-[10px] px-1 py-0.5",
    medium: "text-xs px-1.5 py-0.5",
    large: "text-sm px-2 py-1",
  };

  const colorClasses = getDropZoneTailwindClasses(
    indicator.color,
    indicator.isTopSuggestion
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -5 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`
        absolute top-0 right-0 z-20
        rounded-bl-lg rounded-tr-lg
        font-medium
        backdrop-blur-sm
        cursor-pointer
        transition-all duration-150
        hover:scale-105
        ${sizeClasses[size]}
        ${colorClasses}
      `}
      onClick={onClick}
      title={indicator.shortReason}
    >
      <div className="flex items-center gap-1">
        {indicator.isTopSuggestion && (
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-yellow-400"
          >
            ★
          </motion.span>
        )}
        <span>{Math.round(indicator.confidence * 100)}%</span>
      </div>

      {showReason && indicator.shortReason && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="text-[9px] opacity-80 mt-0.5 max-w-[100px] truncate"
        >
          {indicator.shortReason}
        </motion.div>
      )}
    </motion.div>
  );
});

/**
 * Props for the suggestion overlay on a grid slot
 */
interface SlotSuggestionOverlayProps {
  indicator: DropZoneIndicator | null;
  isHovered?: boolean;
  isDragging?: boolean;
}

/**
 * Overlay component that shows suggestion visuals on a grid slot
 */
export const SlotSuggestionOverlay = memo(function SlotSuggestionOverlay({
  indicator,
  isHovered = false,
  isDragging = false,
}: SlotSuggestionOverlayProps) {
  if (!indicator || !isDragging) return null;

  const glowIntensity = indicator.intensity * (isHovered ? 1.5 : 1);

  return (
    <AnimatePresence>
      <motion.div
        key={`suggestion-${indicator.position}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 pointer-events-none z-10"
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-lg"
          animate={{
            boxShadow: isHovered
              ? `0 0 ${20 * glowIntensity}px ${10 * glowIntensity}px ${getGlowColor(indicator.color, glowIntensity)}`
              : `0 0 ${10 * glowIntensity}px ${5 * glowIntensity}px ${getGlowColor(indicator.color, glowIntensity * 0.5)}`,
          }}
          transition={{ duration: 0.2 }}
        />

        {/* Pulsing border for top suggestion */}
        {indicator.isTopSuggestion && (
          <motion.div
            className="absolute inset-0 rounded-lg border-2 border-green-400"
            animate={{
              opacity: [0.5, 1, 0.5],
              scale: [1, 1.02, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        {/* Confidence badge */}
        <SuggestionBadge
          indicator={indicator}
          size={indicator.isTopSuggestion ? "medium" : "small"}
          showReason={isHovered}
        />
      </motion.div>
    </AnimatePresence>
  );
});

/**
 * Props for the quick place indicator
 */
interface QuickPlaceIndicatorProps {
  position: number;
  shortcut: string;
  confidence: number;
  isActive?: boolean;
}

/**
 * Keyboard shortcut indicator for quick placement
 */
export const QuickPlaceIndicator = memo(function QuickPlaceIndicator({
  position,
  shortcut,
  confidence,
  isActive = false,
}: QuickPlaceIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: isActive ? 1 : 0.7,
        scale: isActive ? 1.1 : 1,
      }}
      className={`
        absolute bottom-1 left-1 z-20
        w-6 h-6 rounded-md
        flex items-center justify-center
        text-xs font-bold
        backdrop-blur-sm
        transition-colors duration-150
        ${isActive
          ? "bg-cyan-500 text-white"
          : "bg-gray-800/80 text-gray-300 border border-gray-600"
        }
      `}
      title={`Press ${shortcut} to place here (${Math.round(confidence * 100)}% match)`}
    >
      {shortcut}
    </motion.div>
  );
});

/**
 * Props for suggestions list tooltip
 */
interface SuggestionsTooltipProps {
  indicators: DropZoneIndicator[];
  onSelectPosition: (position: number) => void;
  className?: string;
}

/**
 * Tooltip showing list of suggested positions
 */
export const SuggestionsTooltip = memo(function SuggestionsTooltip({
  indicators,
  onSelectPosition,
  className = "",
}: SuggestionsTooltipProps) {
  if (indicators.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`
        absolute z-50
        bg-gray-900/95 backdrop-blur-md
        border border-gray-700 rounded-lg
        shadow-xl shadow-black/50
        p-3 min-w-[200px]
        ${className}
      `}
    >
      <div className="text-xs text-gray-400 mb-2 font-medium">
        Suggested Positions
      </div>

      <div className="space-y-1.5">
        {indicators.map((indicator, index) => (
          <motion.button
            key={indicator.position}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelectPosition(indicator.position)}
            className={`
              w-full flex items-center gap-2 p-2 rounded-md
              text-left text-sm
              transition-colors duration-150
              ${getDropZoneTailwindClasses(indicator.color, indicator.isTopSuggestion)}
              hover:brightness-110
            `}
          >
            <span className="font-bold w-8">#{indicator.position + 1}</span>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                {indicator.isTopSuggestion && (
                  <span className="text-yellow-400">★</span>
                )}
                <span className="font-medium">
                  {Math.round(indicator.confidence * 100)}% match
                </span>
              </div>
              {indicator.shortReason && (
                <div className="text-xs opacity-70 truncate">
                  {indicator.shortReason}
                </div>
              )}
            </div>

            {/* Keyboard shortcut hint */}
            {index < 9 && (
              <span className="text-xs bg-gray-700/50 px-1.5 py-0.5 rounded">
                {index + 1}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-gray-700 text-[10px] text-gray-500">
        Press 1-9 to quick-place
      </div>
    </motion.div>
  );
});

/**
 * Get glow color string for a drop zone color
 */
function getGlowColor(color: string, intensity: number): string {
  const alpha = Math.min(0.6, intensity * 0.3);

  switch (color) {
    case "green":
      return `rgba(34, 197, 94, ${alpha})`;
    case "yellow":
      return `rgba(234, 179, 8, ${alpha})`;
    case "orange":
      return `rgba(249, 115, 22, ${alpha})`;
    case "blue":
      return `rgba(59, 130, 246, ${alpha})`;
    default:
      return `rgba(107, 114, 128, ${alpha})`;
  }
}

/**
 * Hook to format suggestion reasons for display
 */
export function useSuggestionReasons(indicator: DropZoneIndicator | null): string[] {
  return useMemo(() => {
    if (!indicator?.shortReason) return [];

    // Parse and format the reason
    return [indicator.shortReason];
  }, [indicator]);
}

export default SlotSuggestionOverlay;
