import { useEffect, useRef, useState } from 'react';
import { useBacklogStore } from '@/stores/backlog-store';
import { BacklogGroup } from '@/types/backlog-groups';
import { shallow } from 'zustand/shallow';

/**
 * A safe hook to access backlog store state without infinite loops
 */
export function useBacklogSelectors() {
  // Track state locally
  const [groups, setGroups] = useState<BacklogGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [searchTerm, setLocalSearchTerm] = useState('');
  
  // Track loading groups
  const [loadingGroupIds, setLoadingGroupIds] = useState<string[]>([]);

  // Ref to avoid dependency loops
  const storeRef = useRef(useBacklogStore.getState());

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = useBacklogStore.subscribe(
      (state) => {
        // Only update if values have changed (using shallow comparison)
        if (!shallow(state.groups, storeRef.current.groups)) {
          setGroups(state.groups);
        }
        
        if (state.isLoading !== storeRef.current.isLoading) {
          setIsLoading(state.isLoading);
        }
        
        if (state.error !== storeRef.current.error) {
          setError(state.error);
        }
        
        if (state.searchTerm !== storeRef.current.searchTerm) {
          setLocalSearchTerm(state.searchTerm);
        }
        
        // Convert Set to array for loadingGroupIds
        const loadingIds = Array.from(state.loadingGroupIds);
        if (!shallow(loadingIds, Array.from(storeRef.current.loadingGroupIds))) {
          setLoadingGroupIds(loadingIds);
        }
        
        // Update ref
        storeRef.current = state;
      }
    );
    
    return () => unsubscribe();
  }, []);

  // Get store actions without subscribing to state changes
  const actions = useBacklogStore.getState();

  // Return state and actions
  return {
    // State
    groups,
    isLoading,
    error,
    searchTerm,
    loadingGroupIds,
    
    // Actions (direct from store)
    initializeGroups: actions.initializeGroups,
    loadGroupItems: actions.loadGroupItems,
    searchGroups: actions.searchGroups,
    filterGroupsByCategory: actions.filterGroupsByCategory,
    setSearchTerm: actions.setSearchTerm,
    
    // State getter
    getState: () => storeRef.current
  };
}