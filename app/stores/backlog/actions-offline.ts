import { BacklogState } from './types';
import { StateCreator } from 'zustand';

export const createOfflineActions = (
  set: StateCreator<BacklogState>['set'],
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
      return; // Skip if offline or no changes
    }
    
    console.log(`🔄 BacklogStore: Processing ${state.pendingChanges.length} pending changes`);
    
    // Sort changes by timestamp (oldest first)
    const sortedChanges = [...state.pendingChanges].sort((a, b) => a.timestamp - b.timestamp);
    
    // Process in sequence
    for (const change of sortedChanges) {
      try {
        switch (change.type) {
          case 'add':
            if (change.item) {
              // API call to add item
              console.log(`🔄 BacklogStore: Adding item ${change.item.id} to group ${change.groupId}`);
              // await itemGroupsApi.addItemToGroup(change.groupId, change.item);
            }
            break;
            
          case 'remove':
            if (change.itemId) {
              // API call to remove item
              console.log(`🔄 BacklogStore: Removing item ${change.itemId} from group ${change.groupId}`);
              // await itemGroupsApi.removeItemFromGroup(change.groupId, change.itemId);
            }
            break;
            
          case 'update':
            if (change.itemId && change.item) {
              // API call to update item
              console.log(`🔄 BacklogStore: Updating item ${change.itemId} in group ${change.groupId}`);
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
    
    console.log(`✅ BacklogStore: Completed processing pending changes`);
  },
});

export type OfflineActions = ReturnType<typeof createOfflineActions>;