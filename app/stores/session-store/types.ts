import { BacklogGroup, BacklogItem } from '@/app/types/backlog-groups';
import { BacklogGroupType, BacklogItemType, GridItemType } from '@/app/types/match';

// Enhanced ListSession to support both old and new types
export interface ListSession {
  id: string;
  listId: string;
  listSize: number;
  gridItems: GridItemType[];
  backlogGroups: BacklogGroupType[]; // Legacy format for persistence
  selectedBacklogItem: string | null;
  selectedGridItem: string | null;
  compareList: BacklogItemType[];
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

export interface SessionProgress {
  matchedCount: number;
  totalSize: number;
  percentage: number;
  isComplete: boolean;
}

export interface ComparisonState {
  isOpen: boolean;
  items: BacklogItemType[];
  selectedForComparison: string[];
  comparisonMode: 'side-by-side' | 'grid' | 'list';
}

// Main session store state interface
export interface SessionStoreState {
  // Multi-list sessions
  listSessions: Record<string, ListSession>;
  activeSessionId: string | null;
  
  // Current session state - Enhanced to support new types
  backlogGroups: BacklogGroup[]; // Runtime format (from API)
  selectedBacklogItem: string | null;
  compareList: BacklogItemType[]; // Legacy support
  
  // Actions - Session Management
  createSession: (listId: string, size: number) => void;
  switchToSession: (listId: string) => void;
  saveCurrentSession: () => void;
  loadSession: (listId: string) => void;
  deleteSession: (listId: string) => void;
  syncWithList: (listId: string, category?: string) => void;
  
  // Actions - Enhanced Backlog Management
  setBacklogGroups: (groups: BacklogGroup[] | ((prev: BacklogGroup[]) => BacklogGroup[])) => void;
  toggleBacklogGroup: (groupId: string) => void;
  addItemToGroup: (groupId: string, item: BacklogItem) => void;
  removeItemFromGroup: (groupId: string, itemId: string) => void;
  loadGroupItems: (groupId: string) => Promise<void>;
  getGroupItems: (groupId: string) => BacklogItem[];
  
  // Actions - Selection
  setSelectedBacklogItem: (id: string | null) => void;
  
  // Actions - Compare List (Legacy)
  toggleCompareItem: (item: BacklogItemType) => void;
  clearCompareList: () => void;
  
  // Utilities
  getAvailableBacklogItems: () => BacklogItem[];
  getSessionProgress: (listId?: string) => SessionProgress;
  getAllSessions: () => ListSession[];
  hasUnsavedChanges: (listId?: string) => boolean;
  getSessionMetadata: (listId?: string) => any;
  
  // Integration hooks for other stores
  updateSessionGridItems: (gridItems: GridItemType[]) => void;
  getActiveSession: () => ListSession | null;
  
  // Reset and sync
  resetStore: () => void;
  syncWithBackend: (listId: string) => Promise<void>;
}

// Helper types for conversion between formats
export interface BacklogGroupConverter {
  toStorageFormat: (group: BacklogGroup) => BacklogGroupType;
  fromStorageFormat: (group: BacklogGroupType) => BacklogGroup;
  toStorageFormatArray: (groups: BacklogGroup[]) => BacklogGroupType[];
  fromStorageFormatArray: (groups: BacklogGroupType[]) => BacklogGroup[];
}