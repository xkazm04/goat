"use client";

import { useItemStore } from "@/app/stores/item-store";
import { motion } from "framer-motion";
import { useMemo, useState, useCallback } from "react";
import BacklogGroupGrid from "./BacklogGroupGrid";
import BackloGroupHeader from "./BacklogGroupHeader";
import { useCurrentList } from "@/app/stores/use-list-store";
import { ResearchItemModal } from "./ResearchItemModal";
import { useGroupItemLoading } from "@/app/hooks/use-group-item-loading";
import { useSessionStore } from "@/app/stores/session-store";

interface BacklogGroupProps {
  group: {
    id: string;
    name: string;
    description?: string;
    items: any[];
    item_count: number;
  };
  isExpandedView?: boolean;
  defaultExpanded?: boolean;
  isLoading?: boolean;
  isLoaded?: boolean;
  onExpand?: (groupId: string) => void;
  itemCount?: number;
  onRemoveItem?: (groupId: string, itemId: string) => void;
}

export function BacklogGroup({
  group,
  isExpandedView = false,
  defaultExpanded = false,
  isLoading = false,
  isLoaded = false,
  onExpand,
  itemCount,
  onRemoveItem
}: BacklogGroupProps) {
  const { addItemToGroup, gridItems } = useItemStore();
  const { getGroupItems } = useSessionStore(); // Use session store instead
  const currentList = useCurrentList();
  const { loadGroupItems, isGroupLoaded, isGroupLoading } = useGroupItemLoading();

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [showMatched, setShowMatched] = useState(false);

  // FIXED: Use session store data as primary source with better fallback
  const groupItems = useMemo(() => {
    try {
      // Get items from session store (this is where loaded items are stored)
      const sessionItems = getGroupItems(group.id);
      const hasSessionItems = Array.isArray(sessionItems) && sessionItems.length > 0;
      
      // Fallback to group.items if no session items (but session should be primary)
      const hasGroupItems = Array.isArray(group.items) && group.items.length > 0;
      
      const finalItems = hasSessionItems ? sessionItems : (hasGroupItems ? group.items : []);
      
      console.log(`🔍 Group ${group.name} items source:`, {
        groupId: group.id,
        sessionItemsCount: hasSessionItems ? sessionItems.length : 0,
        groupItemsCount: hasGroupItems ? group.items.length : 0,
        finalItemsCount: finalItems.length,
        usingSession: hasSessionItems,
        isLoaded: isGroupLoaded(group.id),
        groupItemCount: group.item_count || 0
      });
      
      return finalItems;
    } catch (error) {
      console.error(`❌ Error getting items for group ${group.name}:`, error);
      return Array.isArray(group.items) ? group.items : [];
    }
  }, [getGroupItems, group.id, group.items, group.name, group.item_count, isGroupLoaded]);

  const assignedItemIds = useMemo(() => {
    return new Set(
      gridItems
        .filter(gridItem => gridItem !== null && gridItem.matched && gridItem.matchedWith)
        .map(gridItem => gridItem!.matchedWith)
    );
  }, [gridItems]);

  const availableItems = useMemo(() =>
    groupItems.filter(item => {
      const isAssigned = assignedItemIds.has(item.id);
      const isMatched = item.matched;
      return !isAssigned && !isMatched;
    }),
    [groupItems, assignedItemIds]
  );

  const displayItems = useMemo(() =>
    showMatched ? groupItems.filter(item =>
      item.matched || assignedItemIds.has(item.id)
    ) : availableItems,
    [showMatched, groupItems, availableItems, assignedItemIds]
  );

  const displayCount = useMemo(() => {
    if (itemCount !== undefined) return itemCount;
    return showMatched 
      ? groupItems.filter(item => item.matched || assignedItemIds.has(item.id)).length
      : availableItems.length;
  }, [itemCount, showMatched, groupItems, availableItems, assignedItemIds]);

  const handleToggle = useCallback(async () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    
    // Only trigger loading if expanding and parent wants to handle it
    if (newExpanded && onExpand) {
      console.log(`🔄 BacklogGroup: Expanding group ${group.name}, triggering onExpand`);
      onExpand(group.id);
    }
  }, [isExpanded, onExpand, group.id, group.name]);


  const handleResearchAdd = useCallback(async (researchedItem: any) => {
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
      tags: []
    };

    await addItemToGroup(group.id, backlogItem);
  }, [addItemToGroup, group.id, currentList]);

  const handleCloseModal = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  const handleCloseResearchModal = useCallback(() => {
    setIsResearchModalOpen(false);
  }, []);

  const handleOpenResearchModal = useCallback(() => {
    setIsResearchModalOpen(true);
  }, []);

  const isDatabaseGroup = group.id.startsWith('group-') || group.id.includes('-');
  
  // Use actual loading state from the hook, not derived state
  const shouldShowLoading = isGroupLoading(group.id);
  const hasLoadedItems = isGroupLoaded(group.id) && groupItems.length > 0;

  console.log(`🎯 Group ${group.name} render state:`, {
    groupId: group.id,
    itemsCount: groupItems.length,
    isExpanded,
    shouldShowLoading,
    hasLoadedItems,
    isDatabaseGroup,
    displayItemsCount: displayItems.length
  });

  return (
    <>
      <motion.div
        className="group cursor-pointer relative"
        layout
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <BackloGroupHeader
          handleToggle={handleToggle}
          group={group}
          isExpanded={isExpanded}
          isLoading={shouldShowLoading}
          isLoaded={hasLoadedItems}
          displayCount={displayCount}
          groupItems={groupItems}
          shouldShowLoading={shouldShowLoading}
          isDatabaseGroup={isDatabaseGroup}
        />

        {/* Items Grid */}
        <BacklogGroupGrid
          displayItems={displayItems}
          group={{
            id: group.id,
            name: group.name,
            items: groupItems
          }}
          isExpanded={isExpanded}
          isDatabaseGroup={isDatabaseGroup}
          showMatched={showMatched}
          setShowMatched={setShowMatched}
          isExpandedView={isExpandedView}
          availableItems={availableItems}
          setIsAddModalOpen={setIsAddModalOpen}
          assignedItemIds={assignedItemIds}
          isLoading={shouldShowLoading}
          hasLoadedItems={hasLoadedItems}
          onAddNewItem={handleOpenResearchModal}
        />
      </motion.div>

      {/* Research Modal */}
      {isResearchModalOpen && (
        <ResearchItemModal
          isOpen={isResearchModalOpen}
          onClose={handleCloseResearchModal}
          onConfirm={handleResearchAdd}
          groupTitle={group.name}
          category={currentList?.category || 'sports'}
          subcategory={currentList?.subcategory || ''}
        />
      )}
    </>
  );
}