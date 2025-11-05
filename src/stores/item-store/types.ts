import { GridItemType, BacklogItemType, BacklogGroupType } from '@/types/match';

export interface ListSession {
  id: string;
  listId: string;
  listSize: number;
  gridItems: GridItemType[];
  backlogGroups: BacklogGroupType[];
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