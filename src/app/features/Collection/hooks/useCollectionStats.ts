/**
 * Hook for calculating collection statistics
 */

import { useMemo } from 'react';
import { CollectionGroup, CollectionStats } from '../types';

export function useCollectionStats(
  groups: CollectionGroup[],
  selectedGroupIds: Set<string>
): CollectionStats {
  return useMemo(() => {
    const selectedGroups = groups.filter(g => selectedGroupIds.has(g.id));
    const totalItems = groups.reduce((sum, g) => sum + (g.items?.length || 0), 0);
    const selectedItems = selectedGroups.reduce((sum, g) => sum + (g.items?.length || 0), 0);

    return {
      totalItems,
      selectedItems,
      visibleGroups: selectedGroups.length,
      totalGroups: groups.length
    };
  }, [groups, selectedGroupIds]);
}

