import { Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface MatchEmptySlotProps {
  position: number;
  size?: 'small' | 'medium' | 'large';
  selectedBacklogItem: string | null;
  backlogGroups: any[];
  gridItems: any[];
  assignItemToGrid: (item: any, position: number) => void;
  canAddAtPosition: (position: number) => boolean;
  isDraggingBacklogItem?: boolean;
  activeItem?: string | null;
}

const MatchEmptySlot = ({ 
  position, 
  size = 'medium',
  selectedBacklogItem,
  backlogGroups,
  gridItems,
  assignItemToGrid,
  canAddAtPosition,
  isDraggingBacklogItem = false,
  activeItem = null
}: MatchEmptySlotProps) => {
  const [isBeingDraggedOver, setIsBeingDraggedOver] = useState(false);
  const [dragPreviewItem, setDragPreviewItem] = useState<any>(null);

  // Enhanced droppable with better feedback
  const { isOver, setNodeRef } = useDroppable({
    id: `empty-slot-${position}`,
    data: {
      type: 'empty-slot',
      position: position,
      accepts: ['backlog-item', 'grid-item']
    }
  });

  const selectedBacklogItemObj = selectedBacklogItem
    ? backlogGroups
        .flatMap(group => group.items)
        .find(item => item.id === selectedBacklogItem)
    : null;

  // Get dragged item details for preview
  useEffect(() => {
    if (activeItem && isDraggingBacklogItem) {
      const draggedItem = backlogGroups
        .flatMap(group => group.items)
        .find(item => item.id === activeItem);
      setDragPreviewItem(draggedItem);
    } else {
      setDragPreviewItem(null);
    }
  }, [activeItem, isDraggingBacklogItem, backlogGroups]);

  // Enhanced hover state management
  useEffect(() => {
    if (isOver && (isDraggingBacklogItem || activeItem?.startsWith('grid-'))) {
      setIsBeingDraggedOver(true);
    } else {
      setIsBeingDraggedOver(false);
    }
  }, [isOver, isDraggingBacklogItem, activeItem]);

  const getNextAvailablePosition = () => {
    return gridItems.findIndex(item => !item.matched);
  };

  const getLastAvailablePosition = () => {
    const lastIndex = gridItems.map(item => item.matched).lastIndexOf(false);
    return lastIndex !== -1 ? lastIndex : null;
  };

  const nextAvailable = getNextAvailablePosition();
  const lastAvailable = getLastAvailablePosition();
  const canAdd = canAddAtPosition(position);
  const isNextAvailable = nextAvailable === position;
  const isLastAvailable = lastAvailable === position;
  const shouldHighlight = (selectedBacklogItemObj || dragPreviewItem) && canAdd && (isNextAvailable || isLastAvailable);

  const sizeClasses = {
    large: {
      icon: 'w-10 h-10',
      container: 'h-44 lg:h-48 xl:h-52',
      text: 'text-3xl',
      number: 'text-xl lg:text-2xl xl:text-3xl',
      badge: 'text-sm lg:text-base xl:text-lg',
      padding: 'p-4 lg:p-5 xl:p-6'
    },
    medium: {
      icon: 'w-8 h-8',
      container: 'h-36 lg:h-40 xl:h-44',
      text: 'text-2xl',
      number: 'text-base lg:text-lg xl:text-xl',
      badge: 'text-xs lg:text-sm xl:text-base',
      padding: 'p-3 lg:p-4 xl:p-5'
    },
    small: {
      icon: 'w-6 h-6',
      container: 'h-28 sm:h-32 lg:h-36 xl:h-40',
      text: 'text-lg',
      number: 'text-xs sm:text-sm lg:text-base xl:text-base',
      badge: 'text-xs',
      padding: 'p-2 sm:p-2.5 lg:p-3 xl:p-3.5'
    }
  };

  const classes = sizeClasses[size];

  const getSlotState = () => {
    if (isBeingDraggedOver) {
      return {
        background: 'rgba(59, 130, 246, 0.25)',
        border: '2px dashed rgba(59, 130, 246, 0.8)',
        iconColor: 'text-blue-400',
        textColor: 'text-blue-400',
        scale: 1.05,
        glow: '0 0 25px rgba(59, 130, 246, 0.5)',
        cursor: 'cursor-pointer'
      };
    }
    
    if (shouldHighlight) {
      return {
        background: 'rgba(34, 197, 94, 0.15)',
        border: '2px dashed rgba(34, 197, 94, 0.7)',
        iconColor: 'text-green-400 group-hover:text-green-300',
        textColor: 'text-green-400 group-hover:text-green-300',
        scale: 1.02,
        glow: '0 6px 20px rgba(34, 197, 94, 0.3)',
        cursor: 'cursor-pointer hover:scale-105'
      };
    }
    
    if (canAdd && (selectedBacklogItemObj || dragPreviewItem)) {
      return {
        background: 'rgba(59, 130, 246, 0.08)',
        border: '2px dashed rgba(59, 130, 246, 0.5)',
        iconColor: 'text-slate-400 group-hover:text-blue-400',
        textColor: 'text-slate-400 group-hover:text-blue-400',
        scale: 1,
        glow: 'none',
        cursor: 'cursor-pointer hover:scale-105'
      };
    }
    
    return {
      background: 'rgba(71, 85, 105, 0.15)',
      border: '2px dashed rgba(71, 85, 105, 0.6)',
      iconColor: 'text-slate-600',
      textColor: 'text-slate-600',
      scale: 1,
      glow: 'none',
      cursor: 'cursor-not-allowed'
    };
  };

  const slotState = getSlotState();

  const handleClick = () => {
    if (selectedBacklogItemObj && canAdd) {
      assignItemToGrid(selectedBacklogItemObj, position);
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      className={`relative w-full ${classes.container} rounded-xl border-2 border-dashed flex items-center justify-center group transition-all duration-300 ${slotState.cursor}`}
      style={{
        background: slotState.background,
        border: slotState.border,
        boxShadow: slotState.glow
      }}
      onClick={handleClick}
      animate={{
        scale: isBeingDraggedOver ? slotState.scale : 1,
        rotateY: isBeingDraggedOver ? 5 : 0,
      }}
      whileHover={{
        scale: isBeingDraggedOver ? slotState.scale : (canAdd ? 1.02 : 1)
      }}
      transition={{
        duration: 0.2,
        ease: "easeOut"
      }}
    >
      {/* Background rank number with enhanced visibility */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
        <motion.span 
          className={`font-black select-none transition-all duration-300 ${
            size === 'large' ? 'text-8xl lg:text-9xl xl:text-[10rem]' :
            size === 'medium' ? 'text-6xl lg:text-7xl xl:text-8xl' :
            'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl'
          }`}
          style={{ 
            color: isBeingDraggedOver ? '#3b82f6' : '#94a3b8',
            opacity: isBeingDraggedOver ? 0.3 : 0.2
          }}
          animate={{
            scale: isBeingDraggedOver ? 1.1 : 1,
            rotate: isBeingDraggedOver ? 2 : 0
          }}
        >
          {position + 1}
        </motion.span>
      </div>

      <div className="flex flex-col items-center gap-3 relative z-10">
        {/* Enhanced Plus Icon with drag preview */}
        <motion.div
          className="relative"
          animate={{
            scale: isBeingDraggedOver ? 1.2 : shouldHighlight ? 1.1 : 1,
            rotate: isBeingDraggedOver ? 45 : 0
          }}
          transition={{ duration: 0.2 }}
        >
          <Plus
            className={`${classes.icon} transition-all duration-300 ${slotState.iconColor} ${
              shouldHighlight ? 'scale-110' : canAdd && (selectedBacklogItemObj || dragPreviewItem) ? 'group-hover:scale-110' : ''
            }`}
            style={{
              opacity: isBeingDraggedOver ? 1 : shouldHighlight ? 0.9 : canAdd && (selectedBacklogItemObj || dragPreviewItem) ? 0.7 : 0.4,
              filter: isBeingDraggedOver ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))' : 'none'
            }}
          />
          
          {/* Drag preview overlay */}
          <AnimatePresence>
            {isBeingDraggedOver && dragPreviewItem && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 0.8, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div 
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-lg"
                  style={{
                    filter: 'drop-shadow(0 4px 12px rgba(59, 130, 246, 0.4))'
                  }}
                >
                  {dragPreviewItem.title.charAt(0)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Enhanced Position Number */}
        <motion.span
          className={`${classes.number} font-bold transition-all duration-300 ${slotState.textColor}`}
          animate={{
            scale: isBeingDraggedOver ? 1.1 : 1,
            y: isBeingDraggedOver ? -2 : 0
          }}
        >
          {position + 1}
        </motion.span>

        {/* Position indicator badges for top positions */}
        {position < 3 && (
          <motion.div 
            className="absolute -top-3 -right-3"
            animate={{
              scale: isBeingDraggedOver ? 1.1 : 1,
              rotate: isBeingDraggedOver ? 10 : 0
            }}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-all duration-300 ${classes.badge}`}
              style={{
                background: position === 0 ? '#FFD700' : position === 1 ? '#C0C0C0' : '#CD7F32',
                color: '#000',
                boxShadow: isBeingDraggedOver 
                  ? `0 4px 15px ${position === 0 ? 'rgba(255, 215, 0, 0.6)' : position === 1 ? 'rgba(192, 192, 192, 0.6)' : 'rgba(205, 127, 50, 0.6)'}`
                  : '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}
            >
              {position + 1}
            </div>
          </motion.div>
        )}

        {/* Enhanced hint text with dynamic content */}
        <div className="absolute bottom-3 left-0 right-0 text-center">
          <motion.span 
            className={`text-xs transition-all duration-300 ${
              isBeingDraggedOver ? 'text-blue-400 font-medium' :
              shouldHighlight ? 'text-green-400' :
              'text-slate-500'
            }`}
            animate={{
              opacity: isBeingDraggedOver ? 1 : 0.8,
              y: isBeingDraggedOver ? -1 : 0
            }}
          >
            {isBeingDraggedOver ? 'Drop to place' :
             (selectedBacklogItemObj || dragPreviewItem) && canAdd && position < 10 ? 
             `Press ${position === 9 ? '0' : (position + 1).toString()}` : 
             'Drop here'}
          </motion.span>
        </div>
      </div>

      {/* Enhanced glow effect during drag over */}
      <AnimatePresence>
        {isBeingDraggedOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: `
                radial-gradient(circle at center, 
                  rgba(59, 130, 246, 0.1) 0%,
                  rgba(59, 130, 246, 0.05) 50%,
                  transparent 100%
                )
              `,
              boxShadow: 'inset 0 0 20px rgba(59, 130, 246, 0.2)'
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MatchEmptySlot;