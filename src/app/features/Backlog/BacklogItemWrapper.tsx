import { BacklogItemType } from "@/types/match";
import { motion } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useCallback } from "react";

interface BacklogItemWrapperProps {
  item: BacklogItemType;
  isDragOverlay?: boolean;
  size?: 'small' | 'medium' | 'large';
  isAssignedToGrid?: boolean;
  isSelected?: boolean;
  isInCompareList?: boolean;
  isEffectivelyMatched?: boolean;
  activeItem?: string | null;
  children: React.ReactNode;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const BacklogItemWrapper = ({ 
  item, 
  isDragOverlay = false, 
  size = 'medium', 
  isAssignedToGrid = false,
  isSelected = false,
  isInCompareList = false,
  isEffectivelyMatched = false,
  activeItem,
  children,
  onClick,
  onDoubleClick,
  onContextMenu
}: BacklogItemWrapperProps) => {
  // Define DND data with proper type information
  const getDragData = useCallback(() => ({
    type: 'backlog-item',
    item: {
      id: item.id,
      title: item.title,
      description: item.description,
      tags: item.tags,
      image_url: item.image_url
    },
    isAssignedToGrid
  }), [item, isAssignedToGrid]);

  // Set up draggable with improved configuration
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled: isDragOverlay || isEffectivelyMatched,
    data: getDragData()
  });

  // Size-dependent styling
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'min-h-[64px]';
      case 'large':
        return 'min-h-[120px]';
      default: // medium
        return 'min-h-[90px]';
    }
  };

  // Get item state style
  const getItemStateStyle = () => {
    if (isDragOverlay) {
      return {
        background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.9) 0%, rgba(79, 70, 229, 0.9) 100%)',
        border: '2px solid rgba(129, 140, 248, 0.7)',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
      };
    }

    if (isEffectivelyMatched) {
      return {
        opacity: 0.5,
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.5) 0%, rgba(30, 41, 59, 0.5) 100%)',
        border: '2px solid rgba(51, 65, 85, 0.3)',
        boxShadow: 'none'
      };
    }

    if (isSelected) {
      return {
        background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.8) 0%, rgba(67, 56, 202, 0.8) 100%)',
        border: '2px solid rgba(99, 102, 241, 0.7)',
        boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
      };
    }

    if (isInCompareList) {
      return {
        background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(67, 56, 202, 0.4) 100%)',
        border: '2px solid rgba(99, 102, 241, 0.5)',
        boxShadow: '0 2px 10px rgba(99, 102, 241, 0.2)'
      };
    }

    return {
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)',
      border: '2px solid rgba(71, 85, 105, 0.4)',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
    };
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: isEffectivelyMatched ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab'),
    ...getItemStateStyle()
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`
        relative rounded-xl overflow-hidden touch-manipulation transition-all
        ${getSizeClasses()}
        ${isDragOverlay ? 'z-50' : ''}
        ${isEffectivelyMatched ? 'pointer-events-none' : ''}
      `}
      {...attributes}
      {...listeners}
      whileHover={!isDragOverlay && !isEffectivelyMatched ? { scale: 1.02 } : {}}
      whileTap={!isDragOverlay && !isEffectivelyMatched ? { scale: 0.98 } : {}}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      data-id={item.id}
      data-is-matched={isEffectivelyMatched ? 'true' : 'false'}
    >
      {children}
    </motion.div>
  );
};