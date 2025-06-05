import { GridItem } from "./MatchGridItem";
import { motion } from "framer-motion";
import { useItemStore } from "@/app/stores/item-store";
import MatchEmptySlot from "@/app/components/match/MatchEmptySlot";
import MatchDroppable from "@/app/components/match/MatchDroppable";
import { GridSection, PodiumConfig } from "@/app/config/matchStructure";

type Props = {
  maxItems: number;
}


const MatchGridPodium = ({ maxItems }: Props) => {
  const { 
    gridItems, 
    selectedBacklogItem, 
    selectedGridItem,
    setSelectedGridItem,
    assignItemToGrid,
    removeItemFromGrid,
    canAddAtPosition,
    backlogGroups,
    activeItem
  } = useItemStore();
  
  const isDraggingBacklogItem = activeItem && backlogGroups
    .flatMap(group => group.items)
    .some(item => item.id === activeItem);

  const handleGridItemClick = (id: string) => {
    const clickedItem = gridItems.find(item => item.id === id);
    if (clickedItem?.matched) {
      const position = parseInt(id.replace('grid-', ''));
      removeItemFromGrid(position);
    } else {
      setSelectedGridItem(selectedGridItem === id ? null : id);
    }
  };

  // Podium configuration (Top 3)
  const podiumConfig: PodiumConfig[] = [
    {
      position: 1, // 2nd place
      label: '#2',
      labelClass: 'text-lg font-bold text-slate-300 mb-3',
      containerClass: 'w-36 lg:w-40 xl:w-44 relative',
      animationDelay: 0.2,
      size: 'large'
    },
    {
      position: 0, // 1st place
      label: '#1',
      labelClass: 'text-2xl font-bold text-yellow-400 mb-3',
      containerClass: 'w-40 lg:w-44 xl:w-48 relative',
      animationDelay: 0.1,
      size: 'large'
    },
    {
      position: 2, // 3rd place
      label: '#3',
      labelClass: 'text-lg font-bold text-slate-300 mb-3',
      containerClass: 'w-32 lg:w-36 xl:w-40 relative',
      animationDelay: 0.3,
      size: 'large'
    }
  ];

  const gridSections: GridSection[] = [
    {
      id: 'positions-4-10',
      positions: Array.from({ length: 7 }, (_, i) => i + 3), 
      gridCols: 'grid-cols-7',
      gap: 'gap-6',
      size: 'medium',
      containerClass: 'mb-8',
      showRankLabel: true,
      rankLabelClass: 'text-sm font-semibold text-slate-400 mb-2',
      animationDelay: 0.4,
      animationStagger: 0.05
    },
    {
      id: 'remaining-positions',
      positions: Array.from({ length: maxItems - 10 }, (_, i) => i + 10),
      gridCols: 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12',
      gap: 'gap-3 lg:gap-4 xl:gap-5',
      size: 'small',
      containerClass: 'flex-1',
      showRankLabel: true,
      rankLabelClass: 'text-xs font-medium text-slate-500 mb-1',
      animationDelay: 0.6,
      animationStagger: 0.02
    }
  ];

  // Render podium item
  const renderPodiumItem = (config: PodiumConfig) => {
    const item = gridItems[config.position];
    
    return (
      <motion.div
        key={`podium-${config.position}`}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: config.animationDelay }}
        className="flex flex-col items-center"
      >
        <div className={config.labelClass}>{config.label}</div>
        <div className={config.containerClass}>
          <MatchDroppable
            position={config.position}
            size={config.size}
            isDraggingBacklogItem={isDraggingBacklogItem}
            selectedBacklogItem={selectedBacklogItem}
            canAddAtPosition={canAddAtPosition}
          >
            {item?.matched ? (
              <GridItem 
                item={item} 
                index={config.position} 
                onClick={() => handleGridItemClick(item.id)}
                isSelected={selectedGridItem === item.id}
                size={config.size}
              />
            ) : (
              <MatchEmptySlot
                position={config.position} 
                size={config.size} 
                selectedBacklogItem={selectedBacklogItem}
                backlogGroups={backlogGroups}
                gridItems={gridItems}
                assignItemToGrid={assignItemToGrid}
                canAddAtPosition={canAddAtPosition}
              />
            )}
          </MatchDroppable>
        </div>
      </motion.div>
    );
  };

  // Render grid item for regular sections
  const renderGridItem = (position: number, config: GridSection, index: number) => {
    const item = gridItems[position];
    const emptySlot = !item?.matched;
    
    return (
      <motion.div
        key={emptySlot ? `empty-${position}` : item.id}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          delay: (config.animationDelay || 0) + index * (config.animationStagger || 0.05) 
        }}
        className="flex flex-col items-center"
      >
        {config.showRankLabel && (
          <div className={config.rankLabelClass}>#{position + 1}</div>
        )}
        <div className="w-full relative">
          <MatchDroppable
            position={position}
            size={config.size}
            isDraggingBacklogItem={isDraggingBacklogItem}
            selectedBacklogItem={selectedBacklogItem}
            canAddAtPosition={canAddAtPosition}
          >
            {emptySlot ? (
              <MatchEmptySlot
                position={position} 
                size={config.size} 
                selectedBacklogItem={selectedBacklogItem}
                backlogGroups={backlogGroups}
                gridItems={gridItems}
                assignItemToGrid={assignItemToGrid}
                canAddAtPosition={canAddAtPosition}
              />
            ) : (
              <GridItem 
                item={item} 
                index={position} 
                onClick={() => handleGridItemClick(item.id)}
                isSelected={selectedGridItem === item.id}
                size={config.size}
              />
            )}
          </MatchDroppable>
        </div>
      </motion.div>
    );
  };

  // Render grid section
  const renderGridSection = (config: GridSection) => {
    // Filter positions that exist within maxItems
    const validPositions = config.positions.filter(pos => pos < maxItems);
    
    if (validPositions.length === 0) return null;

    return (
      <div key={config.id} className={config.containerClass}>
        <div className={`grid ${config.gridCols} ${config.gap}`}>
          {validPositions.map((position, index) => 
            renderGridItem(position, config, index)
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-8 flex-1 flex flex-col">
      {/* Top 3 - Podium Style */}
      <div className="flex items-end justify-center gap-8 mb-12">
        {podiumConfig.map(renderPodiumItem)}
      </div>

      {/* Regular Grid Sections */}
      {gridSections.map(section => {
        // Only render if there are items in this range
        const hasItemsInRange = section.positions.some(pos => pos < maxItems);
        return hasItemsInRange ? renderGridSection(section) : null;
      })}
    </div>
  );
};

export default MatchGridPodium;