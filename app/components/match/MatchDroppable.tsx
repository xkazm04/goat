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
      position: position
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
      {/* Enhanced hover overlay for backlog item drops */}
      {isHoveringWithBacklogDrag && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 rounded-xl border-3 border-blue-400 bg-blue-400/25 z-10 pointer-events-none flex items-center justify-center"
          style={{
            boxShadow: '0 0 25px rgba(59, 130, 246, 0.6)'
          }}
        >
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Plus className="w-8 h-8 text-blue-400 mx-auto mb-1" />
            </motion.div>
            <span className="text-sm text-blue-400 font-bold">Drop to add</span>
          </div>
        </motion.div>
      )}

      {/* Pulse animation for empty slots when backlog item is being dragged */}
      {isDraggingBacklogItem && canAdd && !isOver && (
        <motion.div
          animate={{ 
            scale: [1, 1.02, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 rounded-xl border-2 border-dashed border-blue-400/40 bg-blue-400/5 pointer-events-none"
        />
      )}

      {children}
    </div>
  );
};

export default MatchDroppable;