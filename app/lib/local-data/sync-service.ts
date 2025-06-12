import { LocalDataManager } from './local-data-manager';
import { itemGroupsApi } from '@/app/lib/api/item-groups';
import { BacklogItem } from '@/app/types/backlog-groups';

export class SyncService {
  private static readonly SYNC_DEBOUNCE = 1000; // 1 second
  private static syncTimeout: NodeJS.Timeout | null = null;

  /**
   * Debounced sync to avoid too frequent API calls
   */
  static scheduledSync(listId: string): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = setTimeout(() => {
      this.performSync(listId);
    }, this.SYNC_DEBOUNCE);
  }

  /**
   * Perform actual sync with API
   */
  private static async performSync(listId: string): Promise<void> {
    try {
      console.log(`🔄 Starting sync for list ${listId}`);
      
      const sessionData = LocalDataManager.getSessionData(listId);
      
      if (!LocalDataManager.needsSync(sessionData)) {
        console.log('⏭️ Sync not needed');
        return;
      }

      // Check each group for new items
      for (const [groupId, group] of sessionData.groups) {
        try {
          // Only sync groups that have been loaded before
          if (!group.isLoaded) continue;

          console.log(`🔍 Checking group ${group.name} for updates...`);
          
          const groupWithItems = await itemGroupsApi.getGroup(groupId, true);
          
          // Check for new items (items not in local data)
          const localItemIds = new Set(group.items.map(item => item.id));
          const newItems = groupWithItems.items.filter(item => 
            !localItemIds.has(item.id) && !group.removedItemIds.has(item.id)
          );

          if (newItems.length > 0) {
            console.log(`➕ Found ${newItems.length} new items in ${group.name}`);
            
            // Add new items to local data
            const updatedSessionData = await LocalDataManager.loadGroupItems(
              sessionData,
              groupId,
              [...group.items, ...newItems]
            );

            // Notify user about new items (optional)
            this.notifyNewItems(group.name, newItems);
          }
        } catch (error) {
          console.warn(`Failed to sync group ${groupId}:`, error);
        }
      }

      console.log('✅ Sync completed');
      
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  /**
   * Check for conflicts between local and remote data
   */
  static async checkForConflicts(listId: string): Promise<string[]> {
    const conflicts: string[] = [];
    
    try {
      const sessionData = LocalDataManager.getSessionData(listId);
      
      for (const [groupId, group] of sessionData.groups) {
        if (!group.isLoaded) continue;

        const groupWithItems = await itemGroupsApi.getGroup(groupId, true);
        
        // Check if any locally removed items still exist in API
        const apiItemIds = new Set(groupWithItems.items.map(item => item.id));
        
        for (const removedId of group.removedItemIds) {
          if (apiItemIds.has(removedId)) {
            conflicts.push(`Item ${removedId} was removed locally but still exists in ${group.name}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check conflicts:', error);
    }

    return conflicts;
  }

  /**
   * Resolve conflicts by user choice
   */
  static async resolveConflicts(
    listId: string, 
    resolution: 'keep-local' | 'use-remote'
  ): Promise<void> {
    if (resolution === 'use-remote') {
      // Clear local data and re-sync from API
      LocalDataManager.clearSessionData(listId);
      await this.performSync(listId);
    }
    // If 'keep-local', do nothing - local changes are preserved
  }

  /**
   * Notify about new items (could integrate with toast notifications)
   */
  private static notifyNewItems(groupName: string, newItems: BacklogItem[]): void {
    console.log(`🔔 New items available in ${groupName}:`, newItems.map(item => item.name));
    
    // Could dispatch a custom event for UI notifications
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backlog-new-items', {
        detail: { groupName, items: newItems }
      }));
    }
  }

  /**
   * Export local changes for debugging
   */
  static exportLocalChanges(listId: string): any {
    const sessionData = LocalDataManager.getSessionData(listId);
    
    const changes = {
      listId,
      lastSync: sessionData.lastFullSync,
      groups: {}
    };

    for (const [groupId, group] of sessionData.groups) {
      changes.groups[groupId] = {
        name: group.name,
        removedItems: Array.from(group.removedItemIds),
        addedItems: group.addedItems.map(item => ({ id: item.id, name: item.name })),
        itemCount: group.items.length
      };
    }

    return changes;
  }
}