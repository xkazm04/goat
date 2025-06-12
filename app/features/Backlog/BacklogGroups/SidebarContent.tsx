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
  filteredGroups: BacklogGroup[]; // Updated type
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isLoading: boolean;
  backlogGroups: BacklogGroup[]; // Updated type
  currentList: { category: string; subcategory?: string } | null;
  totalItems: number;
  apiTotalItems: number;
  expandedViewMode: 'grid' | 'list';
  isMobile: boolean;
  setIsExpanded: (value: boolean) => void;
  onGroupHover?: (groupId: string) => void;
  onGroupExpand?: (groupId: string) => void;
  loadingGroups?: Set<string>;
  loadedGroups?: Set<string>;
}

const SidebarContent = ({ 
  isExpandedView, 
  filteredGroups, 
  searchTerm, 
  setSearchTerm, 
  isLoading, 
  backlogGroups, 
  currentList, 
  totalItems, 
  apiTotalItems, 
  expandedViewMode, 
  isMobile, 
  setIsExpanded,
  onGroupHover,
  onGroupExpand,
  loadingGroups = new Set(),
  loadedGroups = new Set()
}: Props) => {
  const [showEditorsPickOnly, setShowEditorsPickOnly] = useState(false);

  // Use the new filtering hook
  const {
    processedGroups,
    filterStats,
    handleToggleEditorsPick,
    handleClearFilters
  } = useBacklogFiltering(
    backlogGroups,
    searchTerm,
    showEditorsPickOnly,
    setShowEditorsPickOnly
  );

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
        <BacklogGroupsHeader
          totalItems={totalItems}
          matchedItems={processedGroups.length}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          isExpanded={isExpandedView}
          onToggleExpanded={() => setIsExpanded(!isExpandedView)}
          onClose={() => setIsExpanded(false)}
          error={null}
          showEditorsPickOnly={showEditorsPickOnly}
          onToggleEditorsPick={handleToggleEditorsPick}
          filteredItemsCount={filterStats.filteredItemsCount}
          hasActiveFilters={filterStats.hasActiveFilters}
          onClearFilters={handleClearFilters}
        />
        
        {/* View Mode Toggle - Only in expanded view */}
        {isExpandedView && (
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex-1" />
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
        <LoadingIndicator isLoading={isLoading} hasData={backlogGroups.length > 0} />

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
          groups={processedGroups}
          isExpandedView={isExpandedView}
          expandedViewMode={expandedViewMode}
          isMobile={isMobile}
          onGroupHover={onGroupHover}
          onGroupExpand={onGroupExpand}
          loadingGroups={loadingGroups}
          loadedGroups={loadedGroups}
        />
        
        {/* Empty State */}
        <AnimatePresence>
          {processedGroups.length === 0 && !isLoading && (
            <EmptyState
              filterStats={filterStats}
              searchTerm={searchTerm}
              showEditorsPickOnly={showEditorsPickOnly}
              onClearFilters={handleClearFilters}
            />
          )}
        </AnimatePresence>

        {/* Category Info */}
        <BacklogCategoryInfo
          currentList={currentList}
          filterStats={filterStats}
          totalItems={totalItems}
          apiTotalItems={apiTotalItems}
          groupsCount={processedGroups.length}
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