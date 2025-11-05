import { motion, AnimatePresence } from "framer-motion";
import { BacklogGroup as BacklogGroupComponent } from "../BacklogGroup/BacklogGroup";
import { BacklogGroup } from "@/types/backlog-groups";
import { useEffect } from "react";

interface GroupsGridProps {
  groups: BacklogGroup[];
  isExpandedView: boolean;
  expandedViewMode: 'grid' | 'list';
  onGroupHover?: (groupId: string) => void;
  onGroupExpand?: (groupId: string) => void;
  loadingGroups?: Set<string>;
  loadedGroups?: Set<string>;
}

export function BacklogGroupsGrid({ 
  groups, 
  isExpandedView, 
  expandedViewMode, 
  onGroupHover,
  onGroupExpand,
  loadingGroups = new Set(),
  loadedGroups = new Set()
}: GroupsGridProps) {
  
  // ADD: Debug logging for visibility issues
  useEffect(() => {
    console.log(`🎯 BacklogGroupsGrid render:`, {
      groupsCount: groups.length,
      loadingGroupsCount: loadingGroups.size,
      loadedGroupsCount: loadedGroups.size,
      isExpandedView
    });
  }, [groups.length, loadingGroups.size, loadedGroups.size, isExpandedView]);

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
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2'
    }`}>
      <AnimatePresence mode="popLayout">
        {groups.map((group, index) => {
          const isGroupLoading = loadingGroups.has(group.id);
          const isGroupLoaded = loadedGroups.has(group.id) || (group.items && group.items.length > 0);
          
          return (
            <motion.div 
              key={group.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1,
                ...(isGroupLoading && !isGroupLoaded ? {
                  boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)"
                } : {})
              }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ 
                delay: index * 0.05,
                type: "spring",
                stiffness: 300,
                damping: 20,
                layout: { duration: 0.3 }
              }}
              layout="position"
              layoutId={`group-${group.id}`}
              onMouseEnter={() => handleGroupInteraction(group.id, 'hover')}
              className="relative"
            >
              {isGroupLoading && !isGroupLoaded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-blue-500/5 rounded-xl border border-blue-500/20 z-10 pointer-events-none"
                >
                  <div className="absolute top-2 right-2">
                    <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                </motion.div>
              )}
              
              <BacklogGroupComponent 
                group={group}
                defaultExpanded={false}
                isExpandedView={isExpandedView}
                isLoading={isGroupLoading}
                isLoaded={isGroupLoaded}
                onExpand={() => handleGroupInteraction(group.id, 'expand')}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}