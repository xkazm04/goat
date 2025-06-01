import { GridItemType } from "@/app/types/match";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { GridItem } from "./MatchGridItem";

type Props = {
  gridItems: GridItemType[];
  selectedBacklogItem: GridItemType | null;
  handleGridItemClick: (id: string) => void;
  selectedGridItem: string | null;
  maxItems: number;
  canAddAtPosition: (position: number) => boolean;
}
 
const MatchGridStandard = ({
  gridItems, 
  handleGridItemClick, 
  selectedGridItem, 
  selectedBacklogItem,
  maxItems,
  canAddAtPosition
}: Props) => {
  // Find the first and last available positions for special highlighting
  const getNextAvailablePosition = () => {
    for (let i = 0; i < maxItems; i++) {
      if (!gridItems[i] || !gridItems[i].matched) {
        return canAddAtPosition(i) ? i : -1;
      }
    }
    return -1;
  };

  const getLastAvailablePosition = () => {
    for (let i = maxItems - 1; i >= 0; i--) {
      if (!gridItems[i] || !gridItems[i].matched) {
        return canAddAtPosition(i) ? i : -1;
      }
    }
    return -1;
  };

  const nextAvailablePosition = getNextAvailablePosition();
  const lastAvailablePosition = getLastAvailablePosition();

  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 3xl:grid-cols-10 gap-2 sm:gap-3 lg:gap-4 3xl:gap-6">
      {gridItems.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.01 }}
          layout
        >
          <GridItem 
            item={item} 
            index={index} 
            onClick={() => handleGridItemClick(item.id)}
            isSelected={selectedGridItem === item.id}
          />
        </motion.div>
      ))}
      
      {/* Empty slots */}
      {Array.from({ length: Math.max(0, maxItems - gridItems.length) }).map((_, index) => {
        const position = gridItems.length + index;
        const canAdd = canAddAtPosition(position);
        const isNextAvailable = position === nextAvailablePosition;
        const isLastAvailable = position === lastAvailablePosition;
        const shouldHighlight = selectedBacklogItem && canAdd && (isNextAvailable || isLastAvailable);
        
        return (
          <motion.div
            key={`empty-${index}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: (gridItems.length + index) * 0.01 }}
            className={`aspect-[4/5] rounded-xl border-2 border-dashed flex items-center justify-center group transition-all duration-300 ${
              shouldHighlight
                ? 'cursor-pointer hover:scale-105 border-green-400 hover:border-green-300' 
                : canAdd && selectedBacklogItem 
                ? 'cursor-pointer hover:scale-105 border-slate-600 hover:border-blue-400' 
                : 'cursor-not-allowed border-slate-700 opacity-50'
            }`}
            style={{
              background: shouldHighlight
                ? 'rgba(34, 197, 94, 0.08)'
                : canAdd && selectedBacklogItem 
                ? 'rgba(59, 130, 246, 0.05)' 
                : 'rgba(71, 85, 105, 0.1)'
            }}
            onClick={() => {
              if (selectedBacklogItem && canAdd) {
                const newId = `grid-${Date.now()}-${index}`;
                handleGridItemClick(newId);
              }
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <Plus 
                className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 transition-opacity ${
                  shouldHighlight
                    ? 'opacity-60 group-hover:opacity-80 text-green-400 group-hover:text-green-300'
                    : canAdd && selectedBacklogItem
                    ? 'opacity-40 group-hover:opacity-60 text-slate-400 group-hover:text-blue-400'
                    : 'opacity-20 text-slate-600'
                }`}
              />
              <span 
                className={`text-xs sm:text-sm lg:text-base 3xl:text-lg font-bold ${
                  shouldHighlight
                    ? 'opacity-50 group-hover:opacity-70 text-green-400'
                    : canAdd && selectedBacklogItem
                    ? 'opacity-30 group-hover:opacity-50 text-slate-400'
                    : 'opacity-20 text-slate-600'
                }`}
              >
                {position + 1}
              </span>
            </div>
            
            {/* Visual indicator for restricted positions */}
            {!canAdd && selectedBacklogItem && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                  <span className="text-red-400 text-xs font-bold">✕</span>
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default MatchGridStandard