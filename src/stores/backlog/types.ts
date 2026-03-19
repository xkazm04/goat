import { BacklogGroup, BacklogItem } from '@/types/backlog-groups';

import { ItemIndex } from './item-index';

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

export type LoadingErrorType = 'network' | 'timeout' | 'auth' | 'server' | 'data' | 'unknown';

export interface LoadingError {
  groupId: string;
  groupName: string;
  type: LoadingErrorType;
  message: string;
  timestamp: number;
}

export interface PendingChange {
  type: 'add' | 'remove' | 'update';
  groupId: string;
  itemId?: string;
  item?: BacklogItem;
  timestamp: number;
  /** Number of times this change has been attempted */
  attempts?: number;
  /** Last error message if processing failed */
  lastError?: string;
}

export interface FailedChange {
  change: PendingChange;
  error: string;
  failedAt: number;
  attempts: number;
}

export interface SyncQueueDiagnostics {
  /** Total number of changes currently queued */
  totalQueued: number;
  /** Changes that permanently failed after max retries */
  failedChanges: FailedChange[];
  /** Timestamp of the last successful sync (0 if never synced) */
  lastSuccessfulSync: number;
  /** Whether a sync is currently in progress */
  isSyncing: boolean;
  /** Estimated risk level based on queue age and size */
  dataLossRisk: 'none' | 'low' | 'medium' | 'high';
}

export interface BacklogState {
  // Core data
  groups: BacklogGroup[];
  /** Runtime-only index: itemId → index in groups[]. Not persisted. */
  _itemIndex: ItemIndex;
  /** Runtime-only counter: number of groups with at least one item loaded. O(1) reads. */
  _loadedGroupsCount: number;
  selectedGroupId: string | null;
  /** @deprecated Read from useSelectionCursor instead. Kept for storage compat. */
  selectedItemId: string | null;
  /** @deprecated Unused — hover/preview state is local to components. */
  activeItemId: string | null;
  searchTerm: string;

  // UI State
  isLoading: boolean;
  loadingGroupIds: Set<string>;
  error: Error | null;
  /** Incremented on each initializeGroups call; stale progressive loaders check this to abort. */
  _loadingGeneration: number;

  // Offline mode
  isOfflineMode: boolean;
  pendingChanges: PendingChange[];
  syncDiagnostics: SyncQueueDiagnostics;

  loadingProgress: {
    totalGroups: number;
    loadedGroups: number;
    isLoading: boolean;
    percentage: number;
  };

  /** Structured errors from progressive group loading, classified by type */
  loadingErrors: LoadingError[];

  /** Enrichment source attribution — tracks which data sources are active during loading */
  enrichmentSources: {
    active: boolean;
    sources: Array<{
      id: string;
      label: string;
      status: 'pending' | 'active' | 'done';
    }>;
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
  clearCache: (category?: string) => Promise<void>;
  clearAllData: () => void;
  getGroupItems: (groupId: string) => BacklogItem[];
  getItemById: (itemId: string) => BacklogItem | null;
  getMatchedItemsCount: () => number;
  isItemUsed: (itemId: string) => boolean;
  // Internal utilities
  startFastProgressiveLoading: (groups: any[], generation?: number) => Promise<void>;
  updateLoadingProgress: () => void;
  clearLoadingErrors: () => void;
  retryFailedGroups: () => Promise<void>;
  getStats: () => {
    totalGroups: number;
    groupsWithItems: number;
    totalItems: number;
    cacheKeys: string[];
    isLoading: boolean;
    hasError: boolean;
  };
}