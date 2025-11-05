"use client";

import { useDroppable } from "@dnd-kit/core";

interface SimpleDropZoneProps {
  position: number;
  isOccupied: boolean;
  occupiedBy?: string;
  imageUrl?: string | null;
  onRemove?: () => void;
}

/**
 * Minimal drop zone with image support
 * No complex animations or state
 */
export function SimpleDropZone({ position, isOccupied, occupiedBy, imageUrl, onRemove }: SimpleDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-${position}`,
    data: {
      type: 'grid-slot',
      position
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        relative aspect-square rounded-lg overflow-hidden
        border-2 border-dashed
        transition-all
        ${isOver
          ? 'border-cyan-400 bg-cyan-500/20 scale-105'
          : isOccupied
            ? 'border-gray-600 bg-gray-800'
            : 'border-gray-700 bg-gray-900/50'
        }
      `}
    >
      {/* Position label */}
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gray-800" />
          )}

          {/* Content overlay */}
          <div className="relative w-full h-full flex flex-col items-center justify-end p-2">
            <div className="text-xs text-white font-medium text-center mb-2 line-clamp-2">
              {occupiedBy}
            </div>
            {onRemove && (
              <button
                onClick={onRemove}
                className="px-2 py-1 text-[10px] bg-red-500/20 text-red-400 rounded hover:bg-red-500/40 transition-colors backdrop-blur-sm"
              >
                Remove
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs text-gray-600">Drop here</span>
        </div>
      )}
    </div>
  );
}
