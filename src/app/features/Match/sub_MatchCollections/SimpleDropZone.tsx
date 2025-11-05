"use client";

import { useDroppable } from "@dnd-kit/core";

interface SimpleDropZoneProps {
  position: number;
  isOccupied: boolean;
  occupiedBy?: string;
  onRemove?: () => void;
}

/**
 * Minimal drop zone - just accepts drops
 * No complex animations or state
 */
export function SimpleDropZone({ position, isOccupied, occupiedBy, onRemove }: SimpleDropZoneProps) {
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
        relative aspect-square rounded-lg
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
      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-gray-800/80 rounded text-[10px] font-semibold text-gray-400">
        #{position + 1}
      </div>

      {/* Content */}
      {isOccupied && occupiedBy ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-2">
          <div className="text-xs text-white font-medium text-center mb-2">
            {occupiedBy}
          </div>
          {onRemove && (
            <button
              onClick={onRemove}
              className="px-2 py-1 text-[10px] bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs text-gray-600">Drop here</span>
        </div>
      )}
    </div>
  );
}
