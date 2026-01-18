"use client";

/**
 * SimpleDragOverlay - Minimal drag overlay that follows cursor precisely
 *
 * Design principles:
 * - No conflicting transform systems
 * - Uses CSS positioning only (no framer-motion transforms during drag)
 * - Fixed size with negative margin centering
 * - Subtle visual feedback without complexity
 */

import { motion, AnimatePresence } from "framer-motion";
import { PlaceholderImage } from "@/components/ui/placeholder-image";

interface DraggableItem {
  id?: string;
  title: string;
  image_url?: string | null;
}

interface SimpleDragOverlayProps {
  item: DraggableItem | null;
  targetPosition?: number | null;
}

/**
 * Simple, centered drag overlay with minimal visual effects
 */
export function SimpleDragOverlay({ item, targetPosition }: SimpleDragOverlayProps) {
  if (!item) return null;

  return (
    <div
      className="w-20 h-20 rounded-lg overflow-hidden pointer-events-none"
      style={{
        // Center the overlay on cursor position
        // DragOverlay positions top-left at cursor, so offset by half size
        marginLeft: '-40px',
        marginTop: '-40px',
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.4),
          0 0 0 2px rgba(34, 211, 238, 0.8),
          0 0 20px rgba(34, 211, 238, 0.4)
        `,
      }}
      data-testid="simple-drag-overlay"
    >
      {/* Image */}
      <PlaceholderImage
        src={item.image_url}
        alt={item.title}
        testId="drag-overlay-image"
        seed={item.id || item.title}
        eager={true}
        blurAmount={10}
        fallbackComponent={
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <span className="text-[10px] text-gray-400 text-center px-1 truncate">
              {item.title}
            </span>
          </div>
        }
      />

      {/* Target position badge */}
      {typeof targetPosition === "number" && (
        <div
          className="absolute -top-1 -right-1 bg-cyan-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-lg"
          data-testid="position-badge"
        >
          #{targetPosition + 1}
        </div>
      )}

      {/* Subtle pulse animation border */}
      <div
        className="absolute inset-0 rounded-lg pointer-events-none animate-pulse"
        style={{
          boxShadow: 'inset 0 0 0 1px rgba(34, 211, 238, 0.3)',
        }}
      />
    </div>
  );
}

export default SimpleDragOverlay;
