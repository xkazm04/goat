"use client";

import { GridItemType } from "@/app/types/match";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Star, Gamepad2, Trophy } from "lucide-react";

interface GridItemProps {
  item: GridItemType;
  index: number;
  onClick?: () => void;
  isSelected?: boolean;
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
    disabled: item.isDragPlaceholder
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
    return '#94a3b8'; // Default slate color for dark theme
  };

  const rankColor = getRankNumberColor(index);

  // Enhanced size-specific styles with increased width and better responsive scaling
  const getSizeClasses = () => {
    switch (size) {
      case 'large':
        return {
          container: 'aspect-[3/4]',
          emptyNumber: 'text-6xl sm:text-7xl lg:text-8xl xl:text-9xl',
          avatar: 'w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24',
          icon: 'w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12',
          title: 'text-sm sm:text-base lg:text-lg xl:text-xl 2xl:text-2xl',
          rankSection: 'h-12 sm:h-14 lg:h-16 xl:h-18',
          rankNumber: 'text-lg sm:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl',
          padding: 'p-4 lg:p-6 xl:p-8'
        };
      case 'medium':
        return {
          container: 'aspect-[3/4]',
          emptyNumber: 'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl',
          avatar: 'w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 xl:w-20 xl:h-20',
          icon: 'w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 xl:w-10 xl:h-10',
          title: 'text-xs sm:text-sm lg:text-base xl:text-lg 2xl:text-xl',
          rankSection: 'h-10 sm:h-12 lg:h-14 xl:h-16',
          rankNumber: 'text-sm sm:text-base lg:text-lg xl:text-xl 2xl:text-2xl',
          padding: 'p-3 lg:p-4 xl:p-6'
        };
      default: // small - Enhanced for better information display
        return {
          container: 'aspect-[5/6]', // Slightly wider aspect ratio
          emptyNumber: 'text-3xl sm:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl 3xl:text-8xl',
          avatar: 'w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 xl:w-20 xl:h-20 2xl:w-24 2xl:h-24',
          icon: 'w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12',
          title: 'text-xs sm:text-sm lg:text-base xl:text-lg 2xl:text-xl 3xl:text-2xl',
          rankSection: 'h-10 sm:h-12 lg:h-14 xl:h-16 2xl:h-18',
          rankNumber: 'text-sm sm:text-base lg:text-lg xl:text-xl 2xl:text-2xl',
          padding: 'p-3 sm:p-4 lg:p-5 xl:p-6 2xl:p-8'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  // Empty placeholder with transparent rank number
  if (item.isDragPlaceholder || !item.matched) {
    return (
      <motion.div style={style} layout>
        <div 
          className={`relative ${sizeClasses.container} rounded-xl border-2 border-dashed overflow-hidden transition-all duration-300 flex flex-col opacity-60 hover:opacity-80`}
          style={{
            background: 'rgba(71, 85, 105, 0.15)',
            border: '2px dashed rgba(71, 85, 105, 0.4)'
          }}
        >
          {/* Large transparent rank number background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span 
              className={`${sizeClasses.emptyNumber} font-black select-none`}
              style={{ 
                color: 'rgba(148, 163, 184, 0.15)',
                textShadow: '0 0 10px rgba(148, 163, 184, 0.1)'
              }}
            >
              {index + 1}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={onClick}
      className="touch-manipulation cursor-pointer"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div
        className={`relative ${sizeClasses.container} rounded-xl border-2 overflow-hidden transition-all duration-300 flex flex-col group ${
          isSelected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-800' : ''
        }`}
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(30, 41, 59, 0.9) 0%,
              rgba(51, 65, 85, 0.95) 100%
            )
          `,
          border: isSelected 
            ? '2px solid rgba(59, 130, 246, 0.6)'
            : '2px solid rgba(71, 85, 105, 0.4)',
          boxShadow: isSelected
            ? '0 8px 30px rgba(59, 130, 246, 0.3)'
            : '0 4px 15px rgba(0, 0, 0, 0.2)'
        }}
      >
        {/* Transparent rank number background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
          <span 
            className={`${sizeClasses.emptyNumber} font-black select-none`}
            style={{ color: rankColor }}
          >
            {index + 1}
          </span>
        </div>

        {/* Main Content */}
        <div className={`flex-1 relative ${sizeClasses.padding} flex flex-col items-center justify-center z-10`}>
          {/* Avatar/Icon */}
          <div 
            className={`${sizeClasses.avatar} rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
            style={{
              background: `
                linear-gradient(135deg, 
                  #4c1d95 0%, 
                  #7c3aed 50%,
                  #3b82f6 100%
                )
              `,
              boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)'
            }}
          >
            <IconComponent 
              className={`${sizeClasses.icon} text-white`}
            />
          </div>
          
          {/* Name with better spacing */}
          <h3 
            className={`${sizeClasses.title} font-semibold text-center leading-tight line-clamp-2 text-slate-200 max-w-full px-1`}
          >
            {item.title}
          </h3>

          {/* Additional info could go here in the future */}
          <div className="mt-2 flex flex-wrap gap-1 justify-center">
            {/* Category tags, stats, etc. could be added here */}
          </div>
        </div>

        {/* Bottom Section - Rank Number */}
        <div 
          className={`${sizeClasses.rankSection} flex items-center justify-center border-t relative z-10`}
          style={{
            borderColor: 'rgba(71, 85, 105, 0.4)',
            background: `
              linear-gradient(135deg, 
                rgba(15, 23, 42, 0.8) 0%,
                rgba(30, 41, 59, 0.9) 100%
              )
            `
          }}
        >
          <span 
            className={`${sizeClasses.rankNumber} font-black`}
            style={{ color: rankColor }}
          >
            #{index + 1}
          </span>
        </div>
      </div>
    </motion.div>
  );
}