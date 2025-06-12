import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

type Props = {
  position: number;
  size?: 'small' | 'medium' | 'large';
  children?: React.ReactNode;
  isDraggingBacklogItem: boolean;
  selectedBacklogItem: string | null;
  canAddAtPosition: (position: number) => boolean;
}

const MatchDroppable = ({ 
  position, 
  size = 'medium',
  children,
  isDraggingBacklogItem,
  selectedBacklogItem,
  canAddAtPosition
}: Props) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `grid-${position}`,
    data: {
      type: 'grid-slot',
      position: position,
      accepts: ['backlog-item', 'grid-item']
    }
  });

  const canAdd = canAddAtPosition(position);
  const isHoveringWithBacklogDrag = isOver && isDraggingBacklogItem && canAdd;
  const isValidDropTarget = isOver && canAdd;
  
  return (
    <div
      ref={setNodeRef}
      className={`w-full h-full transition-all duration-300 relative ${
        isHoveringWithBacklogDrag ? 'scale-110 z-30' : isValidDropTarget ? 'scale-105 z-20' : ''
      }`}
      style={{
        filter: isHoveringWithBacklogDrag ? 'drop-shadow(0 12px 30px rgba(59, 130, 246, 0.6))' : 'none'
      }}
    >
      {/* Enhanced hover overlay for backlog item drops with improved visuals */}
      {isHoveringWithBacklogDrag && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 rounded-xl border-3 z-10 pointer-events-none flex items-center justify-center"
          style={{
            border: '3px solid rgba(59, 130, 246, 0.8)',
            background: `linear-gradient(135deg, 
              rgba(59, 130, 246, 0.15) 0%, 
              rgba(147, 51, 234, 0.15) 50%,
              rgba(59, 130, 246, 0.15) 100%
            )`,
            boxShadow: `
              0 0 30px rgba(59, 130, 246, 0.6),
              inset 0 0 20px rgba(147, 51, 234, 0.2)
            `
          }}
        >
          <div className="text-center">
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
              }}
            >
              <Plus className="w-8 h-8 text-blue-300 mx-auto mb-1 drop-shadow-lg" />
            </motion.div>
            <span className="text-sm text-blue-300 font-bold drop-shadow-md">Drop to add</span>
          </div>
        </motion.div>
      )}

      {/* Enhanced pulse animation for empty slots when backlog item is being dragged */}
      {isDraggingBacklogItem && canAdd && !isOver && (
        <motion.div
          animate={{ 
            scale: [1, 1.03, 1],
            opacity: [0.2, 0.7, 0.2]
          }}
          transition={{ 
            duration: 2.5, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 rounded-xl border-2 border-dashed pointer-events-none"
          style={{
            borderColor: 'rgba(59, 130, 246, 0.5)',
            background: `linear-gradient(135deg, 
              rgba(59, 130, 246, 0.05) 0%, 
              rgba(147, 51, 234, 0.05) 100%
            )`,
            boxShadow: 'inset 0 0 15px rgba(59, 130, 246, 0.1)'
          }}
        />
      )}

      {children}
    </div>
  );
};

export default MatchDroppable;