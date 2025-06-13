import { motion } from "framer-motion";
import { useItemStore } from "@/app/stores/item-store";
import MatchGridSlot from "@/app/components/match/MatchGridSlot";
import { GridSection, PodiumConfig } from "@/app/config/matchStructure";
import { useMemo } from "react";
import { useBacklogStore } from "@/app/stores/backlog-store";

type Props = {
  maxItems: number;
}

const MatchGridPodium = ({ maxItems }: Props) => {
  const { 
    gridItems, 
    selectedBacklogItem, 
    selectedGridItem,
    setSelectedGridItem,
    removeItemFromGrid,
    activeItem
  } = useItemStore();
  
  // Get backlog groups directly to avoid recreation
  const backlogGroups = useBacklogStore(state => state.groups);
  
  // Safely determine if we're dragging a backlog item with proper null checks
  const isDraggingBacklogItem = useMemo(() => {
    if (!activeItem || !backlogGroups || !Array.isArray(backlogGroups)) {
      return false;
    }
    
    // Safely flatten and filter the array
    const allItems = backlogGroups
      .flatMap(group => Array.isArray(group.items) ? group.items : [])
      .filter(item => item && typeof item === 'object');
    
    // Safely check if the active item is in the backlog
    return allItems.some(item => item && item.id === activeItem);
  }, [activeItem, backlogGroups]);

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
      gap: 'gap-4 lg:gap-6',
      size: 'medium',
      containerClass: 'mb-8', // Ensure proper spacing
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

  // Render podium item with enhanced transitions
  const renderPodiumItem = (config: PodiumConfig) => {
    const item = gridItems[config.position];
    
    return (
      <motion.div
        key={`podium-${config.position}`}
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          delay: config.animationDelay,
          type: "spring",
          stiffness: 300,
          damping: 20
        }}
        className="flex flex-col items-center"
      >
        <motion.div 
          className={config.labelClass}
          animate={{ 
            scale: item?.matched ? 1.1 : 1,
            color: item?.matched ? '#fbbf24' : undefined
          }}
          transition={{ duration: 0.3 }}
        >
          {config.label}
        </motion.div>
        <div className={config.containerClass}>
          <MatchGridSlot
            position={config.position}
            size={config.size}
            gridItem={item}
            selectedBacklogItem={selectedBacklogItem}
            selectedGridItem={selectedGridItem}
            onGridItemClick={handleGridItemClick}
          />
        </div>
      </motion.div>
    );
  };

  // Render grid item for regular sections with enhanced animations
  const renderGridItem = (position: number, config: GridSection, index: number) => {
    const item = gridItems[position];
    
    return (
      <motion.div
        key={`grid-slot-${position}`}
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ 
          delay: (config.animationDelay || 0) + index * (config.animationStagger || 0.05),
          type: "spring",
          stiffness: 300,
          damping: 20
        }}
        className="flex flex-col items-center"
      >
        {config.showRankLabel && (
          <motion.div 
            className={config.rankLabelClass}
            animate={{
              color: item?.matched ? '#60a5fa' : undefined,
              scale: item?.matched ? 1.05 : 1
            }}
            transition={{ duration: 0.3 }}
          >
            #{position + 1}
          </motion.div>
        )}
        <div className="w-full relative">
          <MatchGridSlot
            position={position}
            size={config.size}
            gridItem={item}
            selectedBacklogItem={selectedBacklogItem}
            selectedGridItem={selectedGridItem}
            onGridItemClick={handleGridItemClick}
          />
        </div>
      </motion.div>
    );
  };

  // Render grid section
  const renderGridSection = (config: GridSection) => {
    const validPositions = config.positions.filter(pos => pos < maxItems);
    
    if (validPositions.length === 0) return null;

    return (
      <motion.div 
        key={config.id} 
        className={config.containerClass}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          delay: config.animationDelay,
          duration: 0.5
        }}
      >
        <div className={`grid ${config.gridCols} ${config.gap}`}>
          {validPositions.map((position, index) => 
            renderGridItem(position, config, index)
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="w-full space-y-8 flex-1 flex flex-col">
      {/* Top 3 - Enhanced Podium Style with proper spacing */}
      <motion.div 
        className="flex items-end justify-center gap-8 mb-16" // Increased margin bottom
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {podiumConfig.map(renderPodiumItem)}
      </motion.div>

      {/* Regular Grid Sections with Enhanced Animations */}
      <div className="space-y-12"> {/* Added wrapper with spacing */}
        {gridSections.map(section => {
          const hasItemsInRange = section.positions.some(pos => pos < maxItems);
          return hasItemsInRange ? renderGridSection(section) : null;
        })}
      </div>
    </div>
  );
};

export default MatchGridPodium;