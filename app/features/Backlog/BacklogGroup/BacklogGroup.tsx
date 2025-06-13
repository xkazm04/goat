"use client";

import { useBacklogStore } from "@/app/stores/backlog-store";
import { useGridStore } from "@/app/stores/grid-store";
import { motion } from "framer-motion";
import React, { useMemo, useState, useCallback, useEffect } from "react";
import BacklogGroupGrid from "./BacklogGroupGrid";
import BackloGroupHeader from "./BacklogGroupHeader";
import { useCurrentList } from "@/app/stores/use-list-store";
import { ResearchItemModal } from "./ResearchItemModal";
import { BacklogGroup as BacklogGroupType } from "@/app/types/backlog-groups";

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
    removeItemFromGroup,
    getGroupItems
  } = useBacklogStore();
  
  const {
    gridItems,
  } = useGridStore();

  const currentList = useCurrentList();

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [showMatched, setShowMatched] = useState(false);

  // Get group items - either from the group or from the store
  // Ensure this always returns an array
  const memoizedGroupItems = useMemo(() => {
    const items = getGroupItems(group.id);
    return Array.isArray(items) ? items : [];
  }, [getGroupItems, group.id]);

  // Get IDs of items used in the grid
  const assignedItemIds = useMemo(() => {
    return new Set(
      gridItems
        .filter(gridItem => gridItem.matched && gridItem.backlogItemId)
        .map(gridItem => gridItem.backlogItemId!)
    );
  }, [gridItems]);

  // Filter available items (not in grid)
  const availableItems = useMemo(() =>
    memoizedGroupItems.filter(item => !assignedItemIds.has(item.id)),
    [memoizedGroupItems, assignedItemIds]
  );

  // Display items based on filter
  const displayItems = useMemo(() =>
    showMatched ? 
      memoizedGroupItems.filter(item => assignedItemIds.has(item.id)) : 
      availableItems,
    [showMatched, memoizedGroupItems, availableItems, assignedItemIds]
  );

  // Check if this is a database group (not custom)
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

  // Safely compute display count for matched vs unmatched items
  const displayCount = useMemo(() => {
    if (showMatched) {
      return memoizedGroupItems.filter(item => assignedItemIds.has(item.id)).length;
    }
    return availableItems.length;
  }, [memoizedGroupItems, availableItems, showMatched, assignedItemIds]);

  const shouldShowLoading = isLoading && !isLoaded && memoizedGroupItems.length === 0;

  // Add debug logging and fix the item mapping:
  // Inside the component, after getGroupItems but before rendering the items:
  useEffect(() => {
    const items = memoizedGroupItems;
    if (items && items.length > 0) {
      const sampleItems = items.slice(0, 2);
      console.log(`📋 Group ${group.id} items:`, {
        count: items.length,
        samples: sampleItems.map(item => ({
          id: item.id,
          title: item.title || item.name,
          hasImageUrl: !!item.image_url,
          imageUrl: item.image_url || 'NONE'
        }))
      });
    }
  }, [memoizedGroupItems, group.id]);

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
          displayCount={displayCount}
          totalCount={memoizedGroupItems.length}
          groupItems={memoizedGroupItems}
          shouldShowLoading={shouldShowLoading}
          isDatabaseGroup={isDatabaseGroup}
          showMatched={showMatched}
          setShowMatched={setShowMatched}
        />

        {/* Items Grid */}
        <BacklogGroupGrid
          displayItems={displayItems}
          group={{
            id: group.id,
            name: group.name,
            items: memoizedGroupItems
          }}
          isExpanded={isExpanded}
          isDatabaseGroup={isDatabaseGroup}
          showMatched={showMatched}
          setShowMatched={setShowMatched}
          isExpandedView={isExpandedView}
          availableItems={availableItems}
          assignedItemIds={assignedItemIds}
          isLoading={shouldShowLoading}
          hasLoadedItems={isLoaded && memoizedGroupItems.length > 0}
          onAddNewItem={handleOpenResearchModal}
          onRemoveItem={(itemId) => removeItemFromGroup(group.id, itemId)}
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
  // Custom comparison function to prevent unnecessary renders
  // Only re-render if important props change
  return (
    prevProps.group.id === nextProps.group.id &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.isLoaded === nextProps.isLoaded &&
    prevProps.isExpandedView === nextProps.isExpandedView &&
    prevProps.defaultExpanded === nextProps.defaultExpanded &&
    // Don't compare the entire group object, just the important parts
    prevProps.group.item_count === nextProps.group.item_count
  );
});