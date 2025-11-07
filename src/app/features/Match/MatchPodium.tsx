"use client";

import { useGridStore } from "@/stores/grid-store";
import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";

interface MatchGridPodiumProps {
  maxItems: number;
}

/**
 * MatchGridPodium - Main grid display component for the Match feature
 * Renders drop zones for grid positions with podium-style layout
 */
export function MatchGridPodium({ maxItems }: MatchGridPodiumProps) {
  const gridItems = useGridStore((state) => state.gridItems);

  return (
    <div className="w-full p-6 space-y-6">
      {/* Top 3 Podium */}
      {maxItems >= 3 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Top 3</h3>
          <div className="flex justify-center gap-6">
            {/* 2nd Place (Left) */}
            <GridSlot position={1} item={gridItems[1]} size="medium" />

            {/* 1st Place (Center, Larger) */}
            <GridSlot position={0} item={gridItems[0]} size="large" />

            {/* 3rd Place (Right) */}
            <GridSlot position={2} item={gridItems[2]} size="medium" />
          </div>
        </div>
      )}

      {/* Positions 4-10 */}
      {maxItems >= 4 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            Positions 4-{Math.min(10, maxItems)}
          </h3>
          <div className="grid grid-cols-7 gap-3">
            {gridItems.slice(3, Math.min(10, maxItems)).map((item, idx) => (
              <GridSlot key={3 + idx} position={3 + idx} item={item} size="small" />
            ))}
          </div>
        </div>
      )}

      {/* Positions 11-20 */}
      {maxItems > 10 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            Positions 11-{Math.min(20, maxItems)}
          </h3>
          <div className="grid grid-cols-10 gap-3">
            {gridItems.slice(10, Math.min(20, maxItems)).map((item, idx) => (
              <GridSlot key={10 + idx} position={10 + idx} item={item} size="small" />
            ))}
          </div>
        </div>
      )}

      {/* Positions 21+ */}
      {maxItems > 20 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            Positions 21-{maxItems}
          </h3>
          <div className="grid grid-cols-10 gap-3">
            {gridItems.slice(20, maxItems).map((item, idx) => (
              <GridSlot key={20 + idx} position={20 + idx} item={item} size="small" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface GridSlotProps {
  position: number;
  item: any;
  size: "small" | "medium" | "large";
}

/**
 * GridSlot - Individual droppable grid position
 */
function GridSlot({ position, item, size }: GridSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `grid-${position}`,
    data: {
      type: "grid-slot",
      position: position,
    },
  });

  const isOccupied = item?.matched;

  const sizeClasses = {
    small: "w-20 h-20",
    medium: "w-28 h-28",
    large: "w-36 h-36",
  };

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: position * 0.02 }}
      className={`
        ${sizeClasses[size]}
        relative rounded-lg border-2 transition-all duration-200
        ${
          isOver
            ? "border-blue-500 bg-blue-500/10 scale-105"
            : "border-gray-700 bg-gray-800/50"
        }
        ${isOccupied ? "border-green-500" : ""}
        hover:border-gray-600 hover:bg-gray-800/70
        flex flex-col items-center justify-center
      `}
      data-testid={`grid-slot-${position}`}
    >
      {/* Position Number */}
      <div className="absolute top-1 left-1 text-xs text-gray-500 font-mono">
        #{position + 1}
      </div>

      {/* Item Content */}
      {isOccupied ? (
        <div className="w-full h-full p-1 flex flex-col items-center justify-center">
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.title || ""}
              className="w-full h-full object-cover rounded"
            />
          )}
          {!item.image_url && (
            <div className="text-center text-xs text-gray-300 px-1 break-words">
              {item.title || item.name || "Untitled"}
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-600 text-sm">Drop here</div>
      )}
    </motion.div>
  );
}
