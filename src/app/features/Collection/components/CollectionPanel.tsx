"use client";

import { useState, useMemo } from "react";
import { CollectionGroup } from "../types";
import { CollectionToolbar } from "./CollectionToolbar";
import { CollectionItem } from "./CollectionItem";
import { CollectionStats } from "./CollectionStats";
import { AddItemModal } from "./AddItemModal";
import { LazyLoadTrigger } from "./LazyLoadTrigger";
import { VirtualizedCollectionList } from "./VirtualizedCollectionList";
import { useCollection } from "../hooks/useCollection";
import { useCollectionLazyLoad } from "../hooks/useCollectionLazyLoad";
import { useCurrentList } from "@/stores/use-list-store";
import { CollectionFiltersProvider } from "../context/CollectionFiltersContext";
import { shouldUseVirtualization, shouldUseLazyLoading } from "../constants/lazyLoadConfig";
import { CollectionErrorBoundary } from "./CollectionErrorBoundary";

interface CollectionPanelProps {
  groups?: CollectionGroup[]; // Now optional - can be fetched via hook
  className?: string;
  category?: string;
  subcategory?: string;
  enablePagination?: boolean;
}

/**
 * Internal Collection Panel Component (without ErrorBoundary)
 *
 * Features:
 * - Fixed bottom positioning
 * - Category bar as thin top bar (replaces sidebar)
 * - Search functionality
 * - Grid/List view modes
 * - Drag and drop support
 * - Statistics display
 * - Unified data fetching with caching and optimistic updates
 */
function CollectionPanelInternal({
  groups: externalGroups,
  className = "",
  category,
  subcategory,
  enablePagination = false
}: CollectionPanelProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const currentList = useCurrentList();

  // Use unified collection hook for data fetching and mutations
  const collection = useCollection({
    category: category || currentList?.category,
    subcategory: subcategory || currentList?.subcategory,
    enablePagination,
    pageSize: 50,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  // Use external groups if provided (backward compatibility), otherwise use hook data
  const groups = externalGroups || collection.groups;
  const filteredItems = collection.filteredItems;
  const selectedGroups = collection.selectedGroups;
  const stats = collection.stats;

  // Determine rendering strategy based on item count
  const useVirtualization = useMemo(
    () => shouldUseVirtualization(filteredItems.length),
    [filteredItems.length]
  );

  const useLazyLoading = useMemo(
    () => !useVirtualization && shouldUseLazyLoading(filteredItems.length),
    [useVirtualization, filteredItems.length]
  );

  // Lazy loading for medium-sized collections
  const lazyLoad = useCollectionLazyLoad({
    items: filteredItems,
    enabled: useLazyLoading
  });

  // Determine which items to render
  const itemsToRender = useMemo(() => {
    if (useVirtualization) {
      // Virtualization handles its own slicing
      return filteredItems;
    }
    if (useLazyLoading) {
      // Use lazy-loaded slice
      return lazyLoad.visibleItems;
    }
    // Small collections: render all
    return filteredItems;
  }, [useVirtualization, useLazyLoading, filteredItems, lazyLoad.visibleItems]);

  const handleAddItemSuccess = async () => {
    // Invalidate cache to refetch fresh data
    collection.invalidateCache();
  };

  // Prepare context value for provider
  const contextValue = {
    filter: collection.filter,
    groups,
    filteredItems,
    selectedGroups,
    stats,
    setSearchTerm: collection.setSearchTerm,
    toggleGroup: collection.toggleGroup,
    selectAllGroups: collection.selectAllGroups,
    deselectAllGroups: collection.deselectAllGroups,
    setSortBy: collection.setSortBy,
    setSortOrder: collection.setSortOrder,
    isLoading: collection.isLoading,
    isError: collection.isError,
    error: collection.error
  };

  return (
    <CollectionFiltersProvider value={contextValue}>
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
        data-testid="collection-panel"
      >
        {/* Unified Toolbar: Header + Category Bar + Search */}
        <CollectionToolbar
          stats={stats}
          isVisible={isVisible}
          onToggleVisibility={() => setIsVisible(!isVisible)}
          onSelectAll={collection.selectAllGroups}
          onDeselectAll={collection.deselectAllGroups}
          onAddItem={() => setIsAddModalOpen(true)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showCategoryBar={true}
          showSearch={true}
        />

      {/* Main Content */}
      {isVisible && (
        <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[600px] min-h-[300px]">

          {/* Loading State */}
          {collection.isLoading && (
            <div className="flex-1 flex items-center justify-center" data-testid="collection-loading">
              <div className="text-sm text-gray-400">Loading items...</div>
            </div>
          )}

          {/* Error State */}
          {collection.isError && (
            <div className="flex-1 flex items-center justify-center" data-testid="collection-error">
              <div className="text-sm text-red-400">
                Error loading items: {collection.error?.message}
              </div>
            </div>
          )}

          {/* Items Area */}
          {!collection.isLoading && !collection.isError && (
            <div className="flex-1 overflow-y-auto p-4">
              {selectedGroups.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-2">No groups selected</p>
                    <button
                      onClick={collection.selectAllGroups}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      data-testid="select-all-groups-btn"
                    >
                      Select all groups
                    </button>
                  </div>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-gray-500">
                    {collection.filter.searchTerm
                      ? `No items found matching "${collection.filter.searchTerm}"`
                      : 'No items in selected groups'
                    }
                  </p>
                </div>
              ) : useVirtualization ? (
                // Large collections: Use virtualized list
                <>
                  <div className="mb-2 text-xs text-gray-400 flex items-center justify-between">
                    <span>Virtualized rendering ({filteredItems.length} items)</span>
                    <span className="text-cyan-400">High performance mode</span>
                  </div>
                  <VirtualizedCollectionList
                    items={itemsToRender}
                    viewMode={viewMode}
                    gridCols={viewMode === 'grid' ? 12 : 1}
                    containerHeight={500}
                    testId="virtualized-collection"
                  />
                </>
              ) : (
                // Normal or lazy-loaded rendering
                <>
                  {useLazyLoading && (
                    <div className="mb-2 text-xs text-gray-400 flex items-center justify-between">
                      <span>Loaded {lazyLoad.loadedCount} of {lazyLoad.totalItems} items</span>
                      <span className="text-cyan-400">{lazyLoad.loadProgress}% loaded</span>
                    </div>
                  )}
                  <div className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2'
                      : 'space-y-2'
                  }>
                    {itemsToRender.map((item, index) => {
                      // Find groupId from the item metadata
                      const groupId = (item.metadata?.group as string) || '';
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

                  {/* Lazy load trigger */}
                  {useLazyLoading && lazyLoad.hasMore && (
                    <LazyLoadTrigger
                      onVisible={lazyLoad.loadMore}
                      enabled={!lazyLoad.isLoadingMore}
                      isLoading={lazyLoad.isLoadingMore}
                      loadingMessage={`Loading more items... (${lazyLoad.loadedCount}/${lazyLoad.totalItems})`}
                      testId="collection-lazy-load-trigger"
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* Pagination Controls (if enabled) */}
          {enablePagination && collection.pagination.totalPages > 1 && (
            <div className="px-4 py-2 border-t border-gray-700/50 bg-gray-900/50 flex items-center justify-between">
              <button
                onClick={collection.pagination.prevPage}
                disabled={collection.pagination.page === 1}
                className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                data-testid="prev-page-btn"
              >
                Previous
              </button>
              <span className="text-xs text-gray-400">
                Page {collection.pagination.page} of {collection.pagination.totalPages}
              </span>
              <button
                onClick={collection.pagination.nextPage}
                disabled={!collection.pagination.hasMore}
                className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                data-testid="next-page-btn"
              >
                Next
              </button>
            </div>
          )}

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
    </CollectionFiltersProvider>
  );
}

/**
 * Main Collection Panel Component (Wrapped in ErrorBoundary)
 *
 * This is the exported version that includes error boundary protection.
 * Guarantees that unexpected errors in child logic (e.g., CollectionStats,
 * CollectionSearch) do not unmount the entire page.
 */
export function CollectionPanel(props: CollectionPanelProps) {
  return (
    <CollectionErrorBoundary>
      <CollectionPanelInternal {...props} />
    </CollectionErrorBoundary>
  );
}
