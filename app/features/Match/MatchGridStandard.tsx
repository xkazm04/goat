import { GridItemType } from "@/app/types/match";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { GridItem } from "./MatchGridItem";

type Props = {
  gridItems: GridItemType[];
  selectedBacklogItem: GridItemType | null;
  handleGridItemClick: (id: string) => void;
  selectedGridItem: string | null;
}
 
const MatchGridStandard = ({gridItems, handleGridItemClick, selectedGridItem, selectedBacklogItem} : Props) => (
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
      {Array.from({ length: Math.max(0, 50 - gridItems.length) }).map((_, index) => (
        <motion.div
          key={`empty-${index}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: (gridItems.length + index) * 0.01 }}
          className="aspect-[4/5] rounded-xl border-2 border-dashed flex items-center justify-center group hover:scale-105 transition-transform cursor-pointer"
          onClick={() => {
            if (selectedBacklogItem) {
              const newId = `grid-${Date.now()}-${index}`;
              handleGridItemClick(newId);
            }
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <Plus 
              className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 opacity-40 group-hover:opacity-60 transition-opacity" 
            />
            <span 
              className="text-xs sm:text-sm lg:text-base 3xl:text-lg font-bold opacity-20"
            >
              {gridItems.length + index + 1}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );

export default MatchGridStandard