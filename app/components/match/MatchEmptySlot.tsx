"use client";

import { motion } from "framer-motion";
import { ChevronsDownIcon } from "lucide-react";
import MatchDroppable from "./MatchDroppable";

interface MatchEmptySlotProps {
  position: number;
  size?: 'small' | 'medium' | 'large';
  selectedBacklogItem: string | null;
  isDraggingBacklogItem: boolean;
  canAddAtPosition: (position: number) => boolean;
}

const MatchEmptySlot = ({ 
  position, 
  size = 'medium',
  selectedBacklogItem,
  isDraggingBacklogItem,
  canAddAtPosition
}: MatchEmptySlotProps) => {
  
  const getSizeClasses = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'large':
        return {
          container: 'w-full h-full',
          fixedHeight: 'h-52 lg:h-56 xl:h-60',
          emptyNumber: 'text-8xl lg:text-9xl xl:text-[10rem]',
          padding: 'p-4 lg:p-5 xl:p-6'
        };
      case 'medium':
        return {
          container: 'w-full h-full',
          fixedHeight: 'h-40 lg:h-44 xl:h-48',
          emptyNumber: 'text-6xl lg:text-7xl xl:text-8xl',
          padding: 'p-3 lg:p-4 xl:p-5'
        };
      default: // small
        return {
          container: 'w-full h-full',
          fixedHeight: 'h-32 sm:h-36 lg:h-40 xl:h-44',
          emptyNumber: 'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl',
          padding: 'p-2 sm:p-2.5 lg:p-3 xl:p-3.5'
        };
    }
  };

  const sizeClasses = getSizeClasses(size);

  const getRankNumberColor = (rank: number) => {
    if (rank === 0) return '#FFD700'; // Gold
    if (rank === 1) return '#C0C0C0'; // Silver  
    if (rank === 2) return '#CD7F32'; // Bronze
    return '#94a3b8'; // Default slate color
  };

  const rankColor = getRankNumberColor(position);

  return (
    <MatchDroppable
      position={position}
      size={size}
      isDraggingBacklogItem={isDraggingBacklogItem}
      selectedBacklogItem={selectedBacklogItem}
      canAddAtPosition={canAddAtPosition}
    >
      <div
        className={`relative ${sizeClasses.container} ${sizeClasses.fixedHeight} rounded-xl border-2 border-dashed border-slate-600/50 bg-slate-800/30 transition-all duration-300 flex items-center justify-center overflow-hidden`}
      >
        <div className="absolute top-10 opacity-40">
          <ChevronsDownIcon />
        </div>
        {/* Large rank number background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.span 
            className={`${sizeClasses.emptyNumber} font-black select-none transition-colors opacity-20`}
            style={{ color: rankColor }}
            animate={{
              scale: isDraggingBacklogItem ? [1, 1.05, 1] : 1,
              opacity: isDraggingBacklogItem ? [0.2, 0.4, 0.2] : 0.2
            }}
            transition={{
              duration: isDraggingBacklogItem ? 2 : 0,
              repeat: isDraggingBacklogItem ? Infinity : 0,
              ease: "easeInOut"
            }}
          >
            {position + 1}
          </motion.span>
        </div>
      </div>
    </MatchDroppable>
  );
};

export default MatchEmptySlot;