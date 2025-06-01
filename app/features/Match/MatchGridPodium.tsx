import { GridItemType } from "@/app/types/match";
import { GridItem } from "./MatchGridItem";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

type Props = {
  gridItems: GridItemType[];
  selectedBacklogItem: GridItemType | null;
  handleGridItemClick: (id: string) => void;
  selectedGridItem: string | null;
  maxItems: number;
  canAddAtPosition: (position: number) => boolean;
}

const MatchGridPodium = ({
  gridItems, 
  selectedBacklogItem, 
  handleGridItemClick, 
  selectedGridItem,
  maxItems,
  canAddAtPosition
}: Props) => {
  
  const top3Items = gridItems.slice(0, 3);
  const next7Items = gridItems.slice(3, 10);
  const remainingItems = gridItems.slice(10);
  
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
  
  const renderEmptySlot = (position: number, size: 'large' | 'medium' | 'small' = 'small') => {
    const canAdd = canAddAtPosition(position);
    const isNextAvailable = position === nextAvailablePosition;
    const isLastAvailable = position === lastAvailablePosition;
    const shouldHighlight = selectedBacklogItem && canAdd && (isNextAvailable || isLastAvailable);
    
    const sizeClasses = {
      large: 'w-8 h-8 text-2xl',
      medium: 'w-5 h-5 text-lg', 
      small: 'w-4 h-4 text-sm'
    };
    
    return (
      <div 
        className={`${size === 'large' ? 'w-full h-full' : 'aspect-[4/5]'} rounded-xl border-2 border-dashed flex items-center justify-center group transition-all duration-300 relative ${
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
            const newId = `grid-${Date.now()}-${position}`;
            handleGridItemClick(newId);
          }
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <Plus 
            className={`${sizeClasses[size].split(' ').slice(0, 2).join(' ')} transition-opacity ${
              shouldHighlight
                ? 'opacity-60 group-hover:opacity-80 text-green-400 group-hover:text-green-300'
                : canAdd && selectedBacklogItem
                ? 'opacity-40 group-hover:opacity-60 text-slate-400 group-hover:text-blue-400'
                : 'opacity-20 text-slate-600'
            }`}
          />
          <span 
            className={`${sizeClasses[size].split(' ')[2]} font-black ${
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
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Top 3 - Podium Row (only show if maxItems >= 3) */}
      {maxItems >= 3 && (
        <div className="grid grid-cols-3 gap-4 lg:gap-6">
          {[0, 1, 2].map((position) => {
            const item = top3Items[position];
            const emptySlot = !item;
            
            return (
              <motion.div
                key={emptySlot ? `empty-top3-${position}` : item.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: position * 0.1 }}
                className="aspect-[3/4]"
              >
                {emptySlot ? (
                  renderEmptySlot(position, 'large')
                ) : (
                  <GridItem 
                    item={item} 
                    index={position} 
                    onClick={() => handleGridItemClick(item.id)}
                    isSelected={selectedGridItem === item.id}
                    size="large"
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Next 7 - Second Row (only show if maxItems > 3) */}
      {maxItems > 3 && (
        <div className="grid grid-cols-4 lg:grid-cols-7 gap-3 lg:gap-4">
          {[3, 4, 5, 6, 7, 8, 9].filter(pos => pos < maxItems).map((position) => {
            const item = next7Items[position - 3];
            const emptySlot = !item;
            
            return (
              <motion.div
                key={emptySlot ? `empty-next7-${position}` : item.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: position * 0.05 }}
              >
                {emptySlot ? (
                  renderEmptySlot(position, 'medium')
                ) : (
                  <GridItem 
                    item={item} 
                    index={position} 
                    onClick={() => handleGridItemClick(item.id)}
                    isSelected={selectedGridItem === item.id}
                    size="medium"
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Remaining items - Regular Grid (only show if maxItems > 10) */}
      {maxItems > 10 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 3xl:grid-cols-10 gap-2 sm:gap-3 lg:gap-4">
          {[...Array(maxItems - 10)].map((_, idx) => {
            const position = idx + 10;
            const item = remainingItems[idx];
            const emptySlot = !item;
            
            return (
              <motion.div
                key={emptySlot ? `empty-remaining-${position}` : item.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: position * 0.01 }}
              >
                {emptySlot ? (
                  renderEmptySlot(position, 'small')
                ) : (
                  <GridItem 
                    item={item} 
                    index={position} 
                    onClick={() => handleGridItemClick(item.id)}
                    isSelected={selectedGridItem === item.id}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MatchGridPodium