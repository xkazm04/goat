import { motion, AnimatePresence } from "framer-motion";
import { BacklogGroup as BacklogGroupComponent } from "../BacklogGroup/BacklogGroup";
import { BacklogGroup } from "@/app/types/backlog-groups";

interface GroupsGridProps {
  groups: BacklogGroup[];
  isExpandedView: boolean;
  expandedViewMode: 'grid' | 'list';
  isMobile: boolean;
  onGroupHover?: (groupId: string) => void;
  onGroupExpand?: (groupId: string) => void;
  loadingGroups?: Set<string>;
  loadedGroups?: Set<string>;
}

export function BacklogGroupsGrid({ 
  groups, 
  isExpandedView, 
  expandedViewMode, 
  isMobile,
  onGroupHover,
  onGroupExpand,
  loadingGroups = new Set(),
  loadedGroups = new Set()
}: GroupsGridProps) {
  
  const handleGroupInteraction = (groupId: string, type: 'hover' | 'expand') => {
    if (type === 'hover') {
      onGroupHover?.(groupId);
    } else {
      onGroupExpand?.(groupId);
    }
  };

  return (
    <div className={`grid gap-4 ${
      isExpandedView 
        ? expandedViewMode === 'grid'
          ? isMobile 
            ? 'grid-cols-1' 
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
          : 'grid-cols-1'
        : 'grid-cols-1'
    }`}>
      <AnimatePresence mode="popLayout">
        {groups.map((group, index) => (
          <motion.div 
            key={group.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ 
              delay: index * 0.05,
              type: "spring",
              stiffness: 300,
              damping: 20,
              layout: { duration: 0.3 }
            }}
            layout
            layoutId={`group-${group.id}`}
            onMouseEnter={() => handleGroupInteraction(group.id, 'hover')}
          >
            <BacklogGroupComponent 
              group={{
                id: group.id,
                name: group.name,
                // Convert BacklogGroup to BacklogGroupType for compatibility
                items: group.items.map(item => ({
                  id: item.id,
                  title: item.name || item.title || '',
                  description: item.description || '',
                  matched: false,
                  tags: item.tags || []
                })),
                isOpen: true
              }}
              defaultExpanded={false}
              isExpandedView={isExpandedView}
              isLoading={loadingGroups.has(group.id)}
              isLoaded={loadedGroups.has(group.id)}
              onExpand={() => handleGroupInteraction(group.id, 'expand')}
              itemCount={group.item_count}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}