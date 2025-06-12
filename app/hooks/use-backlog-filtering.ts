import { useMemo } from 'react';
import { BacklogGroup } from '@/app/types/backlog-groups';

export function useBacklogFiltering(
  groups: BacklogGroup[],
  searchTerm: string,
  showEditorsPickOnly: boolean,
  setShowEditorsPickOnly: (value: boolean) => void
) {
  const { processedGroups, filterStats } = useMemo(() => {
    // Quick return for no groups
    if (!groups || groups.length === 0) {
      return {
        processedGroups: [],
        filterStats: {
          filteredItemsCount: 0,
          hasActiveFilters: false,
          totalGroups: 0
        }
      };
    }

    let filtered = groups;
    let hasActiveFilters = false;

    // Apply search filter
    if (searchTerm && searchTerm.trim().length > 0) {
      hasActiveFilters = true;
      const search = searchTerm.toLowerCase().trim();
      
      filtered = filtered.filter(group => 
        group.name?.toLowerCase().includes(search) ||
        group.description?.toLowerCase().includes(search) ||
        // Only search in items if they're already loaded (performance optimization)
        (group.items.length > 0 && group.items.some(item =>
          item.name?.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search)
        ))
      );
    }

    // Apply editors pick filter
    if (showEditorsPickOnly) {
      hasActiveFilters = true;
      filtered = filtered.filter(group => group.item_count >= 5);
    }

    const filteredItemsCount = filtered.reduce((acc, group) => acc + (group.items?.length || 0), 0);

    return {
      processedGroups: filtered,
      filterStats: {
        filteredItemsCount,
        hasActiveFilters,
        totalGroups: filtered.length
      }
    };
  }, [groups, searchTerm, showEditorsPickOnly]);

  return { processedGroups, filterStats };
}