import { BorderGradient, PatternOverlay } from "@/app/components/decorations/cardDecor";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { BacklogGroup } from "@/app/types/backlog-groups";
import BacklogGroupsHeader from "../BacklogGroupsHeader/BacklogGroupsHeader";
import { useBacklogFiltering } from "@/app/hooks/use-backlog-filtering";
import { EmptyState } from "./EmptyState";
import { BacklogGroupsGrid } from "./BacklogGroupsGrid";
import { BacklogCategoryInfo } from "./BacklogCategoryInfo";
import { LoadingIndicator } from "./LoadingIndicator";
import InitialLoadingOverlay from "./InitialLoadingOverlay";

type Props = {
  isExpandedView: boolean;
  filteredGroups: BacklogGroup[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isLoading: boolean;
  backlogGroups: BacklogGroup[];
  currentList: { category: string; subcategory?: string } | null;
  totalItems: number;
  apiTotalItems: number;
  expandedViewMode: 'grid' | 'list';
  setIsExpanded: (value: boolean) => void;
  onGroupHover?: (groupId: string) => void;
  onGroupExpand?: (groupId: string) => void;
  loadingGroups?: Set<string>;
  loadedGroups?: Set<string>;
  loadingProgress?: { totalGroups: number; loadedGroups: number; isLoading: boolean; percentage: number };
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
  setIsExpanded,
  onGroupHover,
  onGroupExpand,
  loadingGroups = new Set(),
  loadedGroups = new Set(),
  loadingProgress
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

  // IMPROVED: Better loading state detection
  const isInitialLoading = isLoading && backlogGroups.length === 0;
  const isProgressiveLoading = loadingProgress?.isLoading && backlogGroups.length > 0;
  const showLoadingOverlay = isInitialLoading || (isProgressiveLoading && loadingProgress?.percentage < 30);

  // FIXED: Calculate static height based on view mode
  const containerHeight = useMemo(() => {
    if (isExpandedView) {
      return 'h-full max-h-screen';
    }
    // Fixed height for sidebar - accounts for typical content
    return 'h-[85vh] min-h-[600px] max-h-[900px]';
  }, [isExpandedView]);

  return (
    <div 
      className={`relative rounded-3xl overflow-hidden flex flex-col group ${containerHeight}`}
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

      {/* Enhanced Header with Search, Filters, and Progress */}
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
          loadingProgress={loadingProgress}
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
      
      {/* Groups Container  */}
      <div 
        className="flex-1 min-h-0 relative p-1 pt-5 overflow-y-auto"
        style={{
          background: `
            linear-gradient(180deg, 
              rgba(15, 23, 42, 0.7) 0%,
              rgba(30, 41, 59, 0.8) 100%
            )
          `,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(71, 85, 105, 0.8) transparent'
        }}
      >
        {/* Shadow Layer for Background Content */}
        {showLoadingOverlay && (
          <div 
            className="absolute inset-0 opacity-20 z-40 pointer-events-none"
            style={{
              background: `
                radial-gradient(circle at center, 
                  rgba(0, 0, 0, 0.4) 0%,
                  rgba(0, 0, 0, 0.6) 50%,
                  rgba(0, 0, 0, 0.8) 100%
                )
              `,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
          />
        )}
        <AnimatePresence>
          {showLoadingOverlay && (
            <InitialLoadingOverlay 
              isVisible={showLoadingOverlay} 
              progress={loadingProgress}
            />
          )}
        </AnimatePresence>

        {/* Content - always visible but dimmed during loading */}
        <motion.div
          animate={{ 
            opacity: showLoadingOverlay ? 0.4 : 1,
            scale: showLoadingOverlay ? 0.98 : 1,
          }}
          transition={{ duration: 0.3 }}
          className="relative z-10"
        >
          {/* Loading Indicator - for progressive loading */}
          {!showLoadingOverlay && (
            <LoadingIndicator isLoading={isLoading} hasData={backlogGroups.length > 0} />
          )}

          {/* Groups Grid */}
          <BacklogGroupsGrid
            groups={processedGroups}
            isExpandedView={isExpandedView}
            expandedViewMode={expandedViewMode}
            onGroupHover={onGroupHover}
            onGroupExpand={onGroupExpand}
            loadingGroups={loadingGroups}
            loadedGroups={loadedGroups}
          />
          
          {/* Empty State */}
          <AnimatePresence>
            {processedGroups.length === 0 && !isLoading && !showLoadingOverlay && (
              <EmptyState
                filterStats={filterStats}
                searchTerm={searchTerm}
                showEditorsPickOnly={showEditorsPickOnly}
                onClearFilters={handleClearFilters}
              />
            )}
          </AnimatePresence>

          {/* Category Info */}
          {!showLoadingOverlay && (
            <BacklogCategoryInfo
              currentList={currentList}
              filterStats={filterStats}
              totalItems={totalItems}
              apiTotalItems={apiTotalItems}
              groupsCount={processedGroups.length}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SidebarContent;