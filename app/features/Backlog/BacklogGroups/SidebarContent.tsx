import { BorderGradient, PatternOverlay } from "@/app/components/decorations/cardDecor";
import { Loader2, Search } from "lucide-react";
import { BacklogGroup } from "../BacklogGroup";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useCallback } from "react";
import { BacklogGroupType } from "@/app/types/match";
import BacklogGroupsHeader from "../BacklogGroupHeader/BacklogGroupsHeader";

// Editor's Pick configuration
const EDITORS_PICK_ITEMS = [
  "Michael Jordan",
  "LeBron James"
];

type Props = {
  isExpandedView: boolean;
  filteredGroups: BacklogGroupType[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isLoading: boolean;
  backlogGroups: BacklogGroupType[];
  currentList: { category: string; subcategory?: string } | null;
  totalItems: number;
  apiTotalItems: number;
  expandedViewMode: 'grid' | 'list';
  isMobile: boolean;
  setIsExpanded: (value: boolean) => void;
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
  setIsExpanded 
}: Props) => {
  const [showEditorsPickOnly, setShowEditorsPickOnly] = useState(false);

  // Stable filtering logic with better memoization
  const { processedGroups, filterStats } = useMemo(() => {
    // Only process if we have actual data
    if (!backlogGroups || backlogGroups.length === 0) {
      return {
        processedGroups: [],
        filterStats: {
          filteredItemsCount: 0,
          hasActiveFilters: Boolean(searchTerm || showEditorsPickOnly),
          totalGroups: 0
        }
      };
    }

    let groups = backlogGroups.map(group => ({
      ...group,
      // Pre-filter items to avoid repeated processing
      _allItems: group.items,
      items: group.items
    }));
    
    // Apply search filter only if search term exists
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      groups = groups.map(group => ({
        ...group,
        items: group._allItems.filter(item =>
          item.title.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.tags?.some(tag => tag.toLowerCase().includes(searchLower))
        )
      }));
    }

    // Apply Editor's Pick filter only if active
    if (showEditorsPickOnly) {
      groups = groups.map(group => ({
        ...group,
        items: group.items.filter(item =>
          EDITORS_PICK_ITEMS.some(pickItem => 
            item.title.toLowerCase().includes(pickItem.toLowerCase())
          )
        )
      }));
    }

    // Filter out empty groups
    const nonEmptyGroups = groups.filter(group => group.items.length > 0);

    // Calculate stats
    const filteredItemsCount = nonEmptyGroups.reduce((acc, group) => acc + group.items.length, 0);
    const hasActiveFilters = Boolean((searchTerm && searchTerm.trim()) || showEditorsPickOnly);

    return {
      processedGroups: nonEmptyGroups,
      filterStats: {
        filteredItemsCount,
        hasActiveFilters,
        totalGroups: nonEmptyGroups.length
      }
    };
  }, [backlogGroups, searchTerm, showEditorsPickOnly]);

  const handleToggleEditorsPick = useCallback(() => {
    setShowEditorsPickOnly(!showEditorsPickOnly);
  }, [showEditorsPickOnly]);

  const handleClearFilters = useCallback(() => {
    setShowEditorsPickOnly(false);
  }, []);

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
          matchedItems={filteredGroups.length}
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
        {/* Loading Indicator for Background Updates */}
        {isLoading && backlogGroups.length > 0 && (
          <div className="absolute top-4 right-4 z-20">
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg backdrop-blur-sm">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-xs text-blue-400">Updating...</span>
            </div>
          </div>
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

        {/* Enhanced Groups Grid with Stable Keys */}
        <div className={`grid gap-4 ${
          isExpandedView 
            ? expandedViewMode === 'grid'
              ? isMobile 
                ? 'grid-cols-1' 
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
              : 'grid-cols-1'
            : 'grid-cols-1'
        }`}>
          <AnimatePresence mode="popLayout">
            {processedGroups.map((group, index) => (
              <motion.div 
                key={group.id} // Use stable group ID instead of search-dependent key
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ 
                  delay: index * 0.05, // Reduced stagger delay
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  layout: { duration: 0.3 }
                }}
                layout
                layoutId={`group-${group.id}`}
              >
                <BacklogGroup 
                  group={group} 
                  defaultExpanded={false} // Never auto-expand on search
                  isExpandedView={isExpandedView}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {/* Enhanced Empty States */}
        <AnimatePresence>
          {processedGroups.length === 0 && !isLoading && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="text-center py-12 relative col-span-full"
            >
              <div 
                className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center relative"
                style={{
                  background: `
                    linear-gradient(135deg, 
                      rgba(71, 85, 105, 0.2) 0%,
                      rgba(100, 116, 139, 0.2) 100%
                    )
                  `,
                  border: '2px dashed rgba(71, 85, 105, 0.5)'
                }}
              >
                <Search className="w-8 h-8 text-slate-500" />
              </div>
              
              {/* Dynamic empty state messages */}
              {filterStats.hasActiveFilters ? (
                <>
                  <p className="text-sm font-medium text-slate-400 mb-2">
                    No items match your filters
                  </p>
                  <div className="text-xs text-slate-500 space-y-1">
                    {searchTerm && <p>Search: "{searchTerm}"</p>}
                    {showEditorsPickOnly && <p>Editor's Pick filter active</p>}
                  </div>
                  <motion.button
                    onClick={handleClearFilters}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      color: '#60a5fa'
                    }}
                  >
                    Clear all filters
                  </motion.button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-400">
                    No items found
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try adjusting your search or check your connection
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Category Info */}
        {currentList && processedGroups.length > 0 && (
          <motion.div 
            className="text-center py-4 border-t border-slate-600/30 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-xs text-slate-500">
              Showing {currentList.category} {currentList.subcategory && `• ${currentList.subcategory}`}
            </p>
            <motion.p 
              className="text-xs text-slate-600 mt-1"
              key={`stats-${filterStats.filteredItemsCount}-${totalItems}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {filterStats.hasActiveFilters ? (
                <>
                  {filterStats.filteredItemsCount} filtered • {totalItems} total items
                </>
              ) : (
                <>
                  {totalItems} total items • {apiTotalItems > totalItems ? `${apiTotalItems} in database` : 'All loaded'}
                </>
              )}
            </motion.p>
          </motion.div>
        )}
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