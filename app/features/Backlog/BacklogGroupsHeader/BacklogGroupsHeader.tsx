import { Maximize2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentList } from "@/app/stores/use-list-store";
import { BacklogHeaderSearch } from "./BacklogHeaderSearch";
import { BacklogHeaderFilters } from "./BacklogHeaderFilters";

interface BacklogGroupsHeaderProps {
  totalItems: number;
  matchedItems: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  onClose?: () => void;
  error?: any;
  showEditorsPickOnly: boolean;
  onToggleEditorsPick: () => void;
  filteredItemsCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  // Modal handlers
  onOpenModal?: () => void;
  onCloseModal?: () => void;
  isModal?: boolean;
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
  onOpenModal,
  onCloseModal,
  isModal = false
}: BacklogGroupsHeaderProps) => {
  const currentList = useCurrentList();

  const handleClearAllFilters = () => {
    setSearchTerm('');
    onClearFilters();
  };

  return (
    <div
      className="p-6 border-b relative"
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
          {/* FIXED: Show expand button when not in modal and handler exists */}
          {!isModal && onOpenModal && (
            <motion.button
              onClick={onOpenModal}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl transition-all duration-200 group"
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}
              title="Open collection modal"
            >
              <Maximize2 className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
            </motion.button>
          )}

          {/* Close Button (only in modal view) */}
          {isModal && onCloseModal && (
            <motion.button
              onClick={onCloseModal}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl transition-all duration-200 group"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}
              title="Close modal"
            >
              <X className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Search and Filter Row */}
      <div className="space-y-3">
        <BacklogHeaderSearch
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder={`Search ${currentList?.category || 'items'}...`}
          isExpanded={isExpanded || isModal}
          debounceMs={400}
        />
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 rounded-lg"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}
        >
          <p className="text-red-300 text-sm">
            Failed to load groups. Please try again.
          </p>
        </motion.div>
      )}

      {/* Stats Row */}
      <div className="flex items-center justify-between mt-4 text-xs">
        <div className="flex items-center gap-4 text-slate-400">
          <span>{totalItems} total items</span>
          {hasActiveFilters && (
            <span className="text-blue-400">{filteredItemsCount} filtered</span>
          )}
        </div>

        {hasActiveFilters && (
          <motion.button
            onClick={handleClearAllFilters}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-2 py-1 rounded text-xs transition-colors"
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              color: '#60a5fa'
            }}
          >
            Clear filters
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default BacklogGroupsHeader;