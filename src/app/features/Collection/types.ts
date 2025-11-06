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
  metadata?: Record<string, any>;
}

export interface CollectionGroup {
  id: string;
  name: string;
  items: CollectionItem[];
  category?: string;
  subcategory?: string;
  count?: number;
}

export interface CollectionFilter {
  searchTerm: string;
  selectedGroupIds: Set<string>;
  selectedCategory?: string;
  sortBy?: 'name' | 'date' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

export interface CollectionStats {
  totalItems: number;
  selectedItems: number;
  visibleGroups: number;
  totalGroups: number;
}
