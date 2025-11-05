"use client";

import { useBacklogStore } from "@/stores/backlog-store";
import { useGridStore } from "@/stores/grid-store";
import { motion } from "framer-motion";
import React, { useMemo, useState, useCallback } from "react";
import BacklogGroupGrid from "./BacklogGroupGrid";
import BackloGroupHeader from "./BacklogGroupHeader";
import { useCurrentList } from "@/stores/use-list-store";
import { ResearchItemModal } from "./ResearchItemModal";
import { BacklogGroup as BacklogGroupType } from "@/types/backlog-groups";

interface BacklogGroupProps {
  group: BacklogGroupType;
  isExpandedView?: boolean;
  defaultExpanded?: boolean;
  isLoading?: boolean;
  isLoaded?: boolean;
  onExpand?: () => void;
}

export const BacklogGroup = React.memo(function BacklogGroup({
  group,
  isExpandedView = false,
  defaultExpanded = false,
  isLoading = false,
  isLoaded = false,
  onExpand
}: BacklogGroupProps) {
  const {
    addItemToGroup,
    removeItemFromGroup
    // REMOVED: getGroupItems - this was causing conflicts
  } = useBacklogStore();
  
  const { gridItems } = useGridStore();
  const currentList = useCurrentList();

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);

  // FIXED: Use only group.items directly - no store conflicts
  const memoizedGroupItems = useMemo(() => {
    // Use only the items from the group prop - single source of truth
    const items = group.items || [];
    
    console.log(`📋 Group ${group.id} (${group.name}): ${items.length} items from prop`);
    
    return Array.isArray(items) ? items : [];
  }, [group.items, group.id]); // Simplified dependencies

  // Get IDs of items used in the grid - stable reference
  const assignedItemIds = useMemo(() => {
    return new Set(
      gridItems
        .filter(gridItem => gridItem.matched && gridItem.backlogItemId)
        .map(gridItem => gridItem.backlogItemId!)
    );
  }, [gridItems]);

  // Filter available items (not in grid) - stable reference
  const availableItems = useMemo(() =>
    memoizedGroupItems.filter(item => !assignedItemIds.has(item.id)),
    [memoizedGroupItems, assignedItemIds]
  );

  // Check if this is a database group (not custom) - stable reference
  const isDatabaseGroup = useMemo(() =>
    memoizedGroupItems.some(item =>
      item.id && item.id.length > 10 && !item.id.startsWith('item-')
    ),
    [memoizedGroupItems]
  );

  // Handle toggle group expansion
  const handleToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    if (newExpanded && !isLoaded && onExpand) {
      onExpand();
    }
  }, [isExpanded, isLoaded, onExpand]);

  // Handle adding custom or researched items
  const handleAddResearchedItem = useCallback(async (researchedItem: any) => {
    const backlogItem = {
      id: researchedItem.item_id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: researchedItem.name,
      title: researchedItem.name,
      description: researchedItem.description || '',
      category: researchedItem.category || currentList?.category || 'sports',
      subcategory: researchedItem.subcategory || currentList?.subcategory,
      item_year: researchedItem.item_year,
      item_year_to: researchedItem.item_year_to,
      image_url: researchedItem.image_url,
      created_at: new Date().toISOString(),
      tags: researchedItem.tags || []
    };

    addItemToGroup(group.id, backlogItem);
  }, [addItemToGroup, group.id, currentList]);

  const handleCloseResearchModal = useCallback(() => {
    setIsResearchModalOpen(false);
  }, []);

  const handleOpenResearchModal = useCallback(() => {
    setIsResearchModalOpen(true);
  }, []);

  return (
    <>
      <motion.div
        className="rounded-xl border overflow-hidden transition-all duration-200 hover:shadow-lg"
        style={{
          background: `linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.9) 100%)`,
          border: '1px solid rgba(71, 85, 105, 0.4)',
          boxShadow: isExpanded
            ? '0 8px 25px rgba(0, 0, 0, 0.3)'
            : '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
        // FIXED: Remove layout animation that was causing issues
        animate={{
          boxShadow: isExpanded
            ? '0 8px 25px rgba(0, 0, 0, 0.3)'
            : '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <BackloGroupHeader
          handleToggle={handleToggle}
          group={group}
          isExpanded={isExpanded}
          isLoading={isLoading}
          isLoaded={isLoaded}
          displayCount={availableItems.length}
          groupItems={memoizedGroupItems}
          shouldShowLoading={isLoading && memoizedGroupItems.length === 0}
          isDatabaseGroup={isDatabaseGroup}
        />

        {/* Items Grid */}
        <BacklogGroupGrid
          displayItems={availableItems}
          group={{
            id: group.id,
            name: group.name,
            items: memoizedGroupItems
          }}
          isExpanded={isExpanded}
          isDatabaseGroup={isDatabaseGroup}
          isExpandedView={isExpandedView}
          availableItems={availableItems}
          assignedItemIds={assignedItemIds}
          isLoading={isLoading && memoizedGroupItems.length === 0}
          hasLoadedItems={memoizedGroupItems.length > 0}
          onAddNewItem={handleOpenResearchModal}
          onRemoveItem={(itemId: string) => removeItemFromGroup(group.id, itemId)}
        />
      </motion.div>

      {/* Add Item Modal */}
      <ResearchItemModal
        isOpen={isResearchModalOpen}
        onClose={handleCloseResearchModal}
        onConfirm={handleAddResearchedItem}
        groupTitle={group.name}
        category={currentList?.category || 'sports'}
        subcategory={currentList?.subcategory || ''}
      />
    </>
  );
}, (prevProps, nextProps) => {
  // IMPROVED: More specific comparison to prevent unnecessary re-renders
  const hasItemsChanged = 
    (prevProps.group.items?.length || 0) !== (nextProps.group.items?.length || 0) ||
    prevProps.group.item_count !== nextProps.group.item_count ||
    // Check if the actual items array changed
    JSON.stringify(prevProps.group.items?.map(i => i.id) || []) !== 
    JSON.stringify(nextProps.group.items?.map(i => i.id) || []);
    
  return (
    prevProps.group.id === nextProps.group.id &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.isLoaded === nextProps.isLoaded &&
    prevProps.isExpandedView === nextProps.isExpandedView &&
    prevProps.defaultExpanded === nextProps.defaultExpanded &&
    !hasItemsChanged
  );
});