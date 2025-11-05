// Backlog Groups and Items Types

export interface BacklogItem {
  id: string;
  name: string;
  title: string;
  description?: string;
  category: string;
  subcategory?: string;
  item_year?: number;
  item_year_to?: number;
  image_url?: string;
  created_at: string;
  updated_at?: string;
  tags?: string[];
  
  // UI state properties
  matched?: boolean;
  matchedWith?: string;
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
  created_at: string;
  updated_at?: string;
  items: BacklogItem[];
  
  // UI state properties
  isOpen?: boolean;
  isExpanded?: boolean;
}

export interface BacklogGroupCreate {
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  image_url?: string;
}

export interface BacklogItemCreate {
  name: string;
  title?: string;
  description?: string;
  category: string;
  subcategory?: string;
  item_year?: number;
  item_year_to?: number;
  image_url?: string;
  tags?: string[];
}

export interface BacklogGroupUpdate {
  name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  image_url?: string;
}

export interface BacklogItemUpdate {
  name?: string;
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  item_year?: number;
  item_year_to?: number;
  image_url?: string;
  tags?: string[];
}

export interface BacklogSearchParams {
  category?: string;
  subcategory?: string;
  search?: string;
  limit?: number;
  offset?: number;
}