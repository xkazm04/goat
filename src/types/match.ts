// Match System Types

export interface GridItemType {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  position: number;
  matched: boolean;
  matchedWith?: string; // ID of the backlog item it's matched with
  backlogItemId?: string;
  tags?: string[];
  isDragPlaceholder?: boolean;
}

export interface BacklogItemType {
  id: string;
  title: string;
  name?: string;
  description?: string;
  category: string;
  subcategory?: string;
  item_year?: number;
  item_year_to?: number;
  image_url?: string;
  created_at: string;
  updated_at?: string;
  tags?: string[];

  // Media URLs (for Music category)
  youtube_url?: string;
  youtube_id?: string;

  // UI state properties
  matched?: boolean;
  matchedWith?: string;
  used?: boolean;
}

export interface BacklogGroupType {
  id: string;
  name: string;
  title?: string; // Legacy support
  description?: string;
  category: string;
  subcategory?: string;
  image_url?: string;
  item_count: number;
  created_at: string;
  updated_at?: string;
  items: BacklogItemType[];
  
  // UI state properties
  isOpen?: boolean;
  isExpanded?: boolean;
}

export interface MatchSession {
  id: string;
  listId: string;
  listSize: number;
  gridItems: GridItemType[];
  backlogGroups: BacklogGroupType[];
  selectedBacklogItem: string | null;
  selectedGridItem: string | null;
  compareList: BacklogItemType[]; // Legacy field - kept for session compatibility, always empty
  createdAt: string;
  updatedAt: string;
  progress: {
    matched: number;
    total: number;
    percentage: number;
  };
}

export interface DragItem {
  id: string;
  type: 'backlog-item' | 'grid-item';
  data: BacklogItemType | GridItemType;
  groupId?: string;
}

export interface DropResult {
  success: boolean;
  fromPosition?: number;
  toPosition?: number;
  item?: BacklogItemType | GridItemType;
  action: 'assign' | 'move' | 'remove' | 'swap';
}

export interface ComparisonItem {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  tags?: string[];
  category: string;
  subcategory?: string;
  item_year?: number;
  selected?: boolean;
}

export interface MatchAnalytics {
  sessionId: string;
  listId: string;
  totalMatches: number;
  averageMatchTime: number;
  completionPercentage: number;
  mostUsedCategories: string[];
  sessionDuration: number;
  createdAt: string;
}