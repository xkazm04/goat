import { X, GripVertical, ArrowUpDown, Shuffle } from "lucide-react";
import { motion } from "framer-motion";

const MatchGridItemControls = ({ 
  sizeClasses, 
  onClick,
  isDragging = false,
  isBeingDraggedOver = false
}: { 
  sizeClasses: any; 
  onClick?: () => void;
  isDragging?: boolean;
  isBeingDraggedOver?: boolean;
}) => (
  <>
    {/* Enhanced Drag Handle Indicator */}
    <div className={`absolute top-2 left-2 transition-all duration-200 z-10 ${
      isDragging ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-70'
    }`}>
      <motion.div
        animate={isDragging ? { 
          rotate: [0, 5, -5, 0],
          scale: [1, 1.1, 1]
        } : {}}
        transition={{ repeat: isDragging ? Infinity : 0, duration: 0.5 }}
        className="flex items-center gap-0.5"
      >
        <GripVertical 
          className={`${sizeClasses.dragHandle} ${
            isDragging ? 'text-blue-400' : 'text-slate-400'
          }`} 
        />
        {isDragging && (
          <ArrowUpDown className="w-3 h-3 text-blue-400" />
        )}
      </motion.div>
    </div>

    {/* Enhanced Remove Button */}
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`absolute top-2 right-2 ${sizeClasses.removeButton} rounded-full bg-red-500/80 hover:bg-red-500 transition-all duration-200 z-20 flex items-center justify-center backdrop-blur-sm hover:scale-110 ${
        isDragging ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
      }`}
      title="Remove from ranking"
    >
      <X className={`${sizeClasses.removeIcon} text-white`} />
    </button>

    {/* Swap indicator when being dragged over */}
    {isBeingDraggedOver && (
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute inset-0 border-2 border-blue-400 bg-blue-400/10 rounded-xl flex items-center justify-center backdrop-blur-sm z-30"
      >
        <div className="text-center">
          <Shuffle className="w-6 h-6 text-blue-400 mx-auto mb-1" />
          <span className="text-xs text-blue-400 font-medium">Swap positions</span>
        </div>
      </motion.div>
    )}
  </>
);

export default MatchGridItemControls;