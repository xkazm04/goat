/**
 * Collection Feature Types
 */

export interface CollectionItem {
  id: string;
  title: string;
  image_url?: string | null;
  description?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  ranking?: number; // Numeric ranking field (0-5 stars)
  metadata?: Record<string, any>;
  used?: boolean; // Track if item is placed in the grid
}

export interface CollectionGroup {
  id: string;
  name: string;
  items?: CollectionItem[]; // Optional - may not be included in API response
  item_count?: number; // From API response
  category?: string;
  subcategory?: string;
  description?: string | null;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
  count?: number; // Computed count of available items
}

export interface CollectionFilter {
  searchTerm: string;
  selectedGroupIds: Set<string>;
  selectedCategory?: string;
  sortBy?: 'name' | 'date' | 'popularity' | 'ranking';
  sortOrder?: 'asc' | 'desc';
}

export interface CollectionStats {
  totalItems: number;
  selectedItems: number;
  visibleGroups: number;
  totalGroups: number;
  averageRanking?: number; // Average ranking across all items
  rankedItems?: number; // Number of items with a ranking
  curatorLevel?: number; // Current curator milestone level (1-5)
  itemsToNextLevel?: number; // Items needed to reach next milestone
  hiddenInGridCount?: number; // Number of items hidden because they are in the MatchGrid
}

export interface CollectionPaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CollectionMutationHelpers {
  addItem: (item: Partial<CollectionItem>) => Promise<CollectionItem>;
  updateItem: (id: string, updates: Partial<CollectionItem>) => Promise<CollectionItem>;
  deleteItem: (id: string) => Promise<void>;
}

export interface CollectionOrderChangeCallback {
  (items: CollectionItem[]): void;
}
