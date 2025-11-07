"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GridItemType } from "@/types/match";

interface SimpleDropZoneProps {
  position: number;
  isOccupied: boolean;
  occupiedBy?: string;
  imageUrl?: string | null;
  gridItem?: GridItemType;
  onRemove?: () => void;
}

/**
 * Enhanced drop zone with:
 * - Rank number background
 * - Image support
 * - Draggable when occupied (for swapping)
 * - Top 3 special styling (gold, silver, bronze colors)
 */
export function SimpleDropZone({
  position,
  isOccupied,
  occupiedBy,
  imageUrl,
  gridItem,
  onRemove
}: SimpleDropZoneProps) {

  // Make occupied items draggable for swapping
  const { attributes, listeners, setNodeRef: setDragNodeRef, transform, isDragging } = useDraggable({
    id: gridItem?.id || `empty-${position}`,
    disabled: !isOccupied || !gridItem,
    data: {
      type: 'grid-item',
      item: gridItem,
      position: position
    }
  });

  // Always accept drops
  const { isOver, setNodeRef: setDropNodeRef } = useDroppable({
    id: `drop-${position}`,
    data: {
      type: 'grid-slot',
      position
    }
  });

  // Combine refs
  const setNodeRef = (node: HTMLElement | null) => {
    setDragNodeRef(node);
    setDropNodeRef(node);
  };

  // Get rank color for top 3 (from MatchGridImageItem)
  const getRankColor = (pos: number) => {
    if (pos === 0) return '#FFD700'; // Gold - 1st place
    if (pos === 1) return '#C0C0C0'; // Silver - 2nd place
    if (pos === 2) return '#CD7F32'; // Bronze - 3rd place
    return '#94a3b8'; // Gray - rest
  };

  const rankColor = getRankColor(position);

  // Apply drag transform
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isOccupied ? attributes : {})}
      {...(isOccupied ? listeners : {})}
      className={`
        relative aspect-square rounded-lg overflow-hidden
        border-2 transition-all
        ${isOver
          ? 'border-cyan-400 bg-cyan-500/20 scale-105'
          : isOccupied
            ? 'border-gray-600 bg-gradient-to-br from-slate-800 to-slate-900'
            : 'border-gray-700 bg-gray-900/50 border-dashed'
        }
        ${isOccupied ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
      data-testid={`grid-drop-zone-${position}`}
    >
      {/* Background rank number (large, low opacity) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className="text-[8rem] font-black select-none transition-colors"
          style={{
            color: isOver ? '#3b82f6' : rankColor,
            opacity: isOver ? 0.15 : 0.08
          }}
        >
          {position + 1}
        </span>
      </div>

      {/* Position label (top-left corner) */}
      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-gray-800/90 rounded text-[10px] font-semibold text-gray-400 z-10">
        #{position + 1}
      </div>

      {/* Content */}
      {isOccupied && occupiedBy ? (
        <>
          {/* Image background if available */}
          {imageUrl ? (
            <div className="absolute inset-0">
              <img
                src={imageUrl}
                alt={occupiedBy}
                className="w-full h-full object-cover"
              />
              {/* Dark overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
          )}

          {/* Content overlay */}
          <div className="relative w-full h-full flex flex-col items-center justify-end p-2 z-10">
            <div className="text-xs text-white font-medium text-center mb-2 line-clamp-2 drop-shadow-lg">
              {occupiedBy}
            </div>
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="px-2 py-1 text-[10px] bg-red-500/30 text-red-400 rounded hover:bg-red-500/50 transition-colors backdrop-blur-sm border border-red-500/30"
                data-testid={`remove-item-btn-${position}`}
              >
                Remove
              </button>
            )}
          </div>

          {/* Rank badge at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-8 flex items-center justify-center border-t border-gray-700/50 z-20"
            style={{
              background: `linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.95) 100%)`
            }}
          >
            <span
              className="text-sm font-black"
              style={{ color: rankColor }}
            >
              #{position + 1}
            </span>
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs text-gray-600">Drop here</span>
        </div>
      )}

      {/* Drag indicator overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-cyan-500/20 border-2 border-cyan-400 pointer-events-none" />
      )}
    </div>
  );
}
