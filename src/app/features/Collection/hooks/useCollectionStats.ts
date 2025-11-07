/**
 * Hook for calculating collection statistics
 */

import { useMemo } from 'react';
import { CollectionGroup, CollectionStats } from '../types';

// Curator milestone thresholds
const CURATOR_MILESTONES = [
  { level: 1, itemsRequired: 3 },
  { level: 2, itemsRequired: 10 },
  { level: 3, itemsRequired: 25 },
  { level: 4, itemsRequired: 50 },
  { level: 5, itemsRequired: 100 },
];

export function useCollectionStats(
  groups: CollectionGroup[],
  selectedGroupIds: Set<string>
): CollectionStats {
  return useMemo(() => {
    const selectedGroups = groups.filter(g => selectedGroupIds.has(g.id));
    const totalItems = groups.reduce((sum, g) => sum + (g.items?.length || 0), 0);
    const selectedItems = selectedGroups.reduce((sum, g) => sum + (g.items?.length || 0), 0);

    // Calculate average ranking
    const allItems = selectedGroups.flatMap(g => g.items || []);
    const rankedItems = allItems.filter(item => item.ranking !== undefined && item.ranking > 0);
    const averageRanking = rankedItems.length > 0
      ? rankedItems.reduce((sum, item) => sum + (item.ranking || 0), 0) / rankedItems.length
      : undefined;

    // Calculate curator milestone progress
    const currentLevel = [...CURATOR_MILESTONES]
      .reverse()
      .find(m => totalItems >= m.itemsRequired);

    const nextMilestone = CURATOR_MILESTONES.find(
      m => m.itemsRequired > totalItems
    );

    return {
      totalItems,
      selectedItems,
      visibleGroups: selectedGroups.length,
      totalGroups: groups.length,
      averageRanking,
      rankedItems: rankedItems.length,
      curatorLevel: currentLevel?.level,
      itemsToNextLevel: nextMilestone ? nextMilestone.itemsRequired - totalItems : undefined,
    };
  }, [groups, selectedGroupIds]);
}




