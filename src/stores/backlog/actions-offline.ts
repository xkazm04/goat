import { BacklogState, PendingChange } from './types';
import { backlogLogger } from '@/lib/logger';

// Type for immer-compatible set function
type ImmerSet = (fn: (state: BacklogState) => void) => void;

// Helper to log and process a pending change
const logChangeProcessing = (change: PendingChange): void => {
  const { type, groupId, itemId, item } = change;
  const idInfo = itemId || item?.id || 'unknown';

  switch (type) {
    case 'add':
      backlogLogger.debug(`Processing addition of item ${idInfo} to group ${groupId}`);
      break;
    case 'remove':
      backlogLogger.debug(`Processing removal of item ${idInfo} from group ${groupId}`);
      break;
    case 'update':
      backlogLogger.debug(`Processing update of item ${idInfo} in group ${groupId}`);
      break;
  }
};

export const createOfflineActions = (
  set: ImmerSet,
  get: () => BacklogState
) => ({
  // Offline mode management
  setOfflineMode: (isOffline: boolean) => {
    const currentOfflineMode = get().isOfflineMode;
    
    // Only update if the status has changed
    if (currentOfflineMode !== isOffline) {
      backlogLogger.debug(`Offline mode ${isOffline ? 'enabled' : 'disabled'}`);
      
      set(state => {
        state.isOfflineMode = isOffline;
      });
      
      // If coming back online, process pending changes
      if (!isOffline && get().pendingChanges.length > 0) {
        get().processPendingChanges();
      }
    }
  },
  
  processPendingChanges: async () => {
    const state = get();
    
    if (state.isOfflineMode || state.pendingChanges.length === 0) {
      backlogLogger.debug(`No pending changes to process`);
      return;
    }
    
    backlogLogger.debug(`Processing ${state.pendingChanges.length} pending changes`);
    
    // Sort changes by timestamp (oldest first)
    const sortedChanges = [...state.pendingChanges].sort((a, b) => a.timestamp - b.timestamp);

    // Process in sequence
    for (const change of sortedChanges) {
      try {
        // Validate change has required data
        const hasValidData =
          (change.type === 'add' && change.item) ||
          (change.type === 'remove' && change.itemId) ||
          (change.type === 'update' && change.itemId && change.item);

        if (hasValidData) {
          logChangeProcessing(change);
          // TODO: Add API calls to persist to backend when implementing sync
          // await itemGroupsApi.processChange(change);
        }
      } catch (error) {
        backlogLogger.error(`Failed to process change: ${JSON.stringify(change)}`, error);
      }
    }
    
    // Clear processed changes
    set(state => {
      state.pendingChanges = [];
    });
    
    backlogLogger.info(`All pending changes processed`);
  },
});

export type OfflineActions = ReturnType<typeof createOfflineActions>;