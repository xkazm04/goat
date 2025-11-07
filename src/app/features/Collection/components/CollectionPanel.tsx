"use client";

import { useState, useRef, useEffect } from "react";
import { CollectionGroup } from "../types";
import { CategoryBar } from "./CategoryBar";
import { CollectionHeader } from "./CollectionHeader";
import { CollectionSearch } from "./CollectionSearch";
import { CollectionItem } from "./CollectionItem";
import { CollectionStats } from "./CollectionStats";
import { AddItemModal } from "./AddItemModal";
import { StickyContext } from "./StickyContext";
import { VirtualizedGrid } from "./VirtualizedGrid";
import { useCollectionFilters } from "../hooks/useCollectionFilters";
import { useCollectionStats } from "../hooks/useCollectionStats";
import { useBacklogStore } from "@/stores/backlog-store";
import { useCurrentList } from "@/stores/use-list-store";

interface CollectionPanelProps {
  groups: CollectionGroup[];
  className?: string;
}

/**
 * Main Collection Panel Component
 * 
 * Features:
 * - Fixed bottom positioning
 * - Category bar as thin top bar (replaces sidebar)
 * - Search functionality
 * - Grid/List view modes
 * - Drag and drop support
 * - Statistics display
 */
export function CollectionPanel({ groups, className = "" }: CollectionPanelProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showStickyContext, setShowStickyContext] = useState(false);
  const [isDraggingItem, setIsDraggingItem] = useState(false);

  const itemsAreaRef = useRef<HTMLDivElement>(null);

  const initializeGroups = useBacklogStore(state => state.initializeGroups);
  const currentList = useCurrentList();

  const {
    filter,
    selectedGroups,
    filteredItems,
    toggleGroup,
    selectAll,
    deselectAll,
    setSearchTerm
  } = useCollectionFilters(groups);

  const stats = useCollectionStats(groups, filter.selectedGroupIds);

  const handleAddItemSuccess = async () => {
    // Refresh groups after adding item
    if (currentList?.category) {
      await initializeGroups(currentList.category, currentList.subcategory, true);
    }
  };

  // Scroll tracking for sticky context
  useEffect(() => {
    const itemsArea = itemsAreaRef.current;
    if (!itemsArea) return;

    const handleScroll = () => {
      // Show sticky context when scrolled past category bar (50px threshold)
      setShowStickyContext(itemsArea.scrollTop > 50);
    };

    itemsArea.addEventListener('scroll', handleScroll);
    return () => itemsArea.removeEventListener('scroll', handleScroll);
  }, []);

  // Track drag state
  useEffect(() => {
    const handleDragStart = () => setIsDraggingItem(true);
    const handleDragEnd = () => setIsDraggingItem(false);

    window.addEventListener('dragstart', handleDragStart);
    window.addEventListener('dragend', handleDragEnd);

    return () => {
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  return (
    <>
      {/* Sticky Context Indicator */}
      <StickyContext
        isVisible={showStickyContext && isVisible}
        categoryName={currentList?.category || "All Categories"}
        itemCount={filteredItems.length}
        isDragging={isDraggingItem}
        selectedGroupName={
          selectedGroups.length === 1
            ? selectedGroups[0].name
            : selectedGroups.length > 1
            ? `${selectedGroups.length} groups`
            : undefined
        }
      />

      <div
        className={`
          fixed bottom-0 left-0 right-0
          bg-gray-900/98 backdrop-blur-md
          border-t border-gray-700/50
          z-40
          transition-transform duration-300 ease-in-out
          shadow-2xl
          ${isVisible ? 'translate-y-0' : 'translate-y-full'}
          ${className}
        `}
        style={{
          maxHeight: 'calc(100vh - 2rem)',
          height: isVisible ? 'auto' : '0'
        }}
      >
        {/* Header with toggle button */}
        <CollectionHeader
          stats={stats}
          isVisible={isVisible}
          onToggleVisibility={() => setIsVisible(!isVisible)}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onAddItem={() => setIsAddModalOpen(true)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

      {/* Main Content */}
      {isVisible && (
        <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[600px] min-h-[300px]">
          {/* Category Bar - Thin top bar */}
          <div className="border-b border-gray-700/50 bg-gray-900/50">
            <CategoryBar
              groups={groups}
              selectedGroupIds={filter.selectedGroupIds}
              onToggleGroup={toggleGroup}
            />
          </div>

          {/* Search Bar */}
          <div className="px-4 py-2 border-b border-gray-700/50 bg-gray-900/30">
            <CollectionSearch
              value={filter.searchTerm}
              onChange={setSearchTerm}
              placeholder="Search items by name or description..."
            />
          </div>

          {/* Items Area */}
          <div ref={itemsAreaRef} className="flex-1 overflow-y-auto p-4">
            {selectedGroups.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">No groups selected</p>
                  <button
                    onClick={selectAll}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Select all groups
                  </button>
                </div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-gray-500">
                  {filter.searchTerm 
                    ? `No items found matching "${filter.searchTerm}"`
                    : 'No items in selected groups'
                  }
                </p>
              </div>
            ) : viewMode === 'grid' && filteredItems.length > 50 ? (
              /* Use virtualized grid for large collections (50+ items) */
              <VirtualizedGrid
                items={filteredItems}
                renderItem={(item, index) => {
                  const groupId = (item as any).groupId || '';
                  return (
                    <CollectionItem
                      key={`${groupId}-${item.id}`}
                      item={item}
                      groupId={groupId}
                      viewMode="grid"
                      index={index}
                    />
                  );
                }}
                itemHeight={120} // Approximate height of grid item (aspect-square + padding)
                columns={12} // Max columns (xl breakpoint)
                gap={8} // 2 * 4px (gap-2)
                className="h-full"
                overscan={3}
              />
            ) : (
              /* Standard grid/list for smaller collections */
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2'
                  : 'space-y-2'
              }>
                {filteredItems.map((item, index) => {
                  // Find groupId from the item (added by useCollectionFilters)
                  const groupId = (item as any).groupId || '';
                  return (
                    <CollectionItem
                      key={`${groupId}-${item.id}`}
                      item={item}
                      groupId={groupId}
                      viewMode={viewMode}
                      index={index}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Stats */}
          <div className="px-4 py-2 border-t border-gray-700/50 bg-gray-900/50">
            <CollectionStats stats={stats} />
          </div>
        </div>
      )}
    </div>

    {/* Add Item Modal */}
    <AddItemModal
      isOpen={isAddModalOpen}
      onClose={() => setIsAddModalOpen(false)}
      onSuccess={handleAddItemSuccess}
    />
  </>
  );
}

