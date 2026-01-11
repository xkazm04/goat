"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { ActiveItemData } from "../sub_MatchGrid/components/DropZoneHighlightContext";

interface OptimisticDragPreviewProps {
  itemData: ActiveItemData;
  size?: "small" | "medium" | "large";
}

/**
 * OptimisticDragPreview - Ghost preview of item that will land in a grid slot
 *
 * Shows a semi-transparent preview of the dragged item in the hovered slot,
 * providing instant visual feedback about where the item will land.
 * Uses CSS transforms for 60fps performance.
 */
export const OptimisticDragPreview = memo(function OptimisticDragPreview({
  itemData,
  size = "medium",
}: OptimisticDragPreviewProps) {
  // Responsive size variants matching MatchGridSlot sizing
  // Preview is slightly smaller than slot to fit inside with padding
  const sizeClasses = {
    small: "w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-16 lg:h-16 xl:w-20 xl:h-20",
    medium: "w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 xl:w-24 xl:h-24",
    large: "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32",
  };

  return (
    <motion.div
      className={`
        ${sizeClasses[size]}
        absolute inset-0 m-auto
        rounded-lg overflow-hidden
        pointer-events-none
        z-30
      `}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 0.7,
        scale: 1,
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{
        duration: 0.15,
        ease: "easeOut"
      }}
      data-testid="optimistic-drag-preview"
    >
      {/* Ghost image with pulse effect */}
      {itemData.image_url ? (
        <div
          className="relative w-full h-full"
          data-testid="optimistic-drag-preview-image-container"
        >
          <img
            src={itemData.image_url}
            alt={itemData.title || ""}
            className="w-full h-full object-cover rounded-lg opacity-70"
            data-testid="optimistic-drag-preview-image"
          />
          {/* Cyan overlay glow */}
          <div
            className="absolute inset-0 rounded-lg animate-optimistic-pulse"
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.3) 0%, rgba(34, 211, 238, 0.2) 100%)',
              boxShadow: 'inset 0 0 20px rgba(6, 182, 212, 0.4)',
            }}
            data-testid="optimistic-drag-preview-glow"
          />
        </div>
      ) : (
        <div
          className="
            w-full h-full rounded-lg
            flex items-center justify-center
            text-center text-xs text-cyan-300/80 px-2
            animate-optimistic-pulse
          "
          style={{
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(34, 211, 238, 0.1) 100%)',
            border: '2px dashed rgba(34, 211, 238, 0.5)',
          }}
          data-testid="optimistic-drag-preview-placeholder"
        >
          <span className="truncate">{itemData.title || "Drop here"}</span>
        </div>
      )}
    </motion.div>
  );
});

export default OptimisticDragPreview;
