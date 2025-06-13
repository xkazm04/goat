export interface BacklogItem {
  id: string;
  name: string;
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  item_year?: number;
  item_year_to?: number;
  image_url?: string | null;
  created_at?: string;
  tags?: string[];
  used?: boolean;
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