import { useMemo, useCallback } from 'react';
import { BacklogGroup } from '@/app/types/backlog-groups';

// Editor's Pick configuration
const EDITORS_PICK_ITEMS = [
  "Michael Jordan",
  "LeBron James"
];

interface FilterStats {
  filteredItemsCount: number;
  hasActiveFilters: boolean;
  totalGroups: number;
}

interface UseBacklogFilteringResult {
  processedGroups: BacklogGroup[];
  filterStats: FilterStats;
  handleToggleEditorsPick: () => void;
  handleClearFilters: () => void;
}

export function useBacklogFiltering(
  backlogGroups: BacklogGroup[],
  searchTerm: string,
  showEditorsPickOnly: boolean,
  setShowEditorsPickOnly: (value: boolean) => void
): UseBacklogFilteringResult {
  
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
          item.name.toLowerCase().includes(searchLower) ||
          item.title?.toLowerCase().includes(searchLower) ||
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
            item.name.toLowerCase().includes(pickItem.toLowerCase()) ||
            item.title?.toLowerCase().includes(pickItem.toLowerCase())
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
  }, [showEditorsPickOnly, setShowEditorsPickOnly]);

  const handleClearFilters = useCallback(() => {
    setShowEditorsPickOnly(false);
  }, [setShowEditorsPickOnly]);

  return {
    processedGroups,
    filterStats,
    handleToggleEditorsPick,
    handleClearFilters
  };
}