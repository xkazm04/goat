import { BacklogState } from './types';

// Type for immer-compatible set function
type ImmerSet = (fn: (state: BacklogState) => void) => void;

export const createOfflineActions = (
  set: ImmerSet,
  get: () => BacklogState
) => ({
  // Offline mode management
  setOfflineMode: (isOffline: boolean) => {
    const currentOfflineMode = get().isOfflineMode;
    
    // Only update if the status has changed
    if (currentOfflineMode !== isOffline) {
      console.log(`🔄 BacklogStore: Offline mode ${isOffline ? 'enabled' : 'disabled'}`);
      
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
      console.log(`📤 BacklogStore: No pending changes to process`);
      return;
    }
    
    console.log(`📤 BacklogStore: Processing ${state.pendingChanges.length} pending changes`);
    
    // Sort changes by timestamp (oldest first)
    const sortedChanges = [...state.pendingChanges].sort((a, b) => a.timestamp - b.timestamp);
    
    // Process in sequence
    for (const change of sortedChanges) {
      try {
        switch (change.type) {
          case 'add':
            if (change.item) {
              console.log(`📤 BacklogStore: Processing addition of item ${change.item.id} to group ${change.groupId}`);
              // Here you could add API call to persist to backend
              // await itemGroupsApi.addItemToGroup(change.groupId, change.item);
            }
            break;
            
          case 'remove':
            if (change.itemId) {
              console.log(`📤 BacklogStore: Processing removal of item ${change.itemId} from group ${change.groupId}`);
              // Here you could add API call to persist to backend
              // await itemGroupsApi.removeItemFromGroup(change.groupId, change.itemId);
            }
            break;
            
          case 'update':
            if (change.itemId && change.item) {
              console.log(`📤 BacklogStore: Processing update of item ${change.itemId} in group ${change.groupId}`);
              // Here you could add API call to persist to backend
              // await itemGroupsApi.updateItemInGroup(change.groupId, change.itemId, change.item);
            }
            break;
        }
      } catch (error) {
        console.error(`❌ BacklogStore: Failed to process change:`, error, change);
      }
    }
    
    // Clear processed changes
    set(state => {
      state.pendingChanges = [];
    });
    
    console.log(`✅ BacklogStore: All pending changes processed`);
  },
});

export type OfflineActions = ReturnType<typeof createOfflineActions>;