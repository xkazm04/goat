"use client";

import { useItemStore } from "@/app/stores/item-store";
import { motion } from "framer-motion";
import { useMemo, useState, useCallback } from "react";
import BacklogGroupGrid from "./BacklogGroupGrid";
import BackloGroupHeader from "./BacklogGroupHeader";
import { useCurrentList } from "@/app/stores/use-list-store";
import { ResearchItemModal } from "./ResearchItemModal";

interface BacklogGroupProps {
  group: {
    id: string;
    name: string;
    items: any[];
    isOpen?: boolean;
  };
  isExpandedView?: boolean;
  defaultExpanded?: boolean;
  isLoading?: boolean;
  isLoaded?: boolean;
  onExpand?: () => void;
  itemCount?: number;
}

export function BacklogGroup({
  group,
  isExpandedView = false,
  defaultExpanded = false,
  isLoading = false,
  isLoaded = false,
  onExpand,
  itemCount
}: BacklogGroupProps) {
  const {
    addItemToGroup,
    gridItems,
    getGroupItems
  } = useItemStore();

  const currentList = useCurrentList();

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false); // New state
  const [showMatched, setShowMatched] = useState(false);

  const groupItems = useMemo(() => {
    const storeItems = getGroupItems(group.id);
    return storeItems.length > 0 ? storeItems : group.items;
  }, [getGroupItems, group.id, group.items]);

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

  const isDatabaseGroup = useMemo(() =>
    groupItems.some(item =>
      item.id && item.id.length > 10 && !item.id.startsWith('item-')
    ),
    [groupItems]
  );

  const handleToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    if (newExpanded && !isLoaded && groupItems.length === 0 && onExpand) {
      onExpand();
    }
  }, [isExpanded, isLoaded, groupItems.length, onExpand]);

  // Quick add for custom groups
  const handleAddItem = useCallback(async (itemData: any) => {
    const backlogItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: typeof itemData === 'string' ? itemData : itemData.title || itemData.name,
      title: typeof itemData === 'string' ? itemData : itemData.title || itemData.name,
      description: typeof itemData === 'object' ? itemData.description : '',
      category: currentList?.category || 'sports',
      subcategory: currentList?.subcategory,
      item_year: undefined,
      item_year_to: undefined,
      image_url: undefined,
      created_at: new Date().toISOString(),
      tags: typeof itemData === 'object' ? itemData.tags || [] : []
    };

    await addItemToGroup(group.id, backlogItem);
  }, [addItemToGroup, group.id, currentList]);

  // Research-based add for both group types
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

  const displayCount = useMemo(() => {
    if (itemCount !== undefined) return itemCount;
    return displayItems.length;
  }, [itemCount, displayItems.length]);

  const shouldShowLoading = isLoading && groupItems.length === 0;

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
        <BackloGroupHeader
          handleToggle={handleToggle}
          group={group}
          isExpanded={isExpanded}
          isLoading={isLoading}
          isLoaded={isLoaded}
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
          hasLoadedItems={isLoaded && groupItems.length > 0}
          onAddNewItem={handleOpenResearchModal}
        />
      </motion.div>

      {/* Add Item Modal */}
        <ResearchItemModal
          isOpen={isResearchModalOpen}
          onClose={handleCloseResearchModal}
          onConfirm={handleResearchAdd}
          groupTitle={group.name}
          category={currentList?.category || 'sports'}
          subcategory={currentList?.subcategory || ''}
        />
    </>
  );
}