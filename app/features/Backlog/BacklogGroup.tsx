"use client";

import { BacklogGroupType } from "@/app/types/match"
import { AddItemModal } from "./AddItemModal";
import { useItemStore } from "@/app/stores/item-store";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useMemo, useState, useCallback } from "react";
import Image from "next/image";
import BacklogGroupGrid from "./BacklogGroups/BacklogGroupGrid";

interface BacklogGroupProps {
  group: BacklogGroupType;
  isExpandedView?: boolean;
  defaultExpanded?: boolean;
}

export function BacklogGroup({ 
  group, 
  isExpandedView = false, 
  defaultExpanded = false 
}: BacklogGroupProps) {
  const { 
    addItemToGroup,
    gridItems 
  } = useItemStore();
  
  // Use defaultExpanded only for initial state, then maintain internal state
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showMatched, setShowMatched] = useState(false);
  
  // Stable memoized computations
  const assignedItemIds = useMemo(() => {
    return new Set(
      gridItems
        .filter(gridItem => gridItem.matched && gridItem.matchedWith)
        .map(gridItem => gridItem.matchedWith)
    );
  }, [gridItems]);
  
  const availableItems = useMemo(() => 
    group.items.filter(item => 
      !item.matched && !assignedItemIds.has(item.id)
    ), 
    [group.items, assignedItemIds]
  );

  const displayItems = useMemo(() => 
    showMatched ? group.items : availableItems,
    [showMatched, group.items, availableItems]
  );

  const isDatabaseGroup = useMemo(() => 
    group.items.some(item => 
      item.id && item.id.length > 10 && !item.id.startsWith('item-')
    ),
    [group.items]
  );
  
  // Stable callbacks
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  }, []);

  const handleAddItem = useCallback(async (title: string) => {
    await addItemToGroup(group.id, title);
  }, [addItemToGroup, group.id]);

  const handleCloseModal = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  return (
    <>
      <motion.div 
        className="rounded-xl border overflow-hidden transition-all duration-200 hover:shadow-lg"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(30, 41, 59, 0.8) 0%,
              rgba(51, 65, 85, 0.9) 100%
            )
          `,
          border: '1px solid rgba(71, 85, 105, 0.4)',
          boxShadow: isExpanded 
            ? '0 8px 25px rgba(0, 0, 0, 0.3)' 
            : '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
        animate={{
          boxShadow: isExpanded 
            ? '0 8px 25px rgba(0, 0, 0, 0.3)' 
            : '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <motion.button
          onClick={handleToggle}
          className="w-full p-4 relative flex items-center gap-3 text-left transition-all duration-200 hover:bg-slate-700/30 group"
          whileHover={{ backgroundColor: 'rgba(51, 65, 85, 0.3)' }}
          whileTap={{ scale: 0.98 }}
        >
          <Image
            src={`/groups/group_hockey_redwings.svg`}
            alt={group.title}
            fill
            style={{ objectFit: 'contain' }}
            className="opacity-20 absolute"
          />
          
          <div className="flex-1 min-w-0 relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate text-slate-200 group-hover:text-white transition-colors">
                {group.title}
              </h3>
            </div>
          </div>
          
          <div className="flex items-center gap-2 relative z-10">
            <motion.div 
              className="px-2 py-1 rounded text-xs font-medium transition-colors"
              style={{
                background: isDatabaseGroup ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                color: isDatabaseGroup ? '#4ade80' : '#60a5fa'
              }}
              whileHover={{ scale: 1.05 }}
            >
              {displayItems.length}
            </motion.div>
            
            {/* Expand/Collapse Indicator */}
            <div className="text-slate-400 group-hover:text-slate-300 transition-all duration-200">
              <motion.div
                animate={{ 
                  rotate: isExpanded ? 180 : 0,
                  scale: isExpanded ? 1.1 : 1
                }}
                transition={{ 
                  duration: 0.3,
                  ease: [0.04, 0.62, 0.23, 0.98]
                }}
                whileHover={{ scale: 1.2 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </div>
          </div>
        </motion.button>
        
        {/* Items Grid */}
        <BacklogGroupGrid
          displayItems={displayItems}
          group={group}
          isExpanded={isExpanded}
          isDatabaseGroup={isDatabaseGroup}
          showMatched={showMatched}
          setShowMatched={setShowMatched}
          isExpandedView={isExpandedView}
          availableItems={availableItems}
          setIsAddModalOpen={setIsAddModalOpen}
          assignedItemIds={assignedItemIds}
        />
      </motion.div>

      {/* Add Item Modal */}
      {!isDatabaseGroup && (
        <AddItemModal
          isOpen={isAddModalOpen}
          onClose={handleCloseModal}
          onConfirm={handleAddItem}
          groupTitle={group.title}
        />
      )}
    </>
  );
}