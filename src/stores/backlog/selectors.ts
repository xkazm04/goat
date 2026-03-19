import { useBacklogStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { useSelectionCursor } from '../selection-cursor';

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

export const useBacklogSelection = () => {
  // Selection cursor is the single source of truth for item selection
  const selectedItemId = useSelectionCursor(state => state.itemId);
  const selectionSource = useSelectionCursor(state => state.source);
  const storeValues = useBacklogStore(
    useShallow(state => ({
      selectedGroupId: state.selectedGroupId,
      selectGroup: state.selectGroup,
      selectItem: state.selectItem,
    }))
  );
  return { ...storeValues, selectedItemId, selectionSource };
};

// Granular loading selectors — subscribe only to the slice you need
export const useIsBacklogLoading = () =>
  useBacklogStore(state => state.isLoading);

export const useBacklogLoadingGroupIds = () =>
  useBacklogStore(state => state.loadingGroupIds);

export const useBacklogLoadingProgress = () =>
  useBacklogStore(
    useShallow(state => state.loadingProgress)
  );

export const useBacklogError = () =>
  useBacklogStore(state => state.error);

export const useBacklogLoadingErrors = () =>
  useBacklogStore(
    useShallow(state => ({
      loadingErrors: state.loadingErrors,
      retryFailedGroups: state.retryFailedGroups,
      clearLoadingErrors: state.clearLoadingErrors
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

export const useOfflineSyncDiagnostics = () =>
  useBacklogStore(
    useShallow(state => state.syncDiagnostics)
  );

export const useBacklogStats = () =>
  useBacklogStore(state => state.getStats());

export const useEnrichmentSources = () =>
  useBacklogStore(
    useShallow(state => state.enrichmentSources)
  );