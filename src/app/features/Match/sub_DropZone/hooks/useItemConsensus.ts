import { useEffect, useMemo } from 'react';
import { useConsensusStore } from '@/stores/consensus-store';

/**
 * Lightweight hook to get consensus average position for a grid item.
 * Triggers a single fetch for the category, then reads per-item.
 */
export function useItemConsensus(itemId: string | undefined, category: string | undefined) {
  const fetchConsensus = useConsensusStore(s => s.fetchConsensus);
  const getItemConsensus = useConsensusStore(s => s.getItemConsensus);
  const currentCategory = useConsensusStore(s => s.currentCategory);
  const isLoading = useConsensusStore(s => s.isLoading);

  // Fetch consensus for this category once (store deduplicates concurrent calls)
  useEffect(() => {
    if (category && currentCategory !== category && !isLoading) {
      fetchConsensus(category);
    }
  }, [category, currentCategory, isLoading, fetchConsensus]);

  return useMemo(() => {
    if (!itemId) return null;
    const consensus = getItemConsensus(itemId);
    if (!consensus?.averageRank) return null;
    return {
      averagePosition: Math.round(consensus.averageRank),
      totalRankings: consensus.totalRankings ?? 0,
    };
  }, [itemId, getItemConsensus]);
}
