import { motion } from "framer-motion";

interface FilterStats {
  filteredItemsCount: number;
  hasActiveFilters: boolean;
  totalGroups: number;
}

interface CategoryInfoProps {
  currentList: { category: string; subcategory?: string } | null;
  filterStats: FilterStats;
  totalItems: number;
  apiTotalItems: number;
  groupsCount: number;
}

export function BacklogCategoryInfo({ 
  currentList, 
  filterStats, 
  totalItems, 
  apiTotalItems, 
  groupsCount 
}: CategoryInfoProps) {
  if (!currentList || groupsCount === 0) return null;

  return (
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
            {totalItems} total items
          </>
        )}
      </motion.p>
    </motion.div>
  );
}