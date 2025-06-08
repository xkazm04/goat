import { GridItemType, BacklogItemType, BacklogGroupType } from '@/app/types/match';

export interface ListSession {
  listId: string;
  listSize: number;
  gridItems: GridItemType[];
  backlogGroups: BacklogGroupType[];
  selectedBacklogItem: string | null;
  selectedGridItem: string | null;
  compareList: BacklogItemType[];
  lastModified: string;
  lastSynced?: string;
}

export interface SessionProgress {
  matched: number;
  total: number;
  percentage: number;
}

export interface SessionMetadata {
  listId: string;
  title?: string;
  category?: string;
  size: number;
  progress: SessionProgress;
  lastModified: string;
  hasUnsavedChanges: boolean;
}