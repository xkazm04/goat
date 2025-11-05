import { BacklogGroup, BacklogItem } from '@/types/backlog-groups';

export interface BacklogCache {
  [key: string]: { // key = category-subcategory
    groups: BacklogGroup[];
    loadedAt: number;
    loadedGroupIds: Set<string>; // Set of groupIds that have items loaded
    lastUpdated: number;
  };
}

// Add serialized version for storage
export interface SerializedBacklogCache {
  [key: string]: {
    groups: BacklogGroup[];
    loadedAt: number;
    loadedGroupIds: string[]; // Array representation for storage
    lastUpdated: number;
  };
}

export interface PendingChange {
  type: 'add' | 'remove' | 'update';
  groupId: string;
  itemId?: string;
  item?: BacklogItem;
  timestamp: number;
}

export interface BacklogState {
  // Core data
  groups: BacklogGroup[];
  selectedGroupId: string | null;
  selectedItemId: string | null;
  activeItemId: string | null;
  searchTerm: string;

  // UI State
  isLoading: boolean;
  loadingGroupIds: Set<string>;
  error: Error | null;

  // Offline mode
  isOfflineMode: boolean;
  pendingChanges: PendingChange[];

  loadingProgress: {
    totalGroups: number;
    loadedGroups: number;
    isLoading: boolean;
    percentage: number;
  };

  // Cache system - stores by category
  cache: BacklogCache;
  lastSyncTimestamp: number;

  // Actions - Data fetching
  initializeGroups: (category: string, subcategory?: string, forceRefresh?: boolean) => Promise<void>;
  loadGroupItems: (groupId: string, forceRefresh?: boolean) => Promise<void>;
  loadAllGroupItems: (categoryFilter?: string) => Promise<void>;
  syncWithBackend: () => Promise<void>;

  // Actions - Selection
  selectGroup: (groupId: string | null) => void;
  selectItem: (itemId: string | null) => void;
  setActiveItem: (itemId: string | null) => void;

  // Actions - Search & Filter
  setSearchTerm: (term: string) => void;
  searchGroups: (term: string) => BacklogGroup[];
  filterGroupsByCategory: (category: string, subcategory?: string) => BacklogGroup[];

  // Actions - Item management
  addItemToGroup: (groupId: string, item: BacklogItem) => void;
  removeItemFromGroup: (groupId: string, itemId: string) => void;
  updateItemInGroup: (groupId: string, itemId: string, updates: Partial<BacklogItem>) => void;
  markItemAsUsed: (itemId: string, isUsed: boolean) => void;
  updateGroupItems: (groupId: string, items: BacklogItem[]) => void;
  toggleGroupSelection: (groupId: string) => void;

  // Offline mode management
  setOfflineMode: (isOffline: boolean) => void;
  processPendingChanges: () => Promise<void>;

  // Utilities
  clearCache: (category?: string) => void;
  clearAllData: () => void;
  getGroupItems: (groupId: string) => BacklogItem[];
  getItemById: (itemId: string) => BacklogItem | null;
  getMatchedItemsCount: () => number;
  isItemUsed: (itemId: string) => boolean;

  // Internal utilities
  startFastProgressiveLoading: (groups: any[]) => Promise<void>;
  updateLoadingProgress: () => void;
  getStats: () => {
    totalGroups: number;
    groupsWithItems: number;
    totalItems: number;
    cacheKeys: string[];
    isLoading: boolean;
    hasError: boolean;
  };
}