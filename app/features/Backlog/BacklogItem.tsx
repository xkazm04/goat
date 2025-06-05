"use client";

import { BacklogItemType } from "@/app/types/match";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Star, Gamepad2, Trophy, GripVertical } from "lucide-react";
import { ContextMenu } from "./ContextMenu";
import { useState } from "react";
import { useItemStore } from "@/app/stores/item-store";

interface BacklogItemProps {
  item: BacklogItemType;
  isDragOverlay?: boolean;
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

export function BacklogItem({ item, isDragOverlay = false }: BacklogItemProps) {
  const { 
    selectedBacklogItem, 
    setSelectedBacklogItem,
    removeItemFromGroup,
    toggleCompareItem,
    compareList,
    getNextAvailableGridPosition,
    assignItemToGrid
  } = useItemStore();
  
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
  }>({ isOpen: false, position: { x: 0, y: 0 } });
  
  // Fixed: Ensure draggable works correctly
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled: item.matched || isDragOverlay,
    data: {
      type: 'backlog-item',
      item: item
    }
  });
  
  // Fixed: Use CSS Transform instead of Translate
  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : item.matched ? 0.4 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const IconComponent = getItemIcon(item.title);
  const isSelected = selectedBacklogItem === item.id;
  const isInCompareList = compareList.some(compareItem => compareItem.id === item.id);

  const handleClick = () => {
    if (!item.matched && !isDragOverlay) {
      if (isSelected) {
        setSelectedBacklogItem(null);
      } else {
        setSelectedBacklogItem(item.id);
      }
    }
  };

  const handleDoubleClick = () => {
    if (!item.matched && !isDragOverlay) {
      // Quick assign to next available position
      const nextPosition = getNextAvailableGridPosition();
      if (nextPosition !== null) {
        assignItemToGrid(item, nextPosition);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (item.matched || isDragOverlay) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const handleRemoveItem = () => {
    removeItemFromGroup(item.id);
  };

  const handleToggleCompare = () => {
    toggleCompareItem(item);
  };

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 } });
  };

  return (
    <>
      <motion.div
        layout
        whileHover={{ scale: item.matched || isDragOverlay ? 1 : 1.05 }}
        whileTap={{ scale: item.matched || isDragOverlay ? 1 : 0.95 }}
      >
        <div
          ref={setNodeRef}
          style={style}
          {...(item.matched || isDragOverlay ? {} : { ...attributes, ...listeners })}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          className={`relative aspect-square rounded-xl border-2 overflow-hidden transition-all duration-300 group ${
            item.matched || isDragOverlay ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
          } ${isDragOverlay ? 'pointer-events-none' : ''} ${isDragging ? 'z-50' : ''}`}
          style={{
            background: item.matched 
              ? 'rgba(71, 85, 105, 0.3)'
              : isSelected
              ? `linear-gradient(135deg, 
                  rgba(59, 130, 246, 0.2) 0%,
                  rgba(147, 51, 234, 0.2) 100%
                )`
              : `linear-gradient(135deg, 
                  rgba(30, 41, 59, 0.9) 0%,
                  rgba(51, 65, 85, 0.95) 100%
                )`,
            border: isDragOverlay
              ? '2px solid rgba(59, 130, 246, 0.8)'
              : isSelected 
              ? '2px solid rgba(59, 130, 246, 0.6)'
              : item.matched
              ? '2px solid rgba(71, 85, 105, 0.4)'
              : isInCompareList
              ? '2px solid rgba(34, 197, 94, 0.6)'
              : '2px solid rgba(71, 85, 105, 0.3)',
            boxShadow: isDragOverlay
              ? '0 0 30px rgba(59, 130, 246, 0.5)'
              : isSelected
              ? '0 0 20px rgba(59, 130, 246, 0.3)'
              : isInCompareList
              ? '0 0 15px rgba(34, 197, 94, 0.3)'
              : item.matched
              ? 'none'
              : isDragging
              ? '0 8px 25px rgba(0, 0, 0, 0.4)'
              : '0 2px 8px rgba(0, 0, 0, 0.3)',
            ...style // Apply the transform and other styles
          }}
        >
          {/* Drag Handle Indicator */}
          {!item.matched && !isDragOverlay && (
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-70 transition-opacity z-10">
              <GripVertical 
                className="w-4 h-4 text-slate-400" 
              />
            </div>
          )}

          {/* Selection Indicator */}
          {isSelected && !isDragOverlay && (
            <div 
              className="absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-blue-400 bg-blue-400 z-10"
            />
          )}

          {/* Compare List Indicator */}
          {isInCompareList && !isSelected && !isDragOverlay && (
            <div 
              className="absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-green-400 bg-green-400 z-10"
            />
          )}

          {/* Matched Indicator */}
          {item.matched && (
            <div 
              className="absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-green-400 bg-green-400 z-10"
            />
          )}

          {/* Avatar/Icon */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
            <div 
              className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform ${
                item.matched ? 'opacity-50' : ''
              }`}
              style={{
                background: item.matched
                  ? 'rgba(71, 85, 105, 0.5)'
                  : `linear-gradient(135deg, 
                      #4c1d95 0%, 
                      #7c3aed 50%,
                      #3b82f6 100%
                    )`,
                boxShadow: item.matched ? 'none' : '0 2px 8px rgba(124, 58, 237, 0.3)'
              }}
            >
              <IconComponent 
                className={`w-6 h-6 ${item.matched ? 'text-slate-500' : 'text-white'}`}
              />
            </div>
            
            {/* Name */}
            <h4 
              className={`text-xs font-semibold text-center leading-tight line-clamp-2 ${
                item.matched ? 'text-slate-500' : 'text-slate-200'
              }`}
            >
              {item.title}
            </h4>
          </div>

          {/* Hover Overlay for Available Items */}
          {!item.matched && !isDragOverlay && !isDragging && (
            <div 
              className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center ${
                isSelected ? 'bg-blue-500/10' : isInCompareList ? 'bg-green-500/10' : 'bg-black/20'
              }`}
            >
              <div 
                className="text-xs font-medium px-2 py-1 rounded text-center"
                style={{
                  background: isSelected 
                    ? 'rgba(59, 130, 246, 0.8)'
                    : isInCompareList
                    ? 'rgba(34, 197, 94, 0.8)'
                    : 'rgba(71, 85, 105, 0.8)',
                  color: 'white',
                  backdropFilter: 'blur(4px)'
                }}
              >
                {isSelected ? (
                  <div>
                    <div>Press 1-9 or 0</div>
                    <div className="text-xs opacity-80">for positions 1-10</div>
                  </div>
                ) : isInCompareList ? (
                  'In compare list'
                ) : (
                  <div>
                    <div>Drag to rank</div>
                    <div className="text-xs opacity-80">or select first</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Matched Overlay */}
          {item.matched && (
            <div 
              className="absolute inset-0 flex items-center justify-center"
            >
              <div 
                className="text-xs font-medium px-2 py-1 rounded text-green-200"
                style={{
                  background: 'rgba(34, 197, 94, 0.8)',
                  backdropFilter: 'blur(4px)'
                }}
              >
                Ranked
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={closeContextMenu}
        onRemove={handleRemoveItem}
        onToggleCompare={handleToggleCompare}
        isInCompareList={isInCompareList}
      />
    </>
  );
}