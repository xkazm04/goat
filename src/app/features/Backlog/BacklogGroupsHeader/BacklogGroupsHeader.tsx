import { Maximize2, X, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentList } from "@/stores/use-list-store";
import { BacklogHeaderSearch } from "./BacklogHeaderSearch";
import { BacklogHeaderFilters } from "./BacklogHeaderFilters";
import BacklogGroupsLoading from "./BacklogGroupsLoading";

interface BacklogGroupsHeaderProps {
  totalItems: number;
  matchedItems: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  onClose?: () => void;
  error?: Error | null;
  showEditorsPickOnly: boolean;
  onToggleEditorsPick: () => void;
  filteredItemsCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  loadingProgress?: {
    totalGroups: number;
    loadedGroups: number;
    isLoading: boolean;
    percentage: number;
  };
}


const BacklogGroupsHeader = ({
  totalItems,
  matchedItems,
  searchTerm,
  setSearchTerm,
  isExpanded = false,
  onToggleExpanded,
  onClose,
  error = null,
  showEditorsPickOnly,
  onToggleEditorsPick,
  filteredItemsCount,
  hasActiveFilters,
  onClearFilters,
  loadingProgress
}: BacklogGroupsHeaderProps) => {
  const currentList = useCurrentList();

  return (
    <div
      className="border-b relative"
      style={{
        borderColor: 'rgba(71, 85, 105, 0.3)',
        background: `
          linear-gradient(135deg, 
            rgba(30, 41, 59, 0.9) 0%,
            rgba(51, 65, 85, 0.95) 100%
          )
        `
      }}
    >
      {/* Main Header Content */}
      <div className="p-6">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-4">
              {/* Filter Buttons */}
              <BacklogHeaderFilters
                showEditorsPickOnly={showEditorsPickOnly}
                onToggleEditorsPick={onToggleEditorsPick}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Expand Button (only in normal view) */}
            {!isExpanded && onToggleExpanded && (
              <motion.button
                onClick={onToggleExpanded}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-xl transition-all duration-200 group"
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}
                title="Expand collection view"
              >
                <Maximize2 className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
              </motion.button>
            )}

            {/* Close Button (only in expanded view) */}
            {isExpanded && onClose && (
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-xl transition-all duration-200 group"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}
                title="Close expanded view"
              >
                <X className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Search and Filter Row */}
        <div className="space-y-3">
          {/* Search Bar */}
          <BacklogHeaderSearch
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            placeholder={`Search ${currentList?.category || 'items'}...`}
            isExpanded={isExpanded}
            debounceMs={400}
          />
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
          >
            <p className="text-sm text-red-400">
              {error.message || 'Failed to load items from database'}
            </p>
          </motion.div>
        )}
      </div>

      {/* Progress Bar */}
      <AnimatePresence>
        {loadingProgress && (loadingProgress.isLoading || loadingProgress.percentage < 100) && (
          <BacklogGroupsLoading progress={loadingProgress} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default BacklogGroupsHeader;