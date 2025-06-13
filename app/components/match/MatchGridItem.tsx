"use client";

import { GridItemType } from "@/app/types/match";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Star, Gamepad2, Trophy } from "lucide-react";
import { useState, useEffect } from "react";
import { useItemStore } from "@/app/stores/item-store";
import MatchGridItemControls from "@/app/features/Match/MatchGridItemControls";
import { useSizeClasses } from "@/app/config/matchStructure";
import Image from "next/image";

interface MatchGridItemProps {
  item: GridItemType;
  index: number;
  onClick?: () => void;
  isSelected?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const getItemIcon = (title: string | undefined) => {
  if (!title) return Star; // Default icon if title is undefined
  
  const lower = title.toLowerCase();
  if (lower.includes('game') || lower.includes('gta') || lower.includes('mario')) {
    return Gamepad2;
  }
  if (lower.includes('jordan') || lower.includes('lebron') || lower.includes('sport')) {
    return Trophy;
  }
  return Star;
};

export function MatchGridItem({ item, index, onClick, isSelected, size = 'small' }: MatchGridItemProps) {
  const { activeItem } = useItemStore();
  const [isBeingDraggedOver, setIsBeingDraggedOver] = useState(false);
  
  // Check if this is a grid-to-grid drag operation
  const isDraggingGridItem = activeItem && activeItem.startsWith('grid-');
  const isDraggingThisItem = activeItem === item.id;
  
  const { attributes, listeners, setNodeRef: setDragNodeRef, transform, transition, isDragging } = useDraggable({
    id: item.id,
    disabled: !item.matched,
    data: {
      type: 'grid-item',
      item: item,
      index: index
    }
  });

  const { isOver, setNodeRef: setDropNodeRef } = useDroppable({
    id: `grid-${index}`,
    disabled: !item.matched || isDraggingThisItem,
    data: {
      type: 'grid-slot',
      index: index,
      position: index,
      accepts: ['grid-item', 'backlog-item']
    }
  });

  // Combine refs
  const setNodeRef = (node: HTMLElement | null) => {
    setDragNodeRef(node);
    setDropNodeRef(node);
  };

  const sizeClasses = useSizeClasses(size);
  
  // Enhanced visual feedback during drag operations
  useEffect(() => {
    if (isOver && ((isDraggingGridItem && !isDraggingThisItem) || (activeItem && !activeItem.startsWith('grid-')))) {
      setIsBeingDraggedOver(true);
    } else {
      setIsBeingDraggedOver(false);
    }
  }, [isOver, isDraggingGridItem, isDraggingThisItem, activeItem]);
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition || 'transform 0.2s ease-out',
    zIndex: isDragging ? 50 : isBeingDraggedOver ? 40 : 1,
    opacity: isDragging ? 0.7 : 1,
  };

  const getRankNumberColor = (rank: number) => {
    if (rank === 0) return '#FFD700'; // Gold
    if (rank === 1) return '#C0C0C0'; // Silver  
    if (rank === 2) return '#CD7F32'; // Bronze
    return '#94a3b8'; // Default slate color
  };

  const rankColor = getRankNumberColor(index);

  return (
    <motion.div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="touch-manipulation cursor-grab active:cursor-grabbing relative group"
      whileHover={{ scale: isDragging ? 1 : 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
      layoutId={`grid-item-${item.id}`}
      animate={{
        scale: isBeingDraggedOver ? 1.05 : 1,
        rotateY: isBeingDraggedOver ? 5 : 0,
      }}
      transition={{
        scale: { duration: 0.2 },
        rotateY: { duration: 0.3 }
      }}
    >
      <div
        className={`relative ${sizeClasses.container} ${sizeClasses.fixedHeight} rounded-xl border-2 overflow-hidden transition-all duration-300 flex flex-col ${
          isSelected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-800' : ''
        }`}
        style={{
          background: isBeingDraggedOver
            ? `linear-gradient(135deg, 
                rgba(59, 130, 246, 0.2) 0%,
                rgba(147, 51, 234, 0.2) 100%
              )`
            : `linear-gradient(135deg, 
                rgba(30, 41, 59, 0.9) 0%,
                rgba(51, 65, 85, 0.95) 100%
              )`,
          border: isBeingDraggedOver
            ? '2px solid rgba(59, 130, 246, 0.8)'
            : isSelected 
            ? '2px solid rgba(59, 130, 246, 0.6)'
            : '2px solid rgba(71, 85, 105, 0.4)',
          boxShadow: isBeingDraggedOver
            ? '0 0 25px rgba(59, 130, 246, 0.5)'
            : isSelected
            ? '0 8px 30px rgba(59, 130, 246, 0.3)'
            : isDragging
            ? '0 12px 40px rgba(0, 0, 0, 0.4)'
            : '0 4px 15px rgba(0, 0, 0, 0.2)'
        }}
      >
        <MatchGridItemControls 
          sizeClasses={sizeClasses} 
          onClick={onClick}
          isDragging={isDragging}
          isBeingDraggedOver={isBeingDraggedOver}
        />

        {/* Background rank number with enhanced visibility during interactions */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
          <span 
            className={`${sizeClasses.emptyNumber} font-black select-none transition-colors`}
            style={{ 
              color: isBeingDraggedOver ? '#3b82f6' : rankColor,
              opacity: isBeingDraggedOver ? 0.2 : 0.5
            }}
          >
            {index + 1}
          </span>
        </div>

        {/* Main Content with enhanced animations and portrait layout */}
        <motion.div 
          className={`flex-1 relative ${sizeClasses.padding} flex flex-col items-center justify-center z-10 min-h-0`}
          animate={{
            scale: isDragging ? 0.95 : 1,
            rotateX: isBeingDraggedOver ? 10 : 0
          }}
          transition={{ duration: 0.2 }}
        >
          {/* Enhanced Avatar with portrait ratio */}
          <motion.div 
            className={`${sizeClasses.avatar} rounded-lg flex items-center justify-center mb-2 flex-shrink-0 overflow-hidden`}
            style={{
              background: isBeingDraggedOver
                ? `linear-gradient(135deg, 
                    #3b82f6 0%, 
                    #8b5cf6 50%,
                    #06b6d4 100%
                  )`
                : `linear-gradient(135deg, 
                    #4c1d95 0%, 
                    #7c3aed 50%,
                    #3b82f6 100%
                  )`,
              boxShadow: isBeingDraggedOver
                ? '0 6px 20px rgba(59, 130, 246, 0.6)'
                : '0 4px 12px rgba(124, 58, 237, 0.4)',
              borderRadius: '8px',
              position: 'relative'
            }}
            animate={{
              scale: isDragging ? 0.9 : isBeingDraggedOver ? 1.1 : 1,
              rotate: isDragging ? 5 : 0
            }}
            transition={{ duration: 0.2 }}
          >
            {item.image_url ? (
              <Image 
                src={item.image_url}
                alt={item.title || ''}
                fill
                className="object-cover"
                sizes={`(max-width: 768px) 32px, 48px`}
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  
                  const IconComponent = getItemIcon(item.title);
                  const icon = document.createElement('div');
                  icon.className = `${sizeClasses.icon} text-white flex items-center justify-center`;
                  icon.innerHTML = IconComponent.toString();
                  e.currentTarget.parentElement?.appendChild(icon);
                }}
              />
            ) : (
              (() => {
                const IconComponent = getItemIcon(item.title);
                return <IconComponent className={`${sizeClasses.icon} text-white`} />;
              })()
            )}
          </motion.div>
          
          {/* Enhanced Title with fixed height for consistent layout */}
          <div className={`w-full text-center ${sizeClasses.titleHeight} flex items-center justify-center`}>
            <h3 
              className={`${sizeClasses.title} text-slate-200 max-w-full px-1 transition-colors`}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: size === 'large' ? 3 : 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                wordBreak: 'break-word',
                hyphens: 'auto',
                color: isBeingDraggedOver ? '#3b82f6' : '#e2e8f0'
              }}
              title={item.title}
            >
              {item.title}
            </h3>
          </div>
        </motion.div>

        {/* Enhanced Rank Section */}
        <div 
          className={`${sizeClasses.rankSection} flex items-center justify-center border-t relative z-10 flex-shrink-0 transition-all duration-300`}
          style={{
            borderColor: isBeingDraggedOver ? 'rgba(59, 130, 246, 0.6)' : 'rgba(71, 85, 105, 0.4)',
            background: isBeingDraggedOver
              ? `linear-gradient(135deg, 
                  rgba(59, 130, 246, 0.2) 0%,
                  rgba(30, 41, 59, 0.9) 100%
                )`
              : `linear-gradient(135deg, 
                  rgba(15, 23, 42, 0.8) 0%,
                  rgba(30, 41, 59, 0.9) 100%
                )`
          }}
        >
          <motion.span 
            className={`${sizeClasses.rankNumber} font-black transition-colors`}
            style={{ 
              color: isBeingDraggedOver ? '#3b82f6' : rankColor 
            }}
            animate={{
              scale: isBeingDraggedOver ? 1.1 : 1
            }}
            transition={{ duration: 0.2 }}
          >
            #{index + 1}
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
}