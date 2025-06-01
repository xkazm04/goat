"use client";

import { GridItemType } from "@/app/types/match";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Star, Gamepad2, Trophy, X } from "lucide-react";

interface GridItemProps {
  item: GridItemType;
  index: number;
  onClick: () => void;
  isSelected: boolean;
  size?: 'small' | 'medium' | 'large';
}

const getItemIcon = (title: string) => {
  const lower = title.toLowerCase();
  if (lower.includes('game') || lower.includes('gta') || lower.includes('mario')) {
    return Gamepad2;
  }
  if (lower.includes('jordan') || lower.includes('lebron') || lower.includes('sport')) {
    return Trophy;
  }
  return Star;
};

export function GridItem({ item, index, onClick, isSelected, size = 'small' }: GridItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const IconComponent = getItemIcon(item.title);
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  const getRankNumberColor = (rank: number) => {
    if (rank === 0) return '#FFD700'; // Gold
    if (rank === 1) return '#C0C0C0'; // Silver  
    if (rank === 2) return '#CD7F32'; // Bronze
    return 'transparent'; // Default for other ranks
  };

  const rankColor = getRankNumberColor(index);

  // Size-specific styles
  const getSizeClasses = () => {
    switch (size) {
      case 'large':
        return {
          container: 'aspect-[3/4]',
          emptyNumber: 'text-6xl sm:text-7xl lg:text-8xl xl:text-9xl',
          avatar: 'w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20',
          icon: 'w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10',
          title: 'text-sm sm:text-base lg:text-lg xl:text-xl',
          rankSection: 'h-12 sm:h-14 lg:h-16',
          rankNumber: 'text-lg sm:text-xl lg:text-2xl xl:text-3xl',
          padding: 'p-4 lg:p-6'
        };
      case 'medium':
        return {
          container: 'aspect-[4/5]',
          emptyNumber: 'text-3xl sm:text-4xl lg:text-5xl',
          avatar: 'w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14',
          icon: 'w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7',
          title: 'text-xs sm:text-sm lg:text-base',
          rankSection: 'h-10 sm:h-12',
          rankNumber: 'text-sm sm:text-base lg:text-lg',
          padding: 'p-3'
        };
      default: // small
        return {
          container: 'aspect-[4/5]',
          emptyNumber: 'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl 3xl:text-8xl',
          avatar: 'w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 3xl:w-16 3xl:h-16',
          icon: 'w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 3xl:w-8 3xl:h-8',
          title: 'text-xs sm:text-sm lg:text-base 3xl:text-lg',
          rankSection: 'h-8 sm:h-10 lg:h-12 3xl:h-16',
          rankNumber: 'text-sm sm:text-base lg:text-lg 3xl:text-2xl',
          padding: 'p-3'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <motion.div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={onClick}
      className="touch-manipulation cursor-pointer"
      whileHover={{ scale: isDragging ? 1 : 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div
        className={`relative ${sizeClasses.container} rounded-xl border-2 overflow-hidden transition-all duration-300 group flex flex-col`}
      >
        {/* Empty State - Full Size Number */}
        {!item.matched && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span 
              className={`${sizeClasses.emptyNumber} font-black select-none`}
            >
              {index + 1}
            </span>
          </div>
        )}

        {/* Assigned State - Split Layout */}
        {item.matched && (
          <>
            {/* Top Section - Item Content */}
            <div className={`flex-1 relative ${sizeClasses.padding} flex flex-col items-center justify-center`}>
              {/* Avatar/Icon */}
              <div 
                className={`${sizeClasses.avatar} rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}
              >
                <IconComponent 
                  className={sizeClasses.icon}
                />
              </div>
              
              {/* Name */}
              <h3 
                className={`${sizeClasses.title} font-semibold text-center leading-tight line-clamp-2`}
              >
                {item.title}
              </h3>
            </div>

            {/* Bottom Section - Rank Number */}
            <div 
              className={`${sizeClasses.rankSection} flex items-center justify-center border-t`}
            >
              <span 
                className={`${sizeClasses.rankNumber} font-black`}
                style={{ color: rankColor }}
              >
                #{index + 1}
              </span>
            </div>
          </>
        )}

        {/* Hover Overlay for Assigned Items */}
        {item.matched && (
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
          >
            <div 
              className="text-xs font-medium px-2 py-1 rounded"
            >
              Remove
            </div>
          </div>
        )}

        {/* Hover Overlay for Empty Items */}
        {!item.matched && (
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
          >
            <div 
              className="text-xs font-medium px-2 py-1 rounded"
            >
              Assign Here
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}