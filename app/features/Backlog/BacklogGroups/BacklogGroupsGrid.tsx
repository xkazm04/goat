import { motion, AnimatePresence } from "framer-motion";
import { BacklogGroup } from "@/app/types/backlog-groups";
import { BacklogGroup as BacklogGroupComponent } from "../BacklogGroup/BacklogGroup";

interface BacklogGroupsGridProps {
  groups: BacklogGroup[];
  isExpandedView: boolean;
  expandedViewMode: 'grid' | 'list';
  isMobile: boolean;
  onRemoveItem: (groupId: string, itemId: string) => void;
  onGroupExpand?: (groupId: string) => void; // Add this prop
}

export function BacklogGroupsGrid({
  groups,
  isExpandedView,
  expandedViewMode,
  isMobile,
  onRemoveItem,
  onGroupExpand // Add this parameter
}: BacklogGroupsGridProps) {

  const getGridClasses = () => {
    if (isExpandedView) {
      return expandedViewMode === 'grid' 
        ? "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4"
        : "space-y-4";
    }
    return "space-y-4";
  };

  console.log('🎨 BacklogGroupsGrid rendering:', {
    groupCount: groups.length,
    groupNames: groups.map(g => g.name),
    isExpandedView,
    expandedViewMode
  });

  return (
    <div className={getGridClasses()}>
      <AnimatePresence mode="popLayout">
        {groups.map((group, index) => (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ 
              duration: 0.3, 
              delay: isExpandedView ? index * 0.05 : 0,
              ease: [0.04, 0.62, 0.23, 0.98]
            }}
            layout
          >
            <BacklogGroupComponent
              group={group}
              isExpandedView={isExpandedView}
              defaultExpanded={false}
              isLoading={false}
              isLoaded={group.items.length > 0}
              itemCount={group.item_count}
              onRemoveItem={onRemoveItem}
              onExpand={onGroupExpand} // Pass the handler
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}