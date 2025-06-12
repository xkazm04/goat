export interface BacklogItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  item_year?: number;
  item_year_to?: number;
  image_url?: string;
  created_at: string;
  // Legacy fields for compatibility
  title?: string;
  tags?: string[];
}

export interface BacklogGroup {
  id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  image_url?: string;
  item_count: number;
  items: BacklogItem[];
  created_at: string;
  updated_at: string;
}

export interface BacklogGroupsState {
  groups: BacklogGroup[];
  isLoading: boolean;
  error: string | null;
  totalItems: number;
  lastUpdated: string | null;
}