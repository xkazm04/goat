"use client";

import { BacklogGroupType } from "@/app/types/match";
import { BacklogItem } from "./BacklogItem";
import { AddItemPlaceholder } from "./AddItemPlaceholder";
import { AddItemModal } from "./AddItemModal";
import { useItemStore } from "@/app/stores/item-store";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Gamepad2, ChevronDown, Database, Trophy, Music, Film, Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";

interface BacklogGroupProps {
  group: BacklogGroupType;
  isExpandedView?: boolean;
}

const getGroupIcon = (title: string) => {
  const lower = title.toLowerCase();
  if (lower.includes('game') || lower.includes('video')) {
    return Gamepad2;
  }
  if (lower.includes('basketball') || lower.includes('soccer') || lower.includes('hockey')) {
    return Trophy;
  }
  if (lower.includes('music') || lower.includes('rock') || lower.includes('artist')) {
    return Music;
  }
  if (lower.includes('movie') || lower.includes('film')) {
    return Film;
  }
  return Users;
};

export function BacklogGroup({ group, isExpandedView = false }: BacklogGroupProps) {
  const { 
    toggleBacklogGroup, 
    addItemToGroup,
    gridItems // Get current grid items to check assignments
  } = useItemStore();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showMatched, setShowMatched] = useState(false);
  
  // Get list of assigned item IDs from grid
  const assignedItemIds = useMemo(() => {
    return new Set(
      gridItems
        .filter(gridItem => gridItem.matched && gridItem.matchedWith)
        .map(gridItem => gridItem.matchedWith)
    );
  }, [gridItems]);
  
  // Filter items based on assignment status and matched status
  const availableItems = useMemo(() => 
    group.items.filter(item => 
      !item.matched && // Not matched in backlog
      !assignedItemIds.has(item.id) // Not assigned to grid
    ), 
    [group.items, assignedItemIds]
  );
  
  const assignedItems = useMemo(() =>
    group.items.filter(item => 
      item.matched || assignedItemIds.has(item.id)
    ),
    [group.items, assignedItemIds]
  );
  
  const displayItems = showMatched ? group.items : availableItems;
  
  const IconComponent = getGroupIcon(group.title);
  
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Toggling group:', group.id, 'Current isOpen:', group.isOpen);
    toggleBacklogGroup(group.id);
  };

  const handleAddItem = async (title: string) => {
    await addItemToGroup(group.id, title);
  };

  // Check if this group came from database (has proper IDs)
  const isDatabaseGroup = group.items.some(item => 
    item.id && item.id.length > 10 && !item.id.startsWith('item-')
  );

  // Calculate grid columns based on view mode and screen size
  const getGridClasses = () => {
    if (isExpandedView) {
      return "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3";
    }
    return "grid grid-cols-2 sm:grid-cols-3 gap-3";
  };

  // Debug logging
  console.log('BacklogGroup render:', {
    groupId: group.id,
    groupTitle: group.title,
    isOpen: group.isOpen,
    totalItems: group.items.length,
    availableItems: availableItems.length,
    assignedItems: assignedItems.length,
    assignedItemIds: Array.from(assignedItemIds)
  });

  return (
    <>
      <div 
        className="rounded-xl border overflow-hidden transition-all duration-200 hover:shadow-lg"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(30, 41, 59, 0.8) 0%,
              rgba(51, 65, 85, 0.9) 100%
            )
          `,
          border: '1px solid rgba(71, 85, 105, 0.4)',
          boxShadow: group.isOpen 
            ? '0 8px 25px rgba(0, 0, 0, 0.3)' 
            : '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Header */}
        <button
          onClick={handleToggle}
          className="w-full p-4 flex items-center gap-3 text-left transition-all duration-200 hover:bg-slate-700/30 group"
        >
          <div 
            className="p-2 rounded-lg transition-colors duration-200"
            style={{
              background: isDatabaseGroup ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              color: isDatabaseGroup ? '#4ade80' : '#93c5fd'
            }}
          >
            {isDatabaseGroup ? (
              <Database className="w-4 h-4" />
            ) : (
              <IconComponent className="w-4 h-4" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate text-slate-200 group-hover:text-white transition-colors">
                {group.title}
              </h3>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Show matched toggle - only show if there are assigned items */}
            {assignedItems.length > 0 && group.isOpen && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMatched(!showMatched);
                }}
                className="p-1 rounded hover:bg-slate-600/50 transition-colors"
                title={showMatched ? "Hide ranked items" : "Show ranked items"}
              >
                {showMatched ? (
                  <EyeOff className="w-4 h-4 text-slate-400" />
                ) : (
                  <Eye className="w-4 h-4 text-slate-400" />
                )}
              </button>
            )}
            
            <div 
              className="px-2 py-1 rounded text-xs font-medium transition-colors"
              style={{
                background: isDatabaseGroup ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                color: isDatabaseGroup ? '#4ade80' : '#60a5fa'
              }}
            >
              {displayItems.length}
            </div>
            
            {/* Expand/Collapse Indicator */}
            <div className="text-slate-400 group-hover:text-slate-300 transition-all duration-200">
              <motion.div
                animate={{ rotate: group.isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </div>
          </div>
        </button>
        
        {/* Items Grid */}
        <AnimatePresence mode="wait">
          {group.isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ 
                duration: 0.3,
                ease: [0.04, 0.62, 0.23, 0.98]
              }}
              className="overflow-hidden"
            >
              <div 
                className="p-4"
                style={{
                  background: 'rgba(15, 23, 42, 0.4)'
                }}
              >
                {/* Items Grid with Responsive Layout */}
                <div className={getGridClasses()}>
                  {/* Add Item Placeholder - only show for non-database groups and when not showing matched */}
                  {!isDatabaseGroup && !showMatched && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      layout
                    >
                      <AddItemPlaceholder onClick={() => setIsAddModalOpen(true)} />
                    </motion.div>
                  )}

                  {/* Items */}
                  <AnimatePresence mode="popLayout">
                    {displayItems.map((item, index) => (
                      <motion.div
                        key={`${item.id}-${showMatched ? 'matched' : 'available'}`}
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -10 }}
                        transition={{ 
                          duration: 0.2, 
                          delay: ((!isDatabaseGroup && !showMatched) ? index + 1 : index) * 0.03,
                          layout: { duration: 0.2 }
                        }}
                        layout
                      >
                        <BacklogItem 
                          item={{
                            ...item,
                            matched: item.matched || assignedItemIds.has(item.id)
                          }}
                          isAssignedToGrid={assignedItemIds.has(item.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                
                {/* Empty States */}
                {displayItems.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                  >
                    <div className="text-sm text-slate-400 mb-2">
                      {showMatched 
                        ? "No ranked items yet"
                        : availableItems.length === 0 && assignedItems.length > 0
                        ? "All items from this group are ranked"
                        : "No items in this group yet"
                      }
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex justify-center gap-2 mt-3">
                      {!isDatabaseGroup && !showMatched && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAddModalOpen(true);
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors px-3 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20"
                        >
                          Add first item
                        </button>
                      )}
                      
                      {assignedItems.length > 0 && !showMatched && availableItems.length === 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMatched(true);
                          }}
                          className="text-xs text-green-400 hover:text-green-300 transition-colors px-3 py-1 rounded-lg bg-green-500/10 hover:bg-green-500/20"
                        >
                          View ranked items
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Group Stats Footer */}
                <div className="mt-4 pt-3 border-t border-slate-600/30">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-slate-400">
                      <span>{availableItems.length} available</span>
                      {assignedItems.length > 0 && (
                        <span className="text-green-400">{assignedItems.length} ranked</span>
                      )}
                      <span className="text-slate-500">
                        {group.items.length} total
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Item Modal - only for non-database groups */}
      {!isDatabaseGroup && (
        <AddItemModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onConfirm={handleAddItem}
          groupTitle={group.title}
        />
      )}
    </>
  );
}