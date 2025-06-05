"use client";

import { GridItemType } from "@/app/types/match";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Star, Gamepad2, Trophy, X, GripVertical } from "lucide-react";

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

// Size configuration hook
const useSizeClasses = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'large':
      return {
        container: 'w-full h-full',
        fixedHeight: 'h-44 lg:h-48 xl:h-52', // Increased height
        emptyNumber: 'text-8xl lg:text-9xl xl:text-[10rem]',
        avatar: 'w-16 h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24',
        icon: 'w-8 h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12',
        title: 'text-sm lg:text-base xl:text-lg font-bold leading-tight',
        rankSection: 'h-12 lg:h-14 xl:h-16',
        rankNumber: 'text-xl lg:text-2xl xl:text-3xl',
        padding: 'p-4 lg:p-5 xl:p-6',
        removeButton: 'w-7 h-7 lg:w-8 lg:h-8',
        removeIcon: 'w-3.5 h-3.5 lg:w-4 lg:h-4',
        dragHandle: 'w-5 h-5 lg:w-6 lg:h-6'
      };
    case 'medium':
      return {
        container: 'w-full h-full',
        fixedHeight: 'h-36 lg:h-40 xl:h-44', // Increased height
        emptyNumber: 'text-6xl lg:text-7xl xl:text-8xl',
        avatar: 'w-12 h-12 lg:w-16 lg:h-16 xl:w-18 xl:h-18',
        icon: 'w-6 h-6 lg:w-8 lg:h-8 xl:w-9 xl:h-9',
        title: 'text-xs lg:text-sm xl:text-base font-semibold leading-tight',
        rankSection: 'h-10 lg:h-12 xl:h-14',
        rankNumber: 'text-base lg:text-lg xl:text-xl',
        padding: 'p-3 lg:p-4 xl:p-5',
        removeButton: 'w-6 h-6 lg:w-7 lg:h-7',
        removeIcon: 'w-3 h-3 lg:w-3.5 lg:h-3.5',
        dragHandle: 'w-4 h-4 lg:w-5 lg:h-5'
      };
    default: // small
      return {
        container: 'w-full h-full',
        fixedHeight: 'h-28 sm:h-32 lg:h-36 xl:h-40', // Increased height
        emptyNumber: 'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl',
        avatar: 'w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14',
        icon: 'w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7',
        title: 'text-xs sm:text-xs lg:text-sm xl:text-sm font-medium leading-tight',
        rankSection: 'h-7 sm:h-8 lg:h-9 xl:h-10',
        rankNumber: 'text-xs sm:text-sm lg:text-base xl:text-base',
        padding: 'p-2 sm:p-2.5 lg:p-3 xl:p-3.5',
        removeButton: 'w-5 h-5 sm:w-6 sm:h-6',
        removeIcon: 'w-2.5 h-2.5 sm:w-3 h-3',
        dragHandle: 'w-3 h-3 sm:w-3.5 h-3.5'
      };
  }
};

// Background rank number component
const BackgroundRankNumber = ({ 
  index, 
  sizeClasses, 
  rankColor 
}: { 
  index: number; 
  sizeClasses: any; 
  rankColor: string; 
}) => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
    <span 
      className={`${sizeClasses.emptyNumber} font-black select-none`}
      style={{ color: rankColor }}
    >
      {index + 1}
    </span>
  </div>
);

// Empty placeholder component
const EmptyGridSlot = ({ 
  index, 
  sizeClasses, 
  style 
}: { 
  index: number; 
  sizeClasses: any; 
  style: any; 
}) => (
  <motion.div style={style} layout>
    <div 
      className={`relative ${sizeClasses.container} ${sizeClasses.fixedHeight} rounded-xl border-2 border-dashed overflow-hidden transition-all duration-300 flex flex-col opacity-80 hover:opacity-100`} // Increased opacity
      style={{
        background: 'rgba(71, 85, 105, 0.25)', // More visible background
        border: '2px dashed rgba(71, 85, 105, 0.6)' // More visible border
      }}
    >
      {/* Large transparent rank number background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span 
          className={`${sizeClasses.emptyNumber} font-black select-none`}
          style={{ 
            color: 'rgba(148, 163, 184, 0.25)', // More visible
            textShadow: '0 0 15px rgba(148, 163, 184, 0.15)'
          }}
        >
          {index + 1}
        </span>
      </div>
      
      {/* Add subtle "Drop here" text for better UX */}
      <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
        <span className="text-xs text-slate-500 opacity-70">
          Drop here
        </span>
      </div>
    </div>
  </motion.div>
);

// Control buttons component
const GridItemControls = ({ 
  sizeClasses, 
  onClick 
}: { 
  sizeClasses: any; 
  onClick?: () => void; 
}) => (
  <>
    {/* Drag Handle Indicator */}
    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-70 transition-opacity z-10">
      <GripVertical 
        className={`${sizeClasses.dragHandle} text-slate-400`} 
      />
    </div>

    {/* Remove Button */}
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`absolute top-2 right-2 ${sizeClasses.removeButton} rounded-full bg-red-500/80 hover:bg-red-500 transition-all duration-200 opacity-0 group-hover:opacity-100 z-20 flex items-center justify-center backdrop-blur-sm hover:scale-110`}
      title="Remove from ranking"
    >
      <X className={`${sizeClasses.removeIcon} text-white`} />
    </button>
  </>
);

// Avatar component
const GridItemAvatar = ({ 
  title, 
  sizeClasses 
}: { 
  title: string; 
  sizeClasses: any; 
}) => {
  const IconComponent = getItemIcon(title);
  
  return (
    <div 
      className={`${sizeClasses.avatar} rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform flex-shrink-0`}
      style={{
        background: `
          linear-gradient(135deg, 
            #4c1d95 0%, 
            #7c3aed 50%,
            #3b82f6 100%
          )
        `,
        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)'
      }}
    >
      <IconComponent 
        className={`${sizeClasses.icon} text-white`}
      />
    </div>
  );
};

// Title component with consistent truncation
const GridItemTitle = ({ 
  title, 
  sizeClasses, 
  size 
}: { 
  title: string; 
  sizeClasses: any; 
  size: 'small' | 'medium' | 'large'; 
}) => (
  <div className="w-full text-center flex-1 flex items-center justify-center min-h-0">
    <h3 
      className={`${sizeClasses.title} text-slate-200 max-w-full px-1 line-clamp-2`}
      style={{
        display: '-webkit-box',
        WebkitLineClamp: size === 'large' ? 3 : 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        wordBreak: 'break-word',
        hyphens: 'auto',
        height: size === 'large' ? '3.5rem' : size === 'medium' ? '2.5rem' : '2rem',
        lineHeight: size === 'large' ? '1.2rem' : size === 'medium' ? '1rem' : '0.8rem'
      }}
      title={title} // Tooltip for full name
    >
      {title}
    </h3>
  </div>
);

// Rank section component
const GridItemRankSection = ({ 
  index, 
  sizeClasses, 
  rankColor 
}: { 
  index: number; 
  sizeClasses: any; 
  rankColor: string; 
}) => (
  <div 
    className={`${sizeClasses.rankSection} flex items-center justify-center border-t relative z-10 flex-shrink-0`}
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
);

// Main GridItem component
export function GridItem({ item, index, onClick, isSelected, size = 'small' }: GridItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useDraggable({
    id: item.id,
    disabled: item.isDragPlaceholder || !item.matched
  });

  const sizeClasses = useSizeClasses(size);
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const getRankNumberColor = (rank: number) => {
    if (rank === 0) return '#FFD700'; // Gold
    if (rank === 1) return '#C0C0C0'; // Silver  
    if (rank === 2) return '#CD7F32'; // Bronze
    return '#94a3b8'; // Default slate color
  };

  const rankColor = getRankNumberColor(index);

  // Empty placeholder
  if (item.isDragPlaceholder || !item.matched) {
    return <EmptyGridSlot index={index} sizeClasses={sizeClasses} style={style} />;
  }

  return (
    <motion.div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="touch-manipulation cursor-grab active:cursor-grabbing relative group"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div
        className={`relative ${sizeClasses.container} ${sizeClasses.fixedHeight} rounded-xl border-2 overflow-hidden transition-all duration-300 flex flex-col ${
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
            : isDragging
            ? '0 12px 40px rgba(0, 0, 0, 0.4)'
            : '0 4px 15px rgba(0, 0, 0, 0.2)'
        }}
      >
        <GridItemControls sizeClasses={sizeClasses} onClick={onClick} />
        <BackgroundRankNumber index={index} sizeClasses={sizeClasses} rankColor={rankColor} />

        {/* Main Content */}
        <div className={`flex-1 relative ${sizeClasses.padding} flex flex-col items-center justify-center z-10 min-h-0`}>
          <GridItemAvatar title={item.title} sizeClasses={sizeClasses} />
          <GridItemTitle title={item.title} sizeClasses={sizeClasses} size={size} />
        </div>

        <GridItemRankSection index={index} sizeClasses={sizeClasses} rankColor={rankColor} />
      </div>
    </motion.div>
  );
}