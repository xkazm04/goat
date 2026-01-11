import { useMemo, useCallback } from 'react';
import { BacklogGroup, BacklogItem } from '@/types/backlog-groups';

// Editor's Pick configuration
const EDITORS_PICK_ITEMS = [
  "Michael Jordan",
  "LeBron James"
];

// Pre-computed lowercase versions for Editor's Pick matching
const EDITORS_PICK_ITEMS_LOWER = EDITORS_PICK_ITEMS.map(item => item.toLowerCase());

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

// Search index entry: pre-computed lowercase searchable text for each item
interface SearchIndexEntry {
  item: BacklogItem;
  searchText: string; // Combined lowercase text of name, title, description, tags
  nameTitleLower: string; // Just name + title for Editor's Pick matching
}

// Build search index for a single item - combines all searchable fields into one lowercase string
function buildItemSearchIndex(item: BacklogItem): SearchIndexEntry {
  const name = (item.name || '').toLowerCase();
  const title = (item.title || '').toLowerCase();
  const description = (item.description || '').toLowerCase();
  const tags = (item.tags || []).map(tag => (tag || '').toLowerCase()).join(' ');

  return {
    item,
    searchText: `${name} ${title} ${description} ${tags}`,
    nameTitleLower: `${name} ${title}`
  };
}

// Search index for a group: maps item id to its search entry
interface GroupSearchIndex {
  group: BacklogGroup;
  itemIndexes: SearchIndexEntry[];
}

export function useBacklogFiltering(
  backlogGroups: BacklogGroup[],
  searchTerm: string,
  showEditorsPickOnly: boolean,
  setShowEditorsPickOnly: (value: boolean) => void
): UseBacklogFilteringResult {

  // Pre-build search index when backlogGroups changes
  // This runs O(n*k) once when data loads, not on every keystroke
  const searchIndex = useMemo((): GroupSearchIndex[] => {
    if (!backlogGroups || backlogGroups.length === 0) {
      return [];
    }

    return backlogGroups.map(group => ({
      group,
      itemIndexes: (group.items || []).map(buildItemSearchIndex)
    }));
  }, [backlogGroups]);

  const { processedGroups, filterStats } = useMemo(() => {
    // Only process if we have actual data
    if (searchIndex.length === 0) {
      return {
        processedGroups: [],
        filterStats: {
          filteredItemsCount: 0,
          hasActiveFilters: Boolean(searchTerm || showEditorsPickOnly),
          totalGroups: 0
        }
      };
    }

    const searchLower = searchTerm ? searchTerm.toLowerCase().trim() : '';
    const hasSearchFilter = searchLower.length > 0;

    // Filter using pre-computed search index - O(n) single string comparison per item
    const filteredGroups = searchIndex.map(({ group, itemIndexes }) => {
      let filteredIndexes = itemIndexes;

      // Apply search filter using pre-computed searchText
      if (hasSearchFilter) {
        filteredIndexes = filteredIndexes.filter(entry =>
          entry.searchText.includes(searchLower)
        );
      }

      // Apply Editor's Pick filter using pre-computed nameTitleLower
      if (showEditorsPickOnly) {
        filteredIndexes = filteredIndexes.filter(entry =>
          EDITORS_PICK_ITEMS_LOWER.some(pickItemLower =>
            entry.nameTitleLower.includes(pickItemLower)
          )
        );
      }

      return {
        ...group,
        items: filteredIndexes.map(entry => entry.item)
      };
    });

    // Filter out empty groups
    const nonEmptyGroups = filteredGroups.filter(group =>
      Array.isArray(group.items) && group.items.length > 0
    );

    // Calculate stats
    const filteredItemsCount = nonEmptyGroups.reduce((acc, group) =>
      acc + (Array.isArray(group.items) ? group.items.length : 0), 0
    );
    const hasActiveFilters = Boolean(hasSearchFilter || showEditorsPickOnly);

    return {
      processedGroups: nonEmptyGroups,
      filterStats: {
        filteredItemsCount,
        hasActiveFilters,
        totalGroups: nonEmptyGroups.length
      }
    };
  }, [searchIndex, searchTerm, showEditorsPickOnly]);

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