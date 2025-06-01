import { GridItemType } from "@/app/types/match";
import { GridItem } from "./MatchGridItem";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

type Props = {
  gridItems: GridItemType[];
  selectedBacklogItem: GridItemType | null;
  handleGridItemClick: (id: string) => void;
  selectedGridItem: string | null;
}

const MatchGridPodium = ({gridItems, selectedBacklogItem, handleGridItemClick, selectedGridItem}: Props) => {
    
    const top3Items = gridItems.slice(0, 3);
    const next7Items = gridItems.slice(3, 10);
    const remainingItems = gridItems.slice(10);
    
    return (
      <div className="space-y-6">
        {/* Top 3 - Podium Row */}
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
                  <div 
                    className="w-full h-full rounded-xl border-2 border-dashed flex items-center justify-center group hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => {
                      if (selectedBacklogItem) {
                        const newId = `grid-${Date.now()}-${position}`;
                        handleGridItemClick(newId);
                      }
                    }}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Plus className="w-8 h-8 opacity-40 group-hover:opacity-60 transition-opacity" />
                      <span className="text-2xl font-black opacity-20">
                        {position + 1}
                      </span>
                    </div>
                  </div>
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

        {/* Next 7 - Second Row */}
        <div className="grid grid-cols-4 lg:grid-cols-7 gap-3 lg:gap-4">
          {[3, 4, 5, 6, 7, 8, 9].map((position) => {
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
                  <div 
                    className="aspect-[4/5] rounded-xl border-2 border-dashed flex items-center justify-center group hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => {
                      if (selectedBacklogItem) {
                        const newId = `grid-${Date.now()}-${position}`;
                        handleGridItemClick(newId);
                      }
                    }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Plus className="w-5 h-5 opacity-40 group-hover:opacity-60 transition-opacity" />
                      <span className="text-lg font-bold opacity-20">
                        {position + 1}
                      </span>
                    </div>
                  </div>
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

        {/* Remaining 40 - Regular Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 3xl:grid-cols-10 gap-2 sm:gap-3 lg:gap-4">
          {[...Array(40)].map((_, idx) => {
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
                  <div 
                    className="aspect-[4/5] rounded-xl border-2 border-dashed flex items-center justify-center group hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => {
                      if (selectedBacklogItem) {
                        const newId = `grid-${Date.now()}-${position}`;
                        handleGridItemClick(newId);
                      }
                    }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Plus className="w-4 h-4 opacity-40 group-hover:opacity-60 transition-opacity" />
                      <span className="text-sm font-bold opacity-20">
                        {position + 1}
                      </span>
                    </div>
                  </div>
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
      </div>
    );
  };

  export default MatchGridPodium