"use client";

import { BacklogItemType } from "@/app/types/match";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMatchStore } from "@/app/stores/match-store";
import { motion } from "framer-motion";
import { Star, Gamepad2, Trophy, GripVertical } from "lucide-react";

interface BacklogItemProps {
  item: BacklogItemType;
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

export function BacklogItem({ item }: BacklogItemProps) {
  const { 
    selectedBacklogItem, 
    setSelectedBacklogItem,
  } = useMatchStore();
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled: item.matched,
  });
  
  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  const IconComponent = getItemIcon(item.title);

  const handleClick = () => {
    if (!item.matched) {
      if (selectedBacklogItem === item.id) {
        setSelectedBacklogItem(null);
      } else {
        setSelectedBacklogItem(item.id);
      }
    }
  };

  return (
    <motion.div
      whileHover={{ scale: item.matched ? 1 : 1.05 }}
      whileTap={{ scale: item.matched ? 1 : 0.95 }}
    >
      <div
        ref={setNodeRef}
        style={{
          ...style,
          opacity: isDragging ? 0.5 : 1
        }}
        {...(item.matched ? {} : { ...attributes, ...listeners })}
        onClick={handleClick}
        className="relative aspect-square rounded-xl border-2 overflow-hidden transition-all duration-300 cursor-pointer group"
      >
        {/* Drag Handle Indicator */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-50 transition-opacity z-10">
          <GripVertical 
            className="w-4 h-4" 
          />
        </div>

        {/* Selection Indicator */}
        {selectedBacklogItem === item.id && (
          <div 
            className="absolute top-2 right-2 w-3 h-3 rounded-full border-2 z-10"
          />
        )}

        {/* Avatar/Icon */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"
          >
            <IconComponent 
              className="w-6 h-6" 
            />
          </div>
          
          {/* Name */}
          <h4 
            className="text-xs font-semibold text-center leading-tight line-clamp-2"
          >
            {item.title}
          </h4>
        </div>

        {/* Hover Overlay */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
        >
          <div 
            className="text-xs font-medium px-2 py-1 rounded"
          >
            Drag to rank
          </div>
        </div>
      </div>
    </motion.div>
  );
}