import { useBacklogStore } from './store';
import { useShallow } from 'zustand/react/shallow';

// Selector hooks with memoization to prevent unnecessary renders
export const useBacklogGroups = () =>
  useBacklogStore(state => state.groups);

export const useBacklogFilters = () =>
  useBacklogStore(
    useShallow(state => ({
      searchTerm: state.searchTerm,
      setSearchTerm: state.setSearchTerm
    }))
  );

export const useBacklogSelection = () =>
  useBacklogStore(
    useShallow(state => ({
      selectedGroupId: state.selectedGroupId,
      selectedItemId: state.selectedItemId,
      activeItemId: state.activeItemId,
      selectGroup: state.selectGroup,
      selectItem: state.selectItem,
      setActiveItem: state.setActiveItem
    }))
  );

export const useBacklogLoading = () =>
  useBacklogStore(
    useShallow(state => ({
      isLoading: state.isLoading,
      loadingGroupIds: state.loadingGroupIds,
      loadingProgress: state.loadingProgress,
      error: state.error
    }))
  );

export const useBacklogItem = (itemId: string) =>
  useBacklogStore(state => state.getItemById(itemId));

export const useBacklogOfflineStatus = () =>
  useBacklogStore(
    useShallow(state => ({
      isOfflineMode: state.isOfflineMode,
      setOfflineMode: state.setOfflineMode,
      pendingChangesCount: state.pendingChanges.length
    }))
  );

export const useBacklogStats = () =>
  useBacklogStore(state => state.getStats());