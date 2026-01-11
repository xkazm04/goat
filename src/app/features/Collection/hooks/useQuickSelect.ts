"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { CollectionItem } from '../types';
import { useGridStore } from '@/stores/grid-store';
import { useBacklogStore } from '@/stores/backlog-store';

/**
 * Quick-select mode states
 */
export type QuickSelectMode = 'off' | 'item-selection' | 'position-assignment';

export interface QuickSelectState {
  /** Current mode of quick-select */
  mode: QuickSelectMode;
  /** Selected item ID (when in item-selection mode) */
  selectedItemId: string | null;
  /** Index of selected item in the visible list (0-8 for keys 1-9) */
  selectedIndex: number | null;
  /** Whether quick-select is active */
  isActive: boolean;
  /** Visual feedback message */
  statusMessage: string;
}

export interface UseQuickSelectOptions {
  /** Items currently visible in the collection (filtered, available) */
  visibleItems: CollectionItem[];
  /** Whether quick-select is enabled */
  enabled?: boolean;
  /** Callback when an item is assigned to a grid position */
  onItemAssigned?: (item: CollectionItem, position: number) => void;
  /** Maximum items to show quick-select numbers for (default: 9) */
  maxQuickSelectItems?: number;
}

export interface UseQuickSelectReturn {
  /** Current quick-select state */
  state: QuickSelectState;
  /** Toggle quick-select mode on/off */
  toggleQuickSelect: () => void;
  /** Activate quick-select mode */
  activateQuickSelect: () => void;
  /** Deactivate quick-select mode */
  deactivateQuickSelect: () => void;
  /** Handle number key press (1-9 for items, 1-0 for positions) */
  handleKeyPress: (key: string) => boolean;
  /** Clear current selection */
  clearSelection: () => void;
  /** Get quick-select number for an item (1-9) or null if not in quick-select range */
  getQuickSelectNumber: (itemId: string) => number | null;
  /** Check if an item is currently selected */
  isItemSelected: (itemId: string) => boolean;
  /** Items that have quick-select numbers */
  quickSelectItems: CollectionItem[];
}

/**
 * Hook for keyboard-driven quick item selection and grid assignment
 *
 * Like Linear's command-driven workflow:
 * 1. Press 'q' to enter quick-select mode
 * 2. Press 1-9 to select an item from the visible list
 * 3. Press 1-0 to assign to grid position 1-10
 *
 * Integrates with existing search: type to filter, then use number keys
 * to quickly pick from filtered results.
 */
export function useQuickSelect({
  visibleItems,
  enabled = true,
  onItemAssigned,
  maxQuickSelectItems = 9,
}: UseQuickSelectOptions): UseQuickSelectReturn {
  const [mode, setMode] = useState<QuickSelectMode>('off');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Get grid store for assignment
  const assignItemToGrid = useGridStore((s) => s.assignItemToGrid);
  const canAddAtPosition = useGridStore((s) => s.canAddAtPosition);
  const getNextAvailableGridPosition = useGridStore((s) => s.getNextAvailableGridPosition);
  const markItemAsUsed = useBacklogStore((s) => s.markItemAsUsed);

  // Get the first N items for quick-select
  const quickSelectItems = useMemo(() => {
    return visibleItems.slice(0, maxQuickSelectItems);
  }, [visibleItems, maxQuickSelectItems]);

  // Build a map from item ID to quick-select number
  const itemToNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    quickSelectItems.forEach((item, index) => {
      map.set(item.id, index + 1);
    });
    return map;
  }, [quickSelectItems]);

  // Clear selection when items change significantly
  useEffect(() => {
    if (selectedItemId && !visibleItems.find(item => item.id === selectedItemId)) {
      setSelectedItemId(null);
      setSelectedIndex(null);
      if (mode === 'position-assignment') {
        setMode('item-selection');
        setStatusMessage('Item no longer available. Select another item (1-9)');
      }
    }
  }, [visibleItems, selectedItemId, mode]);

  // Reset status message after delay
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const toggleQuickSelect = useCallback(() => {
    if (mode === 'off') {
      setMode('item-selection');
      setStatusMessage('Quick-select: Press 1-9 to select an item');
    } else {
      setMode('off');
      setSelectedItemId(null);
      setSelectedIndex(null);
      setStatusMessage('');
    }
  }, [mode]);

  const activateQuickSelect = useCallback(() => {
    if (mode === 'off') {
      setMode('item-selection');
      setStatusMessage('Quick-select: Press 1-9 to select an item');
    }
  }, [mode]);

  const deactivateQuickSelect = useCallback(() => {
    setMode('off');
    setSelectedItemId(null);
    setSelectedIndex(null);
    setStatusMessage('');
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItemId(null);
    setSelectedIndex(null);
    if (mode === 'position-assignment') {
      setMode('item-selection');
      setStatusMessage('Selection cleared. Press 1-9 to select an item');
    }
  }, [mode]);

  const assignToPosition = useCallback((item: CollectionItem, position: number) => {
    // Convert 1-based position to 0-based index
    const gridPosition = position - 1;

    if (!canAddAtPosition(gridPosition)) {
      setStatusMessage(`Position ${position} is not available`);
      return false;
    }

    // Create backlog item format for grid store with all required BacklogItem fields
    const backlogItem = {
      id: item.id,
      name: item.title,
      title: item.title,
      description: item.description || '',
      image_url: item.image_url || undefined,
      tags: item.tags || [],
      category: item.category || 'unknown',
      subcategory: item.subcategory,
      created_at: new Date().toISOString(),
    };

    // Assign to grid
    assignItemToGrid(backlogItem, gridPosition);

    // Mark as used in backlog store
    markItemAsUsed(item.id, true);

    // Call callback
    onItemAssigned?.(item, position);

    // Reset state for next selection
    setSelectedItemId(null);
    setSelectedIndex(null);
    setMode('item-selection');
    setStatusMessage(`Assigned "${item.title}" to position ${position}`);

    return true;
  }, [assignItemToGrid, canAddAtPosition, markItemAsUsed, onItemAssigned]);

  const handleKeyPress = useCallback((key: string): boolean => {
    if (!enabled || mode === 'off') return false;

    // Escape to exit
    if (key === 'Escape') {
      deactivateQuickSelect();
      return true;
    }

    // Number keys 1-9 and 0
    const numMatch = key.match(/^[0-9]$/);
    if (!numMatch) return false;

    const num = parseInt(key);
    const effectiveNum = num === 0 ? 10 : num;

    if (mode === 'item-selection') {
      // In item-selection mode, 1-9 selects an item
      if (num === 0) {
        // 0 is not valid for item selection (only 1-9)
        setStatusMessage('Press 1-9 to select an item');
        return true;
      }

      const itemIndex = num - 1;
      if (itemIndex < quickSelectItems.length) {
        const item = quickSelectItems[itemIndex];
        setSelectedItemId(item.id);
        setSelectedIndex(itemIndex);
        setMode('position-assignment');
        setStatusMessage(`Selected "${item.title}". Press 1-0 for position, Enter for next available`);
        return true;
      } else {
        setStatusMessage(`No item at position ${num}`);
        return true;
      }
    }

    if (mode === 'position-assignment') {
      // In position-assignment mode, 1-0 assigns to grid position
      const selectedItem = visibleItems.find(item => item.id === selectedItemId);
      if (!selectedItem) {
        setMode('item-selection');
        setStatusMessage('Selection lost. Press 1-9 to select an item');
        return true;
      }

      return assignToPosition(selectedItem, effectiveNum);
    }

    return false;
  }, [enabled, mode, quickSelectItems, visibleItems, selectedItemId, deactivateQuickSelect, assignToPosition]);

  // Handle Enter key for next available position
  useEffect(() => {
    if (!enabled || mode !== 'position-assignment') return;

    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && selectedItemId) {
        const selectedItem = visibleItems.find(item => item.id === selectedItemId);
        if (selectedItem) {
          const nextPosition = getNextAvailableGridPosition();
          if (nextPosition !== null) {
            assignToPosition(selectedItem, nextPosition + 1); // Convert to 1-based
            e.preventDefault();
          } else {
            setStatusMessage('No available grid positions');
          }
        }
      }
    };

    window.addEventListener('keydown', handleEnter);
    return () => window.removeEventListener('keydown', handleEnter);
  }, [enabled, mode, selectedItemId, visibleItems, getNextAvailableGridPosition, assignToPosition]);

  const getQuickSelectNumber = useCallback((itemId: string): number | null => {
    if (mode === 'off') return null;
    return itemToNumberMap.get(itemId) ?? null;
  }, [mode, itemToNumberMap]);

  const isItemSelected = useCallback((itemId: string): boolean => {
    return selectedItemId === itemId;
  }, [selectedItemId]);

  const state: QuickSelectState = {
    mode,
    selectedItemId,
    selectedIndex,
    isActive: mode !== 'off',
    statusMessage,
  };

  return {
    state,
    toggleQuickSelect,
    activateQuickSelect,
    deactivateQuickSelect,
    handleKeyPress,
    clearSelection,
    getQuickSelectNumber,
    isItemSelected,
    quickSelectItems,
  };
}
