import { useMemo } from 'react';
import { useItemStore } from '@/stores/item-store/index';
import { useMatchStore } from '@/stores/match-store';
import { useListStore } from '@/stores/use-list-store';
import { useBacklogStore } from '@/stores/backlog/store';

/**
 * useMatchGridState Hook
 * Aggregates and memoizes all store selectors needed for Match Grid operations
 * This centralizes state management and improves performance through selective subscriptions
 */
export const useMatchGridState = () => {
  // Item Store - Grid state and operations
  const gridItems = useItemStore((state) => state.gridItems);
  const activeItem = useItemStore((state) => state.activeItem);
  const selectedBacklogItem = useItemStore((state) => state.selectedBacklogItem);
  const selectedGridItem = useItemStore((state) => state.selectedGridItem);
  const assignItemToGrid = useItemStore((state) => state.assignItemToGrid);
  const removeItemFromGrid = useItemStore((state) => state.removeItemFromGrid);
  const canAddAtPosition = useItemStore((state) => state.canAddAtPosition);
  const handleDragEnd = useItemStore((state) => state.handleDragEnd);
  const setActiveItem = useItemStore((state) => state.setActiveItem);
  const setSelectedGridItem = useItemStore((state) => state.setSelectedGridItem);

  // Match Store - Session and UI state
  const keyboardMode = useMatchStore((state) => state.keyboardMode);
  const setKeyboardMode = useMatchStore((state) => state.setKeyboardMode);
  const quickAssignToPosition = useMatchStore((state) => state.quickAssignToPosition);
  const initializeMatchSession = useMatchStore((state) => state.initializeMatchSession);
  const showResultShareModal = useMatchStore((state) => state.showResultShareModal);
  const setShowResultShareModal = useMatchStore((state) => state.setShowResultShareModal);

  // List Store - Current list metadata
  const currentList = useListStore((state) => state.currentList);
  const listSize = currentList?.size;
  const listCategory = currentList?.category;

  // Backlog Store - Backlog groups and items
  const backlogGroups = useBacklogStore((state) => state.groups);
  const selectedItemId = useBacklogStore((state) => state.selectedItemId);

  // Memoized derived state
  const gridStatistics = useMemo(() => {
    const filled = gridItems.filter((item) => item.matched).length;
    const total = gridItems.length;
    const empty = total - filled;
    const percentage = Math.round((filled / total) * 100);

    return {
      filled,
      empty,
      total,
      percentage,
      isComplete: filled === total
    };
  }, [gridItems]);

  // Memoized check if dragging a backlog item
  const isDraggingBacklogItem = useMemo(() => {
    if (!activeItem || !backlogGroups || !Array.isArray(backlogGroups)) {
      return false;
    }

    const allItems = backlogGroups
      .flatMap((group) => Array.isArray(group.items) ? group.items : [])
      .filter((item) => item && typeof item === 'object');

    return allItems.some((item) => item && item.id === activeItem);
  }, [activeItem, backlogGroups]);

  // Memoized check if dragging a grid item
  const isDraggingGridItem = useMemo(() => {
    if (!activeItem || typeof activeItem !== 'string') {
      return false;
    }
    return activeItem.startsWith('grid-');
  }, [activeItem]);

  return {
    // Grid State
    gridItems,
    activeItem,
    selectedBacklogItem,
    selectedGridItem,
    gridStatistics,

    // Grid Operations
    assignItemToGrid,
    removeItemFromGrid,
    canAddAtPosition,
    handleDragEnd,
    setActiveItem,
    setSelectedGridItem,

    // Match Session State
    keyboardMode,
    setKeyboardMode,
    quickAssignToPosition,
    initializeMatchSession,
    showResultShareModal,
    setShowResultShareModal,

    // List Metadata
    currentList,
    listSize,
    listCategory,

    // Backlog State
    backlogGroups,
    selectedItemId,

    // Derived State
    isDraggingBacklogItem,
    isDraggingGridItem,
  };
};

/**
 * useMatchGridActions Hook
 * Provides only action functions without state
 * Useful for components that only need to dispatch actions
 */
export const useMatchGridActions = () => {
  const assignItemToGrid = useItemStore((state) => state.assignItemToGrid);
  const removeItemFromGrid = useItemStore((state) => state.removeItemFromGrid);
  const handleDragEnd = useItemStore((state) => state.handleDragEnd);
  const setActiveItem = useItemStore((state) => state.setActiveItem);
  const setSelectedGridItem = useItemStore((state) => state.setSelectedGridItem);
  const setKeyboardMode = useMatchStore((state) => state.setKeyboardMode);
  const quickAssignToPosition = useMatchStore((state) => state.quickAssignToPosition);
  const initializeMatchSession = useMatchStore((state) => state.initializeMatchSession);

  return {
    assignItemToGrid,
    removeItemFromGrid,
    handleDragEnd,
    setActiveItem,
    setSelectedGridItem,
    setKeyboardMode,
    quickAssignToPosition,
    initializeMatchSession,
  };
};

/**
 * useMatchGridSelectors Hook
 * Provides only state selectors without actions
 * Useful for read-only components
 */
export const useMatchGridSelectors = () => {
  const gridItems = useItemStore((state) => state.gridItems);
  const activeItem = useItemStore((state) => state.activeItem);
  const selectedBacklogItem = useItemStore((state) => state.selectedBacklogItem);
  const selectedGridItem = useItemStore((state) => state.selectedGridItem);
  const keyboardMode = useMatchStore((state) => state.keyboardMode);
  const currentList = useListStore((state) => state.currentList);
  const backlogGroups = useBacklogStore((state) => state.groups);

  return {
    gridItems,
    activeItem,
    selectedBacklogItem,
    selectedGridItem,
    keyboardMode,
    currentList,
    backlogGroups,
  };
};
