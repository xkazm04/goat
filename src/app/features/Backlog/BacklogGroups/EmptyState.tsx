import { motion } from "framer-motion";
import { Search } from "lucide-react";

interface FilterStats {
  filteredItemsCount: number;
  hasActiveFilters: boolean;
  totalGroups: number;
}

interface EmptyStateProps {
  filterStats: FilterStats;
  searchTerm: string;
  showEditorsPickOnly: boolean;
  onClearFilters: () => void;
}

export function EmptyState({ 
  filterStats, 
  searchTerm, 
  showEditorsPickOnly, 
  onClearFilters 
}: EmptyStateProps) {
  return (
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
            onClick={onClearFilters}
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
  );
}