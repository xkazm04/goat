import { BacklogGroup, BacklogItem } from "@/app/types/backlog-groups";

export interface LocalGroupState {
  id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  
  // Local state
  items: BacklogItem[];
  removedItemIds: Set<string>; // Track locally removed items
  addedItems: BacklogItem[]; // Track locally added items
  lastSyncedAt: string;
  isExpanded: boolean;
  isLoaded: boolean;
}

export interface LocalSessionData {
  listId: string;
  groups: Map<string, LocalGroupState>;
  lastFullSync: string;
  version: number;
}

export class LocalDataManager {
  private static readonly STORAGE_PREFIX = 'backlog_data_';
  private static readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get or create local session data for a list
   */
  static getSessionData(listId: string): LocalSessionData {
    const key = this.getStorageKey(listId);
    const stored = localStorage.getItem(key);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          groups: new Map(Object.entries(parsed.groups).map(([id, group]: [string, any]) => [
            id,
            {
              ...group,
              removedItemIds: new Set(group.removedItemIds || [])
            }
          ]))
        };
      } catch (error) {
        console.warn(`Failed to parse stored data for ${listId}:`, error);
      }
    }

    // Create new session
    return {
      listId,
      groups: new Map(),
      lastFullSync: new Date().toISOString(),
      version: 1
    };
  }

  /**
   * Save session data to localStorage
   */
  static saveSessionData(sessionData: LocalSessionData): void {
    const key = this.getStorageKey(sessionData.listId);
    
    const serializable = {
      ...sessionData,
      groups: Object.fromEntries(
        Array.from(sessionData.groups.entries()).map(([id, group]) => [
          id,
          {
            ...group,
            removedItemIds: Array.from(group.removedItemIds)
          }
        ])
      )
    };

    localStorage.setItem(key, JSON.stringify(serializable));
    console.log(`💾 Saved session data for ${sessionData.listId}`);
  }

  /**
   * Initialize groups from API data
   */
  static initializeFromApi(
    sessionData: LocalSessionData, 
    apiGroups: any[]
  ): LocalSessionData {
    const updatedGroups = new Map(sessionData.groups);

    apiGroups.forEach(apiGroup => {
      const existingGroup = updatedGroups.get(apiGroup.id);
      
      if (existingGroup) {
        // Update existing group metadata but keep local state
        updatedGroups.set(apiGroup.id, {
          ...existingGroup,
          name: apiGroup.name,
          description: apiGroup.description,
          image_url: apiGroup.image_url,
          updated_at: apiGroup.updated_at
        });
      } else {
        // Create new group
        updatedGroups.set(apiGroup.id, {
          id: apiGroup.id,
          name: apiGroup.name,
          description: apiGroup.description,
          category: apiGroup.category,
          subcategory: apiGroup.subcategory,
          image_url: apiGroup.image_url,
          created_at: apiGroup.created_at,
          updated_at: apiGroup.updated_at,
          items: [],
          removedItemIds: new Set(),
          addedItems: [],
          lastSyncedAt: new Date().toISOString(),
          isExpanded: false,
          isLoaded: false
        });
      }
    });

    const updated = {
      ...sessionData,
      groups: updatedGroups,
      lastFullSync: new Date().toISOString(),
      version: sessionData.version + 1
    };

    this.saveSessionData(updated);
    return updated;
  }

  /**
   * Load items for a specific group
   */
  static async loadGroupItems(
    sessionData: LocalSessionData,
    groupId: string,
    apiItems: BacklogItem[]
  ): Promise<LocalSessionData> {
    const group = sessionData.groups.get(groupId);
    if (!group) {
      console.warn(`Group ${groupId} not found`);
      return sessionData;
    }

    // Filter out locally removed items
    const filteredApiItems = apiItems.filter(item => 
      !group.removedItemIds.has(item.id)
    );

    // Combine API items with locally added items
    const allItems = [
      ...filteredApiItems,
      ...group.addedItems
    ];

    const updatedGroup = {
      ...group,
      items: allItems,
      isLoaded: true,
      lastSyncedAt: new Date().toISOString()
    };

    const updatedGroups = new Map(sessionData.groups);
    updatedGroups.set(groupId, updatedGroup);

    const updated = {
      ...sessionData,
      groups: updatedGroups,
      version: sessionData.version + 1
    };

    this.saveSessionData(updated);
    console.log(`✅ Loaded ${allItems.length} items for group ${group.name} (${filteredApiItems.length} from API, ${group.addedItems.length} local)`);
    
    return updated;
  }

  /**
   * Remove item locally (doesn't affect API)
   */
  static removeItemLocally(
    sessionData: LocalSessionData,
    groupId: string,
    itemId: string
  ): LocalSessionData {
    const group = sessionData.groups.get(groupId);
    if (!group) {
      console.warn(`Group ${groupId} not found`);
      return sessionData;
    }

    // Add to removed items set
    const updatedRemovedIds = new Set(group.removedItemIds);
    updatedRemovedIds.add(itemId);

    // Remove from current items array
    const updatedItems = group.items.filter(item => item.id !== itemId);

    // Remove from added items if it was locally added
    const updatedAddedItems = group.addedItems.filter(item => item.id !== itemId);

    const updatedGroup = {
      ...group,
      items: updatedItems,
      removedItemIds: updatedRemovedIds,
      addedItems: updatedAddedItems
    };

    const updatedGroups = new Map(sessionData.groups);
    updatedGroups.set(groupId, updatedGroup);

    const updated = {
      ...sessionData,
      groups: updatedGroups,
      version: sessionData.version + 1
    };

    this.saveSessionData(updated);
    console.log(`🗑️ Locally removed item ${itemId} from group ${group.name}`);
    
    return updated;
  }

  /**
   * Add item locally
   */
  static addItemLocally(
    sessionData: LocalSessionData,
    groupId: string,
    item: BacklogItem
  ): LocalSessionData {
    const group = sessionData.groups.get(groupId);
    if (!group) {
      console.warn(`Group ${groupId} not found`);
      return sessionData;
    }

    // Remove from removed items if it was previously removed
    const updatedRemovedIds = new Set(group.removedItemIds);
    updatedRemovedIds.delete(item.id);

    // Add to items and added items
    const updatedItems = [...group.items, item];
    const updatedAddedItems = [...group.addedItems, item];

    const updatedGroup = {
      ...group,
      items: updatedItems,
      removedItemIds: updatedRemovedIds,
      addedItems: updatedAddedItems
    };

    const updatedGroups = new Map(sessionData.groups);
    updatedGroups.set(groupId, updatedGroup);

    const updated = {
      ...sessionData,
      groups: updatedGroups,
      version: sessionData.version + 1
    };

    this.saveSessionData(updated);
    console.log(`➕ Locally added item ${item.name} to group ${group.name}`);
    
    return updated;
  }

  /**
   * Toggle group expansion
   */
  static toggleGroupExpansion(
    sessionData: LocalSessionData,
    groupId: string
  ): LocalSessionData {
    const group = sessionData.groups.get(groupId);
    if (!group) return sessionData;

    const updatedGroup = {
      ...group,
      isExpanded: !group.isExpanded
    };

    const updatedGroups = new Map(sessionData.groups);
    updatedGroups.set(groupId, updatedGroup);

    const updated = {
      ...sessionData,
      groups: updatedGroups,
      version: sessionData.version + 1
    };

    this.saveSessionData(updated);
    return updated;
  }

  /**
   * Get available items for a group (excluding removed ones)
   */
  static getAvailableItems(group: LocalGroupState): BacklogItem[] {
    return group.items.filter(item => !group.removedItemIds.has(item.id));
  }

  /**
   * Check if sync is needed
   */
  static needsSync(sessionData: LocalSessionData): boolean {
    const lastSync = new Date(sessionData.lastFullSync);
    const now = new Date();
    return (now.getTime() - lastSync.getTime()) > this.SYNC_INTERVAL;
  }

  /**
   * Clear all local data for a list
   */
  static clearSessionData(listId: string): void {
    const key = this.getStorageKey(listId);
    localStorage.removeItem(key);
    console.log(`🧹 Cleared session data for ${listId}`);
  }

  private static getStorageKey(listId: string): string {
    return `${this.STORAGE_PREFIX}${listId}`;
  }
}