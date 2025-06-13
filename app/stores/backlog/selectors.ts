import { useBacklogStore } from './store';
import { shallow } from 'zustand/shallow';

// Selector hooks with memoization to prevent unnecessary renders
export const useBacklogGroups = () => 
  useBacklogStore(state => state.groups, shallow);

export const useBacklogFilters = () => 
  useBacklogStore(
    state => ({
      searchTerm: state.searchTerm,
      setSearchTerm: state.setSearchTerm
    }),
    shallow
  );

export const useBacklogSelection = () => 
  useBacklogStore(
    state => ({
      selectedGroupId: state.selectedGroupId,
      selectedItemId: state.selectedItemId,
      activeItemId: state.activeItemId,
      selectGroup: state.selectGroup,
      selectItem: state.selectItem,
      setActiveItem: state.setActiveItem
    }),
    shallow
  );

export const useBacklogLoading = () => 
  useBacklogStore(
    state => ({
      isLoading: state.isLoading,
      loadingGroupIds: state.loadingGroupIds,
      loadingProgress: state.loadingProgress,
      error: state.error
    }),
    shallow
  );

export const useBacklogItem = (itemId: string) => 
  useBacklogStore(
    state => state.getItemById(itemId),
    shallow
  );

export const useBacklogOfflineStatus = () => 
  useBacklogStore(
    state => ({
      isOfflineMode: state.isOfflineMode,
      setOfflineMode: state.setOfflineMode,
      pendingChangesCount: state.pendingChanges.length
    }),
    shallow
  );

export const useBacklogStats = () => 
  useBacklogStore(
    state => state.getStats(),
    shallow
  );