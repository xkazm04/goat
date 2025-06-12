import { BorderGradient, PatternOverlay } from "@/app/components/decorations/cardDecor";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { BacklogGroup } from "@/app/types/backlog-groups";
import BacklogGroupsHeader from "../BacklogGroupsHeader/BacklogGroupsHeader";
import { useBacklogFiltering } from "@/app/hooks/use-backlog-filtering";
import { EmptyState } from "./EmptyState";
import { BacklogGroupsGrid } from "./BacklogGroupsGrid";
import { BacklogCategoryInfo } from "./BacklogCategoryInfo";
import { LoadingIndicator } from "./LoadingIndicator";

type Props = {
  isExpandedView: boolean;
  filteredGroups: BacklogGroup[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isLoading: boolean;
  backlogGroups: BacklogGroup[];
  showEditorsPickOnly: boolean;
  onToggleEditorsPick: () => void;
  filteredItemsCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  totalItems: number;
  apiTotalItems: number;
  currentList: { category: string; subcategory?: string } | null;
  expandedViewMode: 'grid' | 'list';
  setExpandedViewMode: (mode: 'grid' | 'list') => void;
  setIsExpanded: (value: boolean) => void;
  isMobile: boolean;
  error?: any;
  onRefresh: () => void;
  onRemoveItem: (groupId: string, itemId: string) => void;
  onGroupExpand?: (groupId: string) => void; // Added prop
  onOpenModal?: () => void; // ADD THIS
  onCloseModal?: () => void;
  isModal?: boolean;
}

const SidebarContent = ({ 
  isExpandedView, 
  filteredGroups, 
  searchTerm, 
  setSearchTerm, 
  isLoading, 
  backlogGroups, 
  showEditorsPickOnly,
  onToggleEditorsPick,
  filteredItemsCount,
  hasActiveFilters,
  onClearFilters,
  totalItems,
  apiTotalItems,
  currentList, 
  expandedViewMode, 
  setExpandedViewMode,
  setIsExpanded,
  isMobile,
  error,
  onRefresh,
  onRemoveItem,
  onGroupExpand,
  onOpenModal, // ADD THIS
  onCloseModal,
  isModal = false
}: Props) => {

  // Create filter stats object for compatibility
  const filterStats = {
    filteredItemsCount,
    hasActiveFilters,
    totalGroups: filteredGroups.length
  };

  // Debugging information
  console.log('🎨 SidebarContent render:', {
    filteredGroupsCount: filteredGroups.length,
    groupNames: filteredGroups.map(g => g.name),
    isExpandedView,
    expandedViewMode
  });

  return (
    <div 
      className={`relative rounded-3xl overflow-hidden h-fit flex flex-col group ${
        isExpandedView ? 'h-full max-h-screen' : ''
      }`}
      style={{
        background: `
          linear-gradient(135deg, 
            rgba(15, 23, 42, 0.95) 0%,
            rgba(30, 41, 59, 0.98) 25%,
            rgba(51, 65, 85, 0.95) 50%,
            rgba(30, 41, 59, 0.98) 75%,
            rgba(15, 23, 42, 0.95) 100%
          )
        `,
        border: '2px solid transparent',
        backgroundClip: 'padding-box',
        boxShadow: isExpandedView
          ? `
            0 0 0 1px rgba(71, 85, 105, 0.4),
            0 10px 25px -5px rgba(0, 0, 0, 0.5),
            0 25px 50px -12px rgba(0, 0, 0, 0.6),
            inset 0 1px 0 rgba(148, 163, 184, 0.1)
          `
          : `
            0 0 0 1px rgba(71, 85, 105, 0.3),
            0 4px 6px -1px rgba(0, 0, 0, 0.3),
            0 20px 25px -5px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(148, 163, 184, 0.1)
          `
      }}
    >
      <BorderGradient />
      <PatternOverlay />

      {/* Enhanced Header with Search and Filters */}
      <div className="relative flex-shrink-0">
        {/* Header - UPDATE TO PASS MODAL HANDLER */}
        <BacklogGroupsHeader
          totalItems={totalItems}
          matchedItems={0}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          isExpanded={isExpandedView}
          onToggleExpanded={() => setIsExpanded(!isExpandedView)}
          showEditorsPickOnly={showEditorsPickOnly}
          onToggleEditorsPick={onToggleEditorsPick}
          filteredItemsCount={filteredItemsCount}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={onClearFilters}
          error={error}
          onOpenModal={onOpenModal} // ADD THIS
          onCloseModal={onCloseModal}
          isModal={isModal}
        />
        
        {/* View Mode Toggle - Only in expanded view */}
        {isExpandedView && (
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex-1" />
              
              {/* View Mode Toggle */}
              <div className="flex bg-slate-800/50 rounded-lg p-1">
                <button
                  onClick={() => setExpandedViewMode('list')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    expandedViewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setExpandedViewMode('grid')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    expandedViewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Grid
                </button>
              </div>
              
              <motion.div 
                className="text-xs text-slate-400"
                key={`groups-count-${filterStats.totalGroups}`}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {filterStats.totalGroups} {filterStats.totalGroups === 1 ? 'group' : 'groups'}
              </motion.div>
            </div>
          </div>
        )}
      </div>
      
      {/* Groups Container */}
      <div 
        className={`flex-1 overflow-y-auto p-6 space-y-4 relative ${
          isExpandedView ? 'max-h-full' : ''
        }`}
        style={{
          background: `
            linear-gradient(180deg, 
              rgba(15, 23, 42, 0.7) 0%,
              rgba(30, 41, 59, 0.8) 100%
            )
          `,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(71, 85, 105, 0.5) transparent'
        }}
      >
        {/* Loading Indicator */}
        {isLoading && backlogGroups.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center py-12"
          >
            <div className="flex items-center gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading groups...</span>
            </div>
          </motion.div>
        )}

        {/* Scroll Fade Effects */}
        <div 
          className="absolute top-0 left-0 right-0 h-6 pointer-events-none z-10"
          style={{
            background: `
              linear-gradient(180deg, 
                rgba(30, 41, 59, 0.8) 0%,
                transparent 100%
              )
            `
          }}
        />
        <div 
          className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none z-10"
          style={{
            background: `
              linear-gradient(0deg, 
                rgba(30, 41, 59, 0.8) 0%,
                transparent 100%
              )
            `
          }}
        />

        {/* Groups Grid */}
        <BacklogGroupsGrid
          groups={filteredGroups} // This should have the groups
          isExpandedView={isExpandedView}
          expandedViewMode={expandedViewMode}
          isMobile={isMobile}
          onRemoveItem={onRemoveItem}
          onGroupExpand={onGroupExpand}
        />
        
        {/* Empty State */}
        <AnimatePresence>
          {filteredGroups.length === 0 && !isLoading && (
            <EmptyState
              filterStats={filterStats}
              searchTerm={searchTerm}
              showEditorsPickOnly={showEditorsPickOnly}
              onClearFilters={onClearFilters}
            />
          )}
        </AnimatePresence>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-900/20 border border-red-700/30 rounded-lg p-4 text-center"
          >
            <p className="text-red-300 text-sm mb-2">Failed to load groups</p>
            <button
              onClick={onRefresh}
              className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded text-xs transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Category Info */}
        <BacklogCategoryInfo
          currentList={currentList}
          filterStats={filterStats}
          totalItems={totalItems}
          apiTotalItems={apiTotalItems}
          groupsCount={filteredGroups.length}
        />
      </div>

      {/* Custom CSS for scrollbar */}
      <style jsx>{`
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.5);
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 0.7);
        }
      `}</style>
    </div>
  );
};

export default SidebarContent;