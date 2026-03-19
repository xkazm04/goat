"use client";

import { useState, useMemo, useRef, useEffect, useDeferredValue } from "react";
import { CollectionToolbar } from "./CollectionToolbar";
import { ConfigurableCollectionItem, COLLECTION_VIEW_CONFIG, type HoistedStoreState } from "./ConfigurableCollectionItem";
import { CollectionStats } from "./CollectionStats";
import { AddItemModal } from "./AddItemModal";
import { StickyContext } from "./StickyContext";
import { useCollection } from "../hooks/useCollection";
import { useCurrentList } from "@/stores/use-list-store";
import { useListStore } from "@/stores/use-list-store";
import { useConsensusStore, useConsensusSortBy } from "@/stores/consensus-store";
import { useCriteriaStore } from "@/stores/criteria-store";
import { CollectionErrorBoundary } from "./CollectionErrorBoundary";
import { EmptyTrophyCase, NoSearchResults } from "@/components/illustrations/EmptyStateIllustrations";
import { MasonryGrid } from "@/components/ui/masonry-grid";
import { useItemStatsBatch } from "@/hooks/use-item-stats";

interface CollectionPanelProps {
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
  className = "",
  category,
  subcategory,
  enablePagination = false,
}: CollectionPanelProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showStickyContext, setShowStickyContext] = useState(false);
  const [isDraggingItem, setIsDraggingItem] = useState(false);

  const itemsAreaRef = useRef<HTMLDivElement>(null);
  const currentList = useCurrentList();

  // Hoist global store subscriptions to parent level.
  // Instead of each ConfigurableCollectionItem subscribing to these stores
  // individually (200 items x 4 stores = 800 subscriptions), we subscribe
  // once here and pass the values down as props.
  const consensusViewMode = useConsensusStore((state) => state.viewMode);
  const consensusSortBy = useConsensusSortBy();
  const activeProfileId = useCriteriaStore((state) => state.activeProfileId);
  const listCategory = useListStore((state) => state.currentList)?.category;

  const hoistedState = useMemo<HoistedStoreState>(() => ({
    consensusViewMode,
    consensusSortBy,
    activeProfileId,
    listCategory,
  }), [consensusViewMode, consensusSortBy, activeProfileId, listCategory]);

  // Use unified collection hook for data fetching and mutations
  const collection = useCollection({
    category: category || currentList?.category,
    subcategory: subcategory || currentList?.subcategory,
    enablePagination,
    pageSize: 50,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  // Single source of truth: useCollection hook owns all data
  const groups = Array.isArray(collection.groups) ? collection.groups : [];

  // Guard: Ensure filteredItems is always a valid array
  // Use useDeferredValue to prevent search keystrokes from blocking input
  const rawFilteredItems = Array.isArray(collection.filteredItems)
    ? collection.filteredItems
    : [];
  const filteredItems = useDeferredValue(rawFilteredItems);

  const selectedGroups = collection.selectedGroups;
  const stats = collection.stats;

  const displayItems = filteredItems;

  // Batch-prefetch item stats for all visible items in a single request.
  // Seeds individual query caches so AverageRankingBadge finds data immediately.
  const displayItemIds = useMemo(
    () => displayItems.map(item => item.id),
    [displayItems]
  );
  useItemStatsBatch(displayItemIds, {
    enabled: COLLECTION_VIEW_CONFIG.showAverageRankingBadge && displayItemIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const handleAddItemSuccess = async () => {
    // Invalidate cache to refetch fresh data
    collection.invalidateCache();
  };

  // Scroll tracking for sticky context (RAF-throttled)
  useEffect(() => {
    const itemsArea = itemsAreaRef.current;
    if (!itemsArea) return;

    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        setShowStickyContext(itemsArea.scrollTop > 50);
        rafId = null;
      });
    };

    itemsArea.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      itemsArea.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
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
          glass-dock-panel
          z-sticky
          transition-all duration-(--glass-transition-slow) ease-(--glass-easing)
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
          groups={groups}
          selectedGroupIds={collection.filter.selectedGroupIds}
          onToggleGroup={collection.toggleGroup}
          searchValue={collection.filter.searchTerm}
          onSearchChange={collection.setSearchTerm}
          showCategoryBar={true}
          showSearch={true}
        />

      {/* Main Content */}
      {isVisible && (
        <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[600px] min-h-[300px]">

          {/* Loading State - Skeleton Grid */}
          {collection.isLoading && (
            <div className="flex-1 p-4" data-testid="collection-loading" role="status" aria-label="Loading collection items">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="aspect-3/4 glass-dock-skeleton" />
                ))}
              </div>
              <span className="sr-only">Loading items...</span>
            </div>
          )}

          {/* Error State */}
          {collection.isError && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4" data-testid="collection-error" role="alert">
              <div className="text-center">
                <p className="text-sm text-red-400 mb-1">Failed to load items</p>
                <p className="text-xs text-slate-500">{collection.error?.message}</p>
              </div>
              <button
                onClick={() => collection.invalidateCache()}
                className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-white rounded-control transition-all duration-(--glass-transition-normal) ease-(--glass-easing)
                  glass-dock-focus hover:shadow-(--glass-shadow-elevated)"
                aria-label="Retry loading items"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Items Area */}
          {!collection.isLoading && !collection.isError && (
            <div ref={itemsAreaRef} className="flex-1 overflow-y-auto p-4 glass-dock-content">
              {selectedGroups.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-slate-500 mb-2">No groups selected</p>
                    <button
                      onClick={collection.selectAllGroups}
                      className="text-xs text-brand-hover hover:text-brand-hover transition-all duration-(--glass-transition-normal) hover:underline underline-offset-2"
                      data-testid="select-all-groups-btn"
                    >
                      Select all groups
                    </button>
                  </div>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-2">
                  {collection.filter.searchTerm ? (
                    <NoSearchResults width={120} height={96} />
                  ) : (
                    <EmptyTrophyCase width={120} height={96} />
                  )}
                  <p className="text-sm text-slate-500">
                    {collection.filter.searchTerm
                      ? `No items found matching "${collection.filter.searchTerm}"`
                      : 'No items in selected groups'
                    }
                  </p>
                </div>
              ) : (
                <>
                  {viewMode === 'grid' ? (
                    <MasonryGrid
                      columns={{ sm: 4, md: 6, lg: 8, xl: 10 }}
                      gap={8}
                      enableTransitions={true}
                      testId="collection-masonry-grid"
                    >
                      {displayItems.map((item, index) => {
                        const groupId = (item.metadata?.group_id as string) || '';
                        const isSpotlight = collection.spotlightItemId === item.id;
                        return (
                          <ConfigurableCollectionItem
                            key={`${groupId}-${item.id}`}
                            item={item}
                            groupId={groupId}
                            viewMode={viewMode}
                            index={index}
                            isSpotlight={isSpotlight}
                            config={COLLECTION_VIEW_CONFIG}
                            hoistedState={hoistedState}
                          />
                        );
                      })}
                    </MasonryGrid>
                  ) : (
                    <div className="space-y-2">
                      {displayItems.map((item, index) => {
                        const groupId = (item.metadata?.group_id as string) || '';
                        const isSpotlight = collection.spotlightItemId === item.id;
                        return (
                          <ConfigurableCollectionItem
                            key={`${groupId}-${item.id}`}
                            item={item}
                            groupId={groupId}
                            viewMode={viewMode}
                            index={index}
                            isSpotlight={isSpotlight}
                            config={COLLECTION_VIEW_CONFIG}
                            hoistedState={hoistedState}
                          />
                        );
                      })}
                    </div>
                  )}

                </>
              )}
            </div>
          )}

          {/* Pagination Controls (if enabled) */}
          {enablePagination && collection.pagination.totalPages > 1 && (
            <div className="px-4 py-2 border-t border-(--glass-border-subtle) glass-dock-header flex items-center justify-between">
              <button
                onClick={collection.pagination.prevPage}
                disabled={collection.pagination.page === 1}
                className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-all duration-(--glass-transition-normal) hover:shadow-md glass-dock-focus"
                data-testid="prev-page-btn"
              >
                Previous
              </button>
              <span className="text-xs text-slate-400 transition-colors duration-(--glass-transition-normal)">
                Page {collection.pagination.page} of {collection.pagination.totalPages}
              </span>
              <button
                onClick={collection.pagination.nextPage}
                disabled={!collection.pagination.hasMore}
                className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-all duration-(--glass-transition-normal) hover:shadow-md glass-dock-focus"
                data-testid="next-page-btn"
              >
                Next
              </button>
            </div>
          )}

          {/* Footer Stats */}
          <div className="px-4 py-2 border-t border-(--glass-border-subtle) glass-dock-header">
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
