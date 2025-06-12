"use client";

import { BacklogItemType } from "@/app/types/match";
import { BacklogItem as BacklogItemData } from "@/app/types/backlog-groups";
import { useHierarchyStore, useSelectedBacklogItem } from "@/app/stores/hierarchy-store";
import { BacklogItem } from "./BacklogItem";

interface BacklogItemAdapterProps {
  item: BacklogItemData;
  groupId: string;
  isDragOverlay?: boolean;
}

export function BacklogItemAdapter({ item, groupId, isDragOverlay = false }: BacklogItemAdapterProps) {
  const { setSelectedBacklogItem } = useHierarchyStore();
  const selectedBacklogItem = useSelectedBacklogItem();
  
  // Convert BacklogItem to BacklogItemType for compatibility
  const adaptedItem: BacklogItemType = {
    id: item.id,
    title: item.name || item.title || '',
    description: item.description || '',
    tags: item.tags || [],
    matched: item.matched || false,
    groupId: groupId,
    // Add any other required fields with defaults
  };

  const isSelected = selectedBacklogItem === item.id;

  const handleClick = () => {
    if (!item.matched) {
      setSelectedBacklogItem(isSelected ? null : item.id);
    }
  };

  return (
    <BacklogItem
      item={adaptedItem}
      groupId={groupId}
      isDragOverlay={isDragOverlay}
      onClick={handleClick}
      isSelected={isSelected}
    />
  );
}